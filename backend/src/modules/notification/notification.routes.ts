import { Router } from 'express';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
} from './notification.controller.js';

const router = Router();

// Get user notifications
router.get('/', getNotifications);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark all as read
router.patch('/mark-all-read', markAllAsRead);

// Mark single notification as read
router.patch('/:id/read', markAsRead);

// Delete all notifications
router.delete('/all', deleteAllNotifications);

// Delete single notification
router.delete('/:id', deleteNotification);

export default router;
