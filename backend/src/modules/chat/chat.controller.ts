import { Request, Response } from 'express';
import { chatService } from './chat.service.js';

interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

// ============ ROOM ENDPOINTS ============

// Get all user's chat rooms
export const getRooms = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const rooms = await chatService.getUserRooms(userId);

        res.json({
            success: true,
            data: rooms,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch rooms'
        });
    }
};

// Get or create direct chat
export const getOrCreateDirectChat = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { participantId } = req.body;

        if (!participantId) {
            return res.status(400).json({
                success: false,
                message: 'Participant ID required'
            });
        }

        if (participantId === userId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create chat with yourself'
            });
        }

        const room = await chatService.getOrCreateDirectRoom(userId, participantId);

        res.json({
            success: true,
            data: room,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create direct chat'
        });
    }
};

// Create group chat
export const createGroupChat = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { name, participantIds, description } = req.body;

        if (!name || !participantIds || participantIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name and participants required'
            });
        }

        const room = await chatService.createGroupRoom(userId, name, participantIds, description);

        res.status(201).json({
            success: true,
            data: room,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create group'
        });
    }
};

// Get room details
export const getRoom = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId } = req.params;

        const room = await chatService.getRoomById(roomId, userId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            data: room,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch room'
        });
    }
};

// Add participants to group
export const addParticipants = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId } = req.params;
        const { participantIds } = req.body;

        if (!participantIds || participantIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Participant IDs required'
            });
        }

        const room = await chatService.addParticipants(roomId, userId, participantIds);

        if (!room) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to add participants'
            });
        }

        res.json({
            success: true,
            data: room,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to add participants'
        });
    }
};

// Remove participant from group
export const removeParticipant = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId, participantId } = req.params;

        const success = await chatService.removeParticipant(roomId, userId, participantId);

        if (!success) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to remove participant'
            });
        }

        res.json({
            success: true,
            message: 'Participant removed',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to remove participant'
        });
    }
};

// Leave group
export const leaveGroup = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId } = req.params;

        const success = await chatService.leaveGroup(roomId, userId);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Room not found or not a member'
            });
        }

        res.json({
            success: true,
            message: 'Left the group',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to leave group'
        });
    }
};

// ============ MESSAGE ENDPOINTS ============

// Send message
export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId } = req.params;
        const { content, type, attachments, replyToId } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message content required'
            });
        }

        const message = await chatService.sendMessage(
            roomId,
            userId,
            content,
            type || 'TEXT',
            attachments,
            replyToId
        );

        res.status(201).json({
            success: true,
            data: message,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send message'
        });
    }
};

// Get room messages
export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await chatService.getRoomMessages(roomId, userId, page, limit);

        res.json({
            success: true,
            data: result.messages,
            pagination: result.pagination,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch messages'
        });
    }
};

// Edit message
export const editMessage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { messageId } = req.params;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'New content required'
            });
        }

        const message = await chatService.editMessage(messageId, userId, content);

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or not authorized'
            });
        }

        res.json({
            success: true,
            data: message,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to edit message'
        });
    }
};

// Delete message
export const deleteMessage = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { messageId } = req.params;

        const success = await chatService.deleteMessage(messageId, userId);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or not authorized'
            });
        }

        res.json({
            success: true,
            message: 'Message deleted',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete message'
        });
    }
};

// Mark messages as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { roomId } = req.params;

        await chatService.markMessagesAsRead(roomId, userId);

        res.json({
            success: true,
            message: 'Messages marked as read',
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark as read'
        });
    }
};

// Get unread counts
export const getUnreadCounts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const counts = await chatService.getUnreadCount(userId);

        res.json({
            success: true,
            data: counts,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch unread counts'
        });
    }
};

// Search messages
export const searchMessages = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const query = req.query.q as string;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }

        const messages = await chatService.searchMessages(userId, query, limit);

        res.json({
            success: true,
            data: messages,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Search failed'
        });
    }
};

// Get available users for new chat
export const getAvailableUsers = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const users = await chatService.getAvailableUsers(userId);

        res.json({
            success: true,
            data: users,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch users'
        });
    }
};
