import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { socketConfig } from '../config/kafka.config.js';
import { config } from '../config/index.js';
import CallLog from '../models/CallLog.js';
import Message from '../models/Message.js';
import ChatRoom from '../models/ChatRoom.js';
import mongoose from 'mongoose';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: string;
}

interface OnlineUser {
    userId: string;
    socketId: string;
    role: string;
    connectedAt: Date;
}

class SocketService {
    private io: Server | null = null;
    private onlineUsers: Map<string, OnlineUser> = new Map();
    private activeCalls: Map<string, { logId: string; startTime: Date; accepted: boolean; roomId: string; callType: string }> = new Map();

    // Initialize Socket.IO server
    initialize(httpServer: HttpServer): Server {
        this.io = new Server(httpServer, socketConfig);

        // Authentication middleware
        this.io.use(async (socket: AuthenticatedSocket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

                console.log('🔐 Socket authentication attempt from:', socket.handshake.address);

                if (!token) {
                    console.error('❌ No token provided in socket handshake');
                    return next(new Error('Authentication required'));
                }

                try {
                    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string; role: string };
                    socket.userId = decoded.userId;
                    socket.userRole = decoded.role;
                    console.log(`✅ Socket authenticated for user: ${decoded.userId} (${decoded.role})`);
                    next();
                } catch (jwtError) {
                    console.error('❌ JWT Verification failed:', jwtError instanceof Error ? jwtError.message : jwtError);
                    return next(new Error('Invalid token'));
                }
            } catch (error) {
                console.error('❌ Socket auth middleware error:', error instanceof Error ? error.message : error);
                next(new Error('Internal server error'));
            }
        });

        // Connection handler
        this.io.on('connection', (socket: AuthenticatedSocket) => {
            console.log(`🔌 User connected: ${socket.userId} (${socket.id})`);

            // Track online user
            if (socket.userId) {
                this.onlineUsers.set(socket.userId, {
                    userId: socket.userId,
                    socketId: socket.id,
                    role: socket.userRole || 'USER',
                    connectedAt: new Date(),
                });

                // Join personal room for direct messages
                socket.join(`user:${socket.userId}`);

                // Send list of currently online users to the new connection
                socket.emit('users:online', { userIds: this.getOnlineUsers() });

                // Broadcast online status to others
                socket.broadcast.emit('user:online', { userId: socket.userId });
            }

            // Handle joining chat rooms
            socket.on('chat:join', (roomId: string) => {
                socket.join(`chat:${roomId}`);
                console.log(`📥 User ${socket.userId} joined room: ${roomId}`);
            });

            // Handle leaving chat rooms
            socket.on('chat:leave', (roomId: string) => {
                socket.leave(`chat:${roomId}`);
                console.log(`📤 User ${socket.userId} left room: ${roomId}`);
            });

            // Handle typing indicator
            socket.on('chat:typing', ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
                socket.to(`chat:${roomId}`).emit('chat:typing', {
                    userId: socket.userId,
                    isTyping,
                });
            });

            // Handle read receipts
            socket.on('message:read', ({ messageId, roomId }: { messageId: string; roomId: string }) => {
                socket.to(`chat:${roomId}`).emit('message:read', {
                    readBy: socket.userId,
                    messageId,
                    readAt: new Date(),
                });
            });

            // Handle delivery receipts
            socket.on('message:delivered', async ({ roomId }: { roomId: string }) => {
                try {
                    const { chatService } = await import('../modules/chat/chat.service.js');
                    if (socket.userId) {
                        await chatService.markMessagesAsDelivered(roomId, socket.userId);
                    }
                } catch (error) {
                    console.error('❌ Error marking messages as delivered:', error);
                }
            });

            // ============ Call Signaling ============

            // Initiate a call
            socket.on('call:initiate', async ({ toUserId, type, roomId, callerName }: { toUserId: string; type: 'audio' | 'video'; roomId: string; callerName?: string }) => {
                console.log(`📞 Call initiate: ${socket.userId} -> ${toUserId} (${type})`);

                try {
                    const log = await CallLog.create({
                        caller: socket.userId,
                        receiver: toUserId,
                        type,
                        roomId,
                        status: 'ongoing'
                    });

                    // Store call info to update later
                    const callId = [socket.userId, toUserId].sort().join(':');
                    this.activeCalls.set(callId, {
                        logId: (log._id as any).toString(),
                        startTime: new Date(),
                        accepted: false,
                        roomId,
                        callType: type
                    });

                    socket.to(`user:${toUserId}`).emit('call:incoming', {
                        callerId: socket.userId,
                        callerName: callerName || socket.userId,
                        type,
                        roomId
                    });
                } catch (error) {
                    console.error('❌ Error creating call log:', error);
                }
            });

            // Respond to a call (accept/reject/busy)
            socket.on('call:respond', async ({ toUserId, response }: { toUserId: string; response: 'accepted' | 'rejected' | 'busy' }) => {
                console.log(`📞 Call respond: ${socket.userId} -> ${toUserId} (${response})`);

                const callId = [socket.userId, toUserId].sort().join(':');
                const callInfo = this.activeCalls.get(callId);

                if (callInfo) {
                    if (response === 'accepted') {
                        callInfo.accepted = true;
                    } else {
                        try {
                            const status = response === 'rejected' ? 'rejected' : 'busy';
                            await CallLog.findByIdAndUpdate(callInfo.logId, {
                                status,
                                endTime: new Date(),
                                duration: 0
                            });

                            // Create system message for rejected/busy call
                            if (callInfo.roomId) {
                                const content = status === 'rejected' ? `Declined ${callInfo.callType} call` : `Missed ${callInfo.callType} call (Busy)`;
                                const message = await Message.create({
                                    roomId: callInfo.roomId,
                                    senderId: response === 'busy' ? toUserId : socket.userId, // The one who rejected/was busy
                                    content,
                                    type: 'SYSTEM',
                                    metadata: { callLogId: callInfo.logId, callStatus: status, callType: callInfo.callType, duration: 0 }
                                });

                                await ChatRoom.findByIdAndUpdate(callInfo.roomId, {
                                    lastMessage: message._id,
                                    lastMessageAt: new Date()
                                });

                                this.io?.to(`chat:${callInfo.roomId}`).emit('message:new', {
                                    message,
                                    roomId: callInfo.roomId
                                });
                            }

                            this.activeCalls.delete(callId);
                        } catch (error) {
                            console.error('❌ Error updating call log:', error);
                        }
                    }
                }

                socket.to(`user:${toUserId}`).emit('call:response', {
                    fromUserId: socket.userId,
                    response
                });
            });

            // WebRTC Signaling (SDP Offer/Answer)
            socket.on('call:signal', ({ toUserId, signal }: { toUserId: string; signal: any }) => {
                socket.to(`user:${toUserId}`).emit('call:signal', {
                    fromUserId: socket.userId,
                    signal
                });
            });

            // WebRTC ICE Candidates
            socket.on('call:candidate', ({ toUserId, candidate }: { toUserId: string; candidate: any }) => {
                socket.to(`user:${toUserId}`).emit('call:candidate', {
                    fromUserId: socket.userId,
                    candidate
                });
            });

            // End a call
            socket.on('call:end', async ({ toUserId }: { toUserId: string }) => {
                console.log(`📞 Call end: ${socket.userId} -> ${toUserId}`);

                const callId = [socket.userId, toUserId].sort().join(':');
                const callInfo = this.activeCalls.get(callId);

                if (callInfo) {
                    try {
                        const endTime = new Date();
                        const dur = Math.floor((endTime.getTime() - callInfo.startTime.getTime()) / 1000);
                        const status = callInfo.accepted ? 'completed' : 'missed';

                        await CallLog.findByIdAndUpdate(callInfo.logId, {
                            status,
                            endTime,
                            duration: callInfo.accepted ? dur : 0
                        });

                        // Create system message
                        if (callInfo.roomId) {
                            const formatDur = (s: number) => {
                                const m = Math.floor(s / 60);
                                const rs = s % 60;
                                return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
                            };

                            const content = status === 'completed'
                                ? `${callInfo.callType.charAt(0).toUpperCase() + callInfo.callType.slice(1)} call ended • ${formatDur(dur)}`
                                : `Missed ${callInfo.callType} call`;

                            const message = await Message.create({
                                roomId: callInfo.roomId,
                                senderId: socket.userId, // The one who ended or missed
                                content,
                                type: 'SYSTEM',
                                metadata: { callLogId: callInfo.logId, callStatus: status, callType: callInfo.callType, duration: dur }
                            });

                            await ChatRoom.findByIdAndUpdate(callInfo.roomId, {
                                lastMessage: message._id,
                                lastMessageAt: new Date()
                            });

                            this.io?.to(`chat:${callInfo.roomId}`).emit('message:new', {
                                message,
                                roomId: callInfo.roomId
                            });
                        }

                        this.activeCalls.delete(callId);
                    } catch (error) {
                        console.error('❌ Error finishing call log:', error);
                    }
                }

                socket.to(`user:${toUserId}`).emit('call:end', {
                    fromUserId: socket.userId
                });
            });

            // Handle disconnect
            socket.on('disconnect', (reason) => {
                console.log(`🔌 User disconnected: ${socket.userId} (${reason})`);

                if (socket.userId) {
                    this.onlineUsers.delete(socket.userId);
                    this.io?.emit('user:offline', { userId: socket.userId });
                }
            });
        });

        console.log('✅ Socket.IO initialized');
        return this.io;
    }

    // Send notification to specific user
    sendToUser(userId: string, event: string, data: any): void {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }

    // Send to multiple users
    sendToUsers(userIds: string[], event: string, data: any): void {
        if (this.io) {
            userIds.forEach(userId => {
                this.io?.to(`user:${userId}`).emit(event, data);
            });
        }
    }

    // Send to a chat room
    sendToRoom(roomId: string, event: string, data: any): void {
        if (this.io) {
            this.io.to(`chat:${roomId}`).emit(event, data);
        }
    }

    // Broadcast to all connected users
    broadcast(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    // Broadcast to admins only
    broadcastToAdmins(event: string, data: any): void {
        if (this.io) {
            this.onlineUsers.forEach((user, userId) => {
                if (user.role === 'ADMIN' || user.role === 'MANAGER') {
                    this.io?.to(`user:${userId}`).emit(event, data);
                }
            });
        }
    }

    // Get online users count
    getOnlineUsersCount(): number {
        return this.onlineUsers.size;
    }

    // Get online users list
    getOnlineUsers(): string[] {
        return Array.from(this.onlineUsers.keys());
    }

    // Check if user is online
    isUserOnline(userId: string): boolean {
        return this.onlineUsers.has(userId);
    }

    // Get Socket.IO instance
    getIO(): Server | null {
        return this.io;
    }
}

// Singleton instance
export const socketService = new SocketService();
