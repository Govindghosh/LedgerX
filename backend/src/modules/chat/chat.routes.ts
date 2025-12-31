import { Router } from 'express';
import {
    getRooms,
    getOrCreateDirectChat,
    createGroupChat,
    getRoom,
    addParticipants,
    removeParticipant,
    leaveGroup,
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage,
    markAsRead,
    getUnreadCounts,
    searchMessages,
    getAvailableUsers,
} from './chat.controller.js';

const router = Router();

// ============ ROOM ROUTES ============

// Get all user's rooms
router.get('/rooms', getRooms);

// Get available users for new chat
router.get('/users', getAvailableUsers);

// Get unread message counts
router.get('/unread', getUnreadCounts);

// Search messages
router.get('/search', searchMessages);

// Get or create direct chat
router.post('/direct', getOrCreateDirectChat);

// Create group chat
router.post('/group', createGroupChat);

// Get room details
router.get('/rooms/:roomId', getRoom);

// Add participants to group
router.post('/rooms/:roomId/participants', addParticipants);

// Remove participant from group
router.delete('/rooms/:roomId/participants/:participantId', removeParticipant);

// Leave group
router.post('/rooms/:roomId/leave', leaveGroup);

// ============ MESSAGE ROUTES ============

// Get room messages
router.get('/rooms/:roomId/messages', getMessages);

// Send message
router.post('/rooms/:roomId/messages', sendMessage);

// Mark room messages as read
router.patch('/rooms/:roomId/read', markAsRead);

// Edit message
router.patch('/messages/:messageId', editMessage);

// Delete message
router.delete('/messages/:messageId', deleteMessage);

export default router;
