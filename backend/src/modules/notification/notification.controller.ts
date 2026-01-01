import { Request, Response } from 'express';
import { notificationService } from './notification.service.js';

interface AuthRequest extends Request {
    userId?: string;
    userRole?: string;
}

// Get user notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const unreadOnly = req.query.unreadOnly === 'true';

        const result = await notificationService.getUserNotifications(userId, page, limit, unreadOnly);

        return res.json({
            success: true,
            data: result.notifications,
            pagination: result.pagination,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch notifications'
        });
    }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const count = await notificationService.getUnreadCount(userId);

        return res.json({
            success: true,
            data: { count },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch unread count'
        });
    }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const notification = await notificationService.markAsRead(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        return res.json({
            success: true,
            data: notification,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark notification as read'
        });
    }
};

// Mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const count = await notificationService.markAllAsRead(userId);

        return res.json({
            success: true,
            message: `${count} notifications marked as read`,
            data: { count },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark notifications as read'
        });
    }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const deleted = await notificationService.delete(id, userId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        return res.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete notification'
        });
    }
};

// Delete all notifications
export const deleteAllNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const count = await notificationService.deleteAll(userId);

        return res.json({
            success: true,
            message: `${count} notifications deleted`,
            data: { count },
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete notifications'
        });
    }
};
