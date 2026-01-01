import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { socketConfig } from '../config/kafka.config.js';
import { config } from '../config/index.js';

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
                    messageId,
                    readBy: socket.userId,
                    readAt: new Date(),
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
