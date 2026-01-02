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
        deleteAll,
    } = useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to clear all notifications?')) {
            await deleteAll();
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-xl transition-all duration-200 group",
                    isOpen
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 border-blue-400"
                        : "bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700/50 hover:border-gray-300 dark:hover:border-slate-600/50"
                )}
            >
                <Bell className={cn("w-5 h-5 transition-transform", isOpen && "scale-110")} />

                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <span className={cn(
                        "absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full border-2",
                        isOpen
                            ? "bg-white text-blue-500 border-blue-500"
                            : "bg-gradient-to-r from-red-500 to-pink-500 text-white border-white dark:border-slate-900 shadow-lg shadow-red-500/30 animate-pulse"
                    )}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown container */}
            {isOpen && (
                <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 w-[calc(100vw-32px)] sm:w-96 max-h-[80vh] flex flex-col
                               bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl 
                               border border-gray-200 dark:border-slate-700/50
                               rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100]
                               animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200 origin-top-right">

                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800/50 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 rounded-t-2xl flex-shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Bell className="w-4 h-4 text-blue-500" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white tracking-tight">Activity</h3>
                        </div>

                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="p-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 rounded-lg transition-colors flex items-center gap-1.5"
                                    title="Mark all as read"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    Read All
                                </button>
                            )}
                            <button
                                onClick={handleClearAll}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Clear all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                <p className="text-sm font-medium text-gray-400 animate-pulse">Checking for updates...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mb-4 transition-transform hover:rotate-12">
                                    <Bell className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">Stay updated!</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-500 leading-relaxed">
                                    New transactions, alerts, and messages will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="py-2 divide-y divide-gray-50 dark:divide-slate-800/30">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={cn(
                                            "relative px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer group flex gap-4",
                                            !notification.isRead && "after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-blue-500"
                                        )}
                                        onClick={() => {
                                            if (!notification.isRead) markAsRead(notification._id);
                                        }}
                                    >
                                        <div className={cn(
                                            "flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm",
                                            getNotificationColor(notification.type)
                                        )}>
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col pointer-events-none">
                                            <div className="flex items-start justify-between mb-1">
                                                <h5 className={cn(
                                                    "text-sm tracking-tight line-clamp-1",
                                                    notification.isRead ? "font-semibold text-gray-600 dark:text-slate-400" : "font-black text-gray-900 dark:text-white"
                                                )}>
                                                    {notification.title}
                                                </h5>
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase whitespace-nowrap ml-2">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-xs line-clamp-2 leading-relaxed mb-2",
                                                notification.isRead ? "text-gray-500 dark:text-slate-500" : "text-gray-600 dark:text-slate-300 font-medium"
                                            )}>
                                                {notification.message}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification._id);
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-red-500 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-100 dark:border-slate-800/50 bg-gray-50/50 dark:bg-slate-900/50 rounded-b-2xl flex justify-center flex-shrink-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
                                End of Activity Circle
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
