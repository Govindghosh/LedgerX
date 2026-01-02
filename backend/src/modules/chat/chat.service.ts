import mongoose from 'mongoose';
import ChatRoom, { IChatRoom, ChatRoomType } from '../../models/ChatRoom.js';
import Message, { IMessage, MessageType } from '../../models/Message.js';
import User from '../../models/User.js';
import { kafkaService } from '../../services/kafka.service.js';
import { socketService } from '../../services/socket.service.js';
import { kafkaConfig } from '../../config/kafka.config.js';
import { notificationService } from '../notification/notification.service.js';
import { generateSmartSuggestions } from '../../utils/ai.js';

class ChatService {
    // ============ ROOM MANAGEMENT ============

    // Create or get direct chat room
    async getOrCreateDirectRoom(userId1: string, userId2: string): Promise<IChatRoom> {
        // Check if room already exists
        const existingRoom = await ChatRoom.findOne({
            type: 'DIRECT',
            participants: {
                $all: [
                    new mongoose.Types.ObjectId(userId1),
                    new mongoose.Types.ObjectId(userId2)
                ],
                $size: 2,
            },
        }).populate('participants', 'name email');

        if (existingRoom) {
            return existingRoom;
        }

        // Create new direct room
        const room = await ChatRoom.create({
            type: 'DIRECT',
            participants: [
                new mongoose.Types.ObjectId(userId1),
                new mongoose.Types.ObjectId(userId2),
            ],
            createdBy: new mongoose.Types.ObjectId(userId1),
        });

        return ChatRoom.findById(room._id)
            .populate('participants', 'name email') as Promise<IChatRoom>;
    }

    // Create group chat room
    async createGroupRoom(
        creatorId: string,
        name: string,
        participantIds: string[],
        description?: string
    ): Promise<IChatRoom> {
        // Ensure creator is in participants
        const allParticipants = [...new Set([creatorId, ...participantIds])];

        const room = await ChatRoom.create({
            name,
            type: 'GROUP',
            participants: allParticipants.map(id => new mongoose.Types.ObjectId(id)),
            admins: [new mongoose.Types.ObjectId(creatorId)],
            createdBy: new mongoose.Types.ObjectId(creatorId),
            description,
        });

        // Notify participants
        const creator = await User.findById(creatorId).select('name');
        for (const participantId of participantIds) {
            if (participantId !== creatorId) {
                await notificationService.notifyGroupInvite(
                    participantId,
                    name,
                    creator?.name || 'Someone',
                    room._id.toString()
                );
            }
        }

        return ChatRoom.findById(room._id)
            .populate('participants', 'name email')
            .populate('admins', 'name email') as Promise<IChatRoom>;
    }

    // Get user's chat rooms
    async getUserRooms(userId: string): Promise<IChatRoom[]> {
        return ChatRoom.find({
            participants: new mongoose.Types.ObjectId(userId),
            isActive: true,
        })
            .populate('participants', 'name email')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 })
            .lean();
    }

    // Get room by ID
    async getRoomById(roomId: string, userId: string): Promise<IChatRoom | null> {
        const room = await ChatRoom.findOne({
            _id: roomId,
            participants: new mongoose.Types.ObjectId(userId),
        })
            .populate('participants', 'name email')
            .populate('admins', 'name email');

        return room;
    }

    // Add participants to group
    async addParticipants(roomId: string, adminId: string, participantIds: string[]): Promise<IChatRoom | null> {
        const room = await ChatRoom.findOne({
            _id: roomId,
            type: 'GROUP',
            admins: new mongoose.Types.ObjectId(adminId),
        });

        if (!room) {
            return null;
        }

        const newParticipants = participantIds.map(id => new mongoose.Types.ObjectId(id));
        room.participants.push(...newParticipants);
        await room.save();

        // Send system message
        await this.sendSystemMessage(roomId, `${participantIds.length} members added to the group`);

        return ChatRoom.findById(roomId)
            .populate('participants', 'name email')
            .populate('admins', 'name email');
    }

    // Remove participant from group
    async removeParticipant(roomId: string, adminId: string, participantId: string): Promise<boolean> {
        const room = await ChatRoom.findOne({
            _id: roomId,
            type: 'GROUP',
            admins: new mongoose.Types.ObjectId(adminId),
        });

        if (!room) {
            return false;
        }

        room.participants = room.participants.filter(
            p => p.toString() !== participantId
        );
        await room.save();

        // Send system message
        const user = await User.findById(participantId).select('name');
        await this.sendSystemMessage(roomId, `${user?.name || 'A member'} was removed from the group`);

        return true;
    }

    // Leave group
    async leaveGroup(roomId: string, userId: string): Promise<boolean> {
        const room = await ChatRoom.findOne({
            _id: roomId,
            type: 'GROUP',
            participants: new mongoose.Types.ObjectId(userId),
        });

        if (!room) {
            return false;
        }

        room.participants = room.participants.filter(
            p => p.toString() !== userId
        );
        room.admins = room.admins.filter(
            a => a.toString() !== userId
        );
        await room.save();

        const user = await User.findById(userId).select('name');
        await this.sendSystemMessage(roomId, `${user?.name || 'A member'} left the group`);

        return true;
    }

    // ============ MESSAGE MANAGEMENT ============

    // Send message
    async sendMessage(
        roomId: string,
        senderId: string,
        content: string,
        type: MessageType = 'TEXT',
        attachments?: any[],
        replyToId?: string
    ): Promise<IMessage> {
        console.log(`[ChatService] Sending message - roomId: ${roomId}, senderId: ${senderId}`);

        // Verify sender is participant
        const room = await ChatRoom.findOne({
            _id: roomId,
            participants: new mongoose.Types.ObjectId(senderId),
        });

        if (!room) {
            // Debug: Check if room exists at all
            const roomExists = await ChatRoom.findById(roomId);
            console.error(`[ChatService] Authorization failed:`, {
                roomId,
                senderId,
                roomExists: !!roomExists,
                participants: roomExists?.participants?.map(p => p.toString()),
            });
            throw new Error('Not authorized to send message to this room');
        }

        // Create message
        const message = await Message.create({
            roomId: new mongoose.Types.ObjectId(roomId),
            senderId: new mongoose.Types.ObjectId(senderId),
            content,
            type,
            attachments,
            replyTo: replyToId ? new mongoose.Types.ObjectId(replyToId) : undefined,
        });

        // Update room's last message
        room.lastMessage = message._id as mongoose.Types.ObjectId;
        room.lastMessageAt = new Date();
        await room.save();

        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
            .populate('senderId', 'name email')
            .populate('replyTo');

        // Send via Kafka
        const kafkaTopic = room.type === 'DIRECT'
            ? kafkaConfig.topics.CHAT_DIRECT
            : kafkaConfig.topics.CHAT_GROUP;

        await kafkaService.sendMessage(kafkaTopic, {
            messageId: message._id,
            roomId,
            senderId,
            content,
            type,
            createdAt: message.createdAt,
        }, roomId);

        // Send via Socket.IO to room
        socketService.sendToRoom(roomId, 'message:new', {
            message: populatedMessage,
            roomId,
        });

        // Notify offline participants
        const sender = await User.findById(senderId).select('name');
        for (const participantId of room.participants) {
            if (participantId.toString() !== senderId && !socketService.isUserOnline(participantId.toString())) {
                await notificationService.notifyNewMessage(
                    participantId.toString(),
                    sender?.name || 'Someone',
                    roomId,
                    content
                );
            }
        }

        return populatedMessage as IMessage;
    }

    // Send system message
    async sendSystemMessage(roomId: string, content: string): Promise<IMessage> {
        const message = await Message.create({
            roomId: new mongoose.Types.ObjectId(roomId),
            senderId: new mongoose.Types.ObjectId('000000000000000000000000'), // System ID
            content,
            type: 'SYSTEM',
        });

        socketService.sendToRoom(roomId, 'message:new', {
            message,
            roomId,
        });

        return message;
    }

    // Get room messages
    async getRoomMessages(
        roomId: string,
        userId: string,
        page: number = 1,
        limit: number = 50
    ) {
        // Verify user is participant
        const room = await ChatRoom.findOne({
            _id: roomId,
            participants: new mongoose.Types.ObjectId(userId),
        });

        if (!room) {
            throw new Error('Not authorized to view messages');
        }

        const [messages, total] = await Promise.all([
            Message.find({
                roomId: new mongoose.Types.ObjectId(roomId),
                isDeleted: false,
            })
                .populate('senderId', 'name email')
                .populate('replyTo')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Message.countDocuments({
                roomId: new mongoose.Types.ObjectId(roomId),
                isDeleted: false,
            }),
        ]);

        return {
            messages: messages.reverse(), // Return in chronological order
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    // Edit message
    async editMessage(messageId: string, userId: string, newContent: string): Promise<IMessage | null> {
        const message = await Message.findOneAndUpdate(
            {
                _id: messageId,
                senderId: new mongoose.Types.ObjectId(userId),
                isDeleted: false,
            },
            {
                content: newContent,
                isEdited: true,
                editedAt: new Date(),
            },
            { new: true }
        ).populate('senderId', 'name email');

        if (message) {
            socketService.sendToRoom(message.roomId.toString(), 'message:edited', {
                messageId,
                content: newContent,
                editedAt: message.editedAt,
            });
        }

        return message;
    }

    // Delete message
    async deleteMessage(messageId: string, userId: string): Promise<boolean> {
        const message = await Message.findOneAndUpdate(
            {
                _id: messageId,
                senderId: new mongoose.Types.ObjectId(userId),
            },
            {
                isDeleted: true,
                deletedAt: new Date(),
                content: 'This message was deleted',
            },
            { new: true }
        );

        if (message) {
            socketService.sendToRoom(message.roomId.toString(), 'message:deleted', {
                messageId,
            });
            return true;
        }

        return false;
    }

    // Mark messages as read
    async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
        await Message.updateMany(
            {
                roomId: new mongoose.Types.ObjectId(roomId),
                senderId: { $ne: new mongoose.Types.ObjectId(userId) },
                'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
            },
            {
                $push: {
                    readBy: {
                        userId: new mongoose.Types.ObjectId(userId),
                        readAt: new Date(),
                    },
                },
            }
        );

        socketService.sendToRoom(roomId, 'messages:read', {
            roomId,
            readBy: userId,
            readAt: new Date(),
        });
    }

    // Get unread message count for user
    async getUnreadCount(userId: string): Promise<{ roomId: string; count: number }[]> {
        const userRooms = await ChatRoom.find({
            participants: new mongoose.Types.ObjectId(userId),
            isActive: true,
        }).select('_id');

        const roomIds = userRooms.map(r => r._id);

        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    roomId: { $in: roomIds },
                    senderId: { $ne: new mongoose.Types.ObjectId(userId) },
                    'readBy.userId': { $ne: new mongoose.Types.ObjectId(userId) },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: '$roomId',
                    count: { $sum: 1 },
                },
            },
        ]);

        return unreadCounts.map(item => ({
            roomId: item._id.toString(),
            count: item.count,
        }));
    }

    // Search messages
    async searchMessages(userId: string, query: string, limit: number = 20) {
        const userRooms = await ChatRoom.find({
            participants: new mongoose.Types.ObjectId(userId),
        }).select('_id');

        const roomIds = userRooms.map(r => r._id);

        return Message.find({
            roomId: { $in: roomIds },
            content: { $regex: query, $options: 'i' },
            isDeleted: false,
        })
            .populate('senderId', 'name email')
            .populate('roomId', 'name type')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    // Pin message
    async pinMessage(roomId: string, messageId: string, userId: string): Promise<boolean> {
        const room = await ChatRoom.findOne({
            _id: roomId,
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!room) return false;

        const message = await Message.findById(messageId);
        if (!message || message.roomId.toString() !== roomId) return false;

        if (!room.pinnedMessages.includes(message._id as mongoose.Types.ObjectId)) {
            room.pinnedMessages.push(message._id as mongoose.Types.ObjectId);
            await room.save();

            socketService.sendToRoom(roomId, 'room:pin_update', {
                roomId,
                pinnedMessages: await Message.find({ _id: { $in: room.pinnedMessages } }).populate('senderId', 'name')
            });

            await this.sendSystemMessage(roomId, 'A message was pinned');
        }

        return true;
    }

    // Unpin message
    async unpinMessage(roomId: string, messageId: string, userId: string): Promise<boolean> {
        const room = await ChatRoom.findOne({
            _id: roomId,
            participants: new mongoose.Types.ObjectId(userId)
        });

        if (!room) return false;

        room.pinnedMessages = room.pinnedMessages.filter(id => id.toString() !== messageId);
        await room.save();

        socketService.sendToRoom(roomId, 'room:pin_update', {
            roomId,
            pinnedMessages: await Message.find({ _id: { $in: room.pinnedMessages } }).populate('senderId', 'name')
        });

        return true;
    }

    // Forward message
    async forwardMessage(userId: string, messageId: string, targetRoomIds: string[]): Promise<IMessage[]> {
        const originalMessage = await Message.findById(messageId);
        if (!originalMessage || originalMessage.isDeleted) {
            throw new Error('Message not found');
        }

        const forwardedMessages: IMessage[] = [];

        for (const roomId of targetRoomIds) {
            // Verify access to target room
            const room = await ChatRoom.findOne({
                _id: roomId,
                participants: new mongoose.Types.ObjectId(userId)
            });

            if (room) {
                const newMessage = await this.sendMessage(
                    roomId,
                    userId,
                    originalMessage.content,
                    originalMessage.type,
                    originalMessage.attachments,
                    undefined // Forwarding doesn't keep reply link by default
                );

                // Mark as forwarded
                await Message.findByIdAndUpdate(newMessage._id, { isForwarded: true });
                forwardedMessages.push(newMessage);
            }
        }

        return forwardedMessages;
    }

    // Get available users for starting new chat
    async getAvailableUsers(currentUserId: string) {
        return User.find({
            _id: { $ne: new mongoose.Types.ObjectId(currentUserId) },
            isActive: true,
        })
            .select('name email role')
            .sort({ name: 1 })
            .lean();
    }

    // Get AI smart suggestions for a room
    async getAISuggestions(roomId: string, userId: string): Promise<string[]> {
        // Verify user is participant
        const room = await ChatRoom.findOne({
            _id: roomId,
            participants: new mongoose.Types.ObjectId(userId),
        });

        if (!room) {
            throw new Error('Not authorized to get suggestions for this room');
        }

        // Get last 5 messages for context
        const lastMessages = await Message.find({
            roomId: new mongoose.Types.ObjectId(roomId),
            isDeleted: false,
        })
            .populate('senderId', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        if (lastMessages.length === 0) return [];

        const latestMsg = lastMessages[0];

        // If the latest message is from the current user, we don't necessarily need suggestions
        // unless we want to suggest "Thank you" etc. but usually it's for replying to others.
        // However, we'll let the AI decide or just provide them.

        const contextStr = lastMessages
            .slice(1)
            .reverse()
            .map(m => `${(m.senderId as any)?.name || 'User'}: ${m.content}`)
            .join('\n');

        const roomInfo = room.type === 'GROUP'
            ? `Group: ${room.name}, Description: ${room.description || 'N/A'}`
            : 'Direct Chat';

        const suggestions = await generateSmartSuggestions(contextStr, latestMsg.content, roomInfo);
        return suggestions;
    }
}

export const chatService = new ChatService();
