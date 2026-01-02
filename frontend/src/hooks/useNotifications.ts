'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';
import { toast } from 'sonner';

interface Notification {
    _id: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    deleteAll: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
    const { socket, isConnected } = useSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const [notifRes, countRes] = await Promise.all([
                api.get('/notifications?limit=50'),
                api.get('/notifications/unread-count'),
            ]);
            setNotifications(notifRes.data.data || []);
            setUnreadCount(countRes.data.data?.count || 0);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    // Listen for real-time notifications
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewNotification = (notification: any) => {
            console.log('🔔 New notification received:', notification);

            // Show toast in front
            toast.info(notification.title, {
                description: notification.message,
                duration: 5000,
            });

            setNotifications(prev => {
                const id = notification._id || notification.id || `temp-${Date.now()}-${Math.random()}`;
                // Prevent duplicates
                if (prev.find(n => n._id === id)) return prev;

                return [{
                    _id: id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    isRead: false,
                    createdAt: notification.createdAt || new Date().toISOString(),
                }, ...prev];
            });

            setUnreadCount(prev => prev + 1);
        };

        socket.on('notification:new', handleNewNotification);

        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket, isConnected]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Mark single notification as read
    const markAsRead = useCallback(async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            console.error('Failed to mark as read:', err);
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        try {
            await api.patch('/notifications/mark-all-read');
            setNotifications(prev =>
                prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err: any) {
            console.error('Failed to mark all as read:', err);
        }
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (id: string) => {
        try {
            await api.delete(`/notifications/${id}`);
            const notif = notifications.find(n => n._id === id);
            setNotifications(prev => prev.filter(n => n._id !== id));
            if (notif && !notif.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err: any) {
            console.error('Failed to delete notification:', err);
        }
    }, [notifications]);

    // Delete all
    const deleteAll = useCallback(async () => {
        try {
            await api.delete('/notifications/all');
            setNotifications([]);
            setUnreadCount(0);
        } catch (err: any) {
            console.error('Failed to delete all:', err);
        }
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAll,
        refresh: fetchNotifications,
    };
}
