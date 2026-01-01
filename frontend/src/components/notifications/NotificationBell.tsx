'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Bell,
    Check,
    CheckCheck,
    Trash2,
    X,
    ArrowUpRight,
    ArrowDownLeft,
    UserCheck,
    UserX,
    Wallet,
    MessageSquare,
    Users,
    AlertTriangle,
    Megaphone
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { cn } from '../ui';

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'DEPOSIT_PENDING':
        case 'DEPOSIT_APPROVED':
        case 'DEPOSIT_REJECTED':
            return <ArrowDownLeft className="w-4 h-4" />;
        case 'WITHDRAWAL_PENDING':
        case 'WITHDRAWAL_APPROVED':
        case 'WITHDRAWAL_REJECTED':
            return <ArrowUpRight className="w-4 h-4" />;
        case 'BENEFICIARY_APPROVED':
            return <UserCheck className="w-4 h-4" />;
        case 'BENEFICIARY_REJECTED':
            return <UserX className="w-4 h-4" />;
        case 'WALLET_ADJUSTED':
            return <Wallet className="w-4 h-4" />;
        case 'NEW_MESSAGE':
            return <MessageSquare className="w-4 h-4" />;
        case 'GROUP_INVITE':
            return <Users className="w-4 h-4" />;
        case 'SYSTEM_ALERT':
            return <AlertTriangle className="w-4 h-4" />;
        case 'ANNOUNCEMENT':
            return <Megaphone className="w-4 h-4" />;
        default:
            return <Bell className="w-4 h-4" />;
    }
};

const getNotificationColor = (type: string): string => {
    if (type.includes('APPROVED')) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
    if (type.includes('REJECTED')) return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
    if (type.includes('PENDING')) return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
    if (type === 'NEW_MESSAGE' || type === 'GROUP_INVITE') return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
    if (type === 'SYSTEM_ALERT') return 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
    if (type === 'ANNOUNCEMENT') return 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
    return 'bg-gray-100 text-gray-600 dark:bg-slate-500/20 dark:text-slate-400';
};

const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
};

export const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 
                           dark:bg-slate-800/50 dark:hover:bg-slate-700/50 
                           border border-gray-200 dark:border-slate-700/50 transition-all duration-200
                           hover:border-gray-300 dark:hover:border-slate-600/50 group"
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-slate-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center
                                   bg-gradient-to-r from-red-500 to-pink-500 
                                   text-white text-xs font-bold rounded-full
                                   animate-pulse shadow-lg shadow-red-500/30">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-hidden
                               bg-white dark:bg-slate-900/95 backdrop-blur-xl 
                               border border-gray-200 dark:border-slate-700/50
                               rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/50 z-50
                               animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                                  px-4 py-3 border-b border-gray-200 dark:border-slate-700/50
                                  flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full
                                               bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 
                                         transition-colors flex items-center gap-1"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 
                                              rounded-full animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-slate-500">
                                <Bell className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-slate-800/50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={cn(
                                            "px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group",
                                            !notification.isRead && "bg-blue-50/50 dark:bg-blue-500/5"
                                        )}
                                        onClick={() => {
                                            if (!notification.isRead) {
                                                markAsRead(notification._id);
                                            }
                                        }}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className={cn(
                                                "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                                                getNotificationColor(notification.type)
                                            )}>
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                        {notification.title}
                                                    </p>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {!notification.isRead && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteNotification(notification._id);
                                                            }}
                                                            className="p-1 rounded opacity-0 group-hover:opacity-100
                                                                     hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-all"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
