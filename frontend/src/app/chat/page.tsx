'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, Button, Modal, cn } from '@/components/ui';
import { useChat } from '@/hooks/useChat';
import { useSocket } from '@/contexts/SocketContext';
import {
    MessageSquare,
    Send,
    Search,
    Plus,
    Users,
    User,
    Check,
    CheckCheck,
    MoreVertical,
    Phone,
    Video,
    Paperclip,
    Smile,
    ArrowLeft,
    Circle,
    Hash,
    Settings,
    X,
    Edit3,
    Trash2,
    Reply,
    Copy,
    FileIcon,
    Download,
    Pin,
    Forward,
    Share2
} from 'lucide-react';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from 'next-themes';

interface ChatUser {
    _id: string;
    name: string;
    email: string;
    role?: string;
}

export default function ChatPage() {
    const {
        rooms,
        activeRoom,
        messages,
        loading,
        sendingMessage,
        typingUsers,
        unreadCounts,
        setActiveRoom,
        sendMessage,
        deleteMessage,
        uploadFile,
        createDirectChat,
        createGroupChat,
        setTyping,
        fetchAvailableUsers,
        pinMessage,
        unpinMessage,
        forwardMessage,
    } = useChat();

    const { isConnected, onlineUsers } = useSocket();
    const { theme } = useTheme();

    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [isMobileView, setIsMobileView] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [messageToForward, setMessageToForward] = useState<any>(null);
    const [showRoomMenu, setShowRoomMenu] = useState(false);
    const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>({ id: '', name: '', email: '', role: '' });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const roomMenuRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle mobile view and initial user data
    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);

        // Load current user from localStorage safely on client
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    setCurrentUser(JSON.parse(userData));
                } catch (e) {
                    console.error('Failed to parse user data from localStorage', e);
                }
            }
        }

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
                setShowEmojiPicker(false);
            }
            if (roomMenuRef.current && !roomMenuRef.current.contains(target)) {
                setShowRoomMenu(false);
            }
            if (messageMenuOpen && !(target as HTMLElement).closest('.msg-menu-container')) {
                setMessageMenuOpen(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load available users for new chat
    const loadAvailableUsers = async () => {
        const users = await fetchAvailableUsers();
        console.log(users);
        setAvailableUsers(users);
    };

    // Handle send message
    const handleSendMessage = async () => {
        if ((!messageInput.trim() && !pendingAttachment) || sendingMessage) return;

        const content = messageInput.trim();
        const attachments = pendingAttachment ? [pendingAttachment] : undefined;
        const type = pendingAttachment
            ? (pendingAttachment.type.startsWith('image/') ? 'IMAGE' : 'FILE')
            : 'TEXT';

        setMessageInput('');
        setPendingAttachment(null);
        setReplyingTo(null);
        setShowEmojiPicker(false);

        await sendMessage(content, type, attachments, replyingTo?._id);
        messageInputRef.current?.focus();
    };

    // Handle reply
    const handleReply = (message: any) => {
        setReplyingTo(message);
        messageInputRef.current?.focus();
    };

    // Handle pin/unpin toggle
    const handlePinMessage = async (messageId: string) => {
        if (!activeRoom) return;
        const isPinned = activeRoom.pinnedMessages?.some(m => m._id === messageId);
        if (isPinned) {
            await unpinMessage(messageId);
        } else {
            await pinMessage(messageId);
        }
    };

    // Handle forward
    const handleForwardMessage = (message: any) => {
        setMessageToForward(message);
        setShowForwardModal(true);
    };

    const confirmForward = async (targetRoomId: string) => {
        if (!messageToForward) return;
        await forwardMessage(messageToForward._id, [targetRoomId]);
        setShowForwardModal(false);
        setMessageToForward(null);
    };

    // Handle file selection
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const uploadedFile = await uploadFile(file);
            setPendingAttachment(uploadedFile);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handle emoji click
    const onEmojiClick = (emojiData: any) => {
        setMessageInput(prev => prev + emojiData.emoji);
        // Don't close picker so user can add multiple emojis
    };

    // Handle delete message
    const handleDeleteMessage = async (messageId: string) => {
        if (confirm('Are you sure you want to delete this message?')) {
            await deleteMessage(messageId);
        }
    };

    // Close emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle typing
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        setTyping(true);
    };

    // Handle create direct chat
    const handleCreateDirectChat = async (userId: string) => {
        const room = await createDirectChat(userId);
        setActiveRoom(room);
        setShowNewChatModal(false);
        setSelectedUsers([]);
        if (isMobileView) setShowMobileSidebar(false);
    };

    // Handle create group chat
    const handleCreateGroupChat = async () => {
        if (!groupName.trim() || selectedUsers.length === 0) return;

        const room = await createGroupChat(groupName.trim(), selectedUsers, groupDescription);
        setActiveRoom(room);
        setShowGroupModal(false);
        setSelectedUsers([]);
        setGroupName('');
        setGroupDescription('');
        if (isMobileView) setShowMobileSidebar(false);
    };

    // Get other participant in direct chat
    const getOtherParticipant = (room: typeof activeRoom) => {
        if (!room || room.type !== 'DIRECT') return null;
        return room.participants.find(p => p._id !== currentUser.id);
    };

    // Format time
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Format date header
    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    };

    // Group messages by date
    const groupMessagesByDate = (msgs: typeof messages) => {
        const groups: { date: string; messages: typeof messages }[] = [];
        let currentDate = '';

        msgs.forEach(msg => {
            const msgDate = new Date(msg.createdAt).toDateString();
            if (msgDate !== currentDate) {
                currentDate = msgDate;
                groups.push({ date: msg.createdAt, messages: [msg] });
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        });

        return groups;
    };

    // Filter rooms by search
    const filteredRooms = rooms.filter(room => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        if (room.name?.toLowerCase().includes(query)) return true;
        if (room.type === 'DIRECT') {
            const other = getOtherParticipant(room);
            return other?.name.toLowerCase().includes(query) || other?.email.toLowerCase().includes(query);
        }
        return false;
    });



    return (
        <DashboardLayout>
            <div className="fixed inset-0 lg:static flex flex-col lg:flex-row bg-gray-50 dark:bg-black h-[100dvh] lg:h-[calc(100vh-64px)] -m-4 lg:-m-8 overflow-hidden">

                {/* Sidebar - Chat List */}
                <div className={cn(
                    "w-full lg:w-80 xl:w-96 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/50 transition-all duration-300",
                    isMobileView && !showMobileSidebar && "hidden",
                    !isMobileView && "flex"
                )}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageSquare className="w-6 h-6 text-blue-500" />
                                Messages
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        loadAvailableUsers();
                                        setShowNewChatModal(true);
                                    }}
                                    className="p-2"
                                >
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 
                                         rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                                         focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>

                    {/* Room List */}
                    <div className="flex-1 overflow-y-auto native-scroll">
                        {loading && rooms.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-slate-500">
                                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to begin</p>
                            </div>
                        ) : (
                            filteredRooms.map(room => {
                                const otherUser = room.type === 'DIRECT' ? getOtherParticipant(room) : null;
                                const isOnline = isConnected && otherUser && onlineUsers.includes(otherUser._id);
                                const unread = unreadCounts[room._id] || 0;
                                const isActive = activeRoom?._id === room._id;

                                return (
                                    <div
                                        key={room._id}
                                        onClick={() => {
                                            setActiveRoom(room);
                                            if (isMobileView) setShowMobileSidebar(false);
                                        }}
                                        className={cn(
                                            "px-4 py-3 cursor-pointer transition-all border-l-2",
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500"
                                                : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="relative flex-shrink-0">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                                    room.type === 'DIRECT'
                                                        ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                                                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                                                )}>
                                                    {room.type === 'DIRECT' ? (
                                                        <span className="text-white font-bold text-lg">
                                                            {otherUser?.name?.charAt(0).toUpperCase()}
                                                        </span>
                                                    ) : (
                                                        <Users className="w-5 h-5 text-white" />
                                                    )}
                                                </div>
                                                {isOnline && (
                                                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 
                                                                   bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {room.type === 'DIRECT'
                                                            ? otherUser?.name
                                                            : room.name}
                                                    </p>
                                                    <span className="text-xs text-gray-500 dark:text-slate-500">
                                                        {room.lastMessageAt && formatTime(room.lastMessageAt)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                                                        {room.lastMessage?.content || 'No messages yet'}
                                                    </p>
                                                    {unread > 0 && (
                                                        <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full
                                                                       bg-blue-500 text-white">
                                                            {unread}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Create Group Button */}
                    <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                loadAvailableUsers();
                                setShowGroupModal(true);
                            }}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Create Group Chat
                        </Button>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col",
                    isMobileView && showMobileSidebar && "hidden"
                )}>
                    {!activeRoom ? (
                        /* No active chat */
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-slate-500">
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                                <MessageSquare className="w-12 h-12 opacity-50" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome to Chat</h3>
                            <p className="text-sm text-center max-w-sm text-gray-600 dark:text-slate-400">
                                Select a conversation from the sidebar or start a new chat to begin messaging.
                            </p>
                            <Button
                                variant="primary"
                                className="mt-6"
                                onClick={() => {
                                    loadAvailableUsers();
                                    setShowNewChatModal(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Start New Chat
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isMobileView && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowMobileSidebar(true)}
                                                className="p-2 mr-2"
                                            >
                                                <ArrowLeft className="w-5 h-5" />
                                            </Button>
                                        )}

                                        <div className="relative">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                activeRoom.type === 'DIRECT'
                                                    ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                                                    : "bg-gradient-to-br from-purple-500 to-pink-500"
                                            )}>
                                                {activeRoom.type === 'DIRECT' ? (
                                                    <span className="text-white font-bold">
                                                        {getOtherParticipant(activeRoom)?.name?.charAt(0).toUpperCase()}
                                                    </span>
                                                ) : (
                                                    <Users className="w-5 h-5 text-white" />
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {activeRoom.type === 'DIRECT'
                                                    ? getOtherParticipant(activeRoom)?.name
                                                    : activeRoom.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                                {activeRoom.type === 'DIRECT' ? (
                                                    !isConnected
                                                        ? '🔄 Checking...'
                                                        : onlineUsers.includes(getOtherParticipant(activeRoom)?._id || '')
                                                            ? '🟢 Online'
                                                            : '⚪ Offline'
                                                ) : (
                                                    `${activeRoom.participants.length} members`
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {!isConnected && (
                                            <span className="text-xs text-amber-400 px-2 py-1 rounded bg-amber-500/10">
                                                Reconnecting...
                                            </span>
                                        )}
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <Phone className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <Video className="w-5 h-5" />
                                        </Button>
                                        <div className="relative" ref={roomMenuRef}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="p-2"
                                                onClick={() => setShowRoomMenu(!showRoomMenu)}
                                            >
                                                <MoreVertical className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                                            </Button>

                                            {showRoomMenu && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2">
                                                        <User className="w-4 h-4" />
                                                        View Profile
                                                    </button>
                                                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2">
                                                        <Search className="w-4 h-4" />
                                                        Search Messages
                                                    </button>
                                                    <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
                                                    <button className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2">
                                                        <Circle className="w-4 h-4" />
                                                        Mute Notifications
                                                    </button>
                                                    <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2">
                                                        <Trash2 className="w-4 h-4" />
                                                        Clear Chat
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Pinned Messages Banner */}
                            {activeRoom.pinnedMessages && activeRoom.pinnedMessages.length > 0 && (
                                <div className="px-6 py-2 bg-amber-50/50 dark:bg-amber-500/5 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between group/pins">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pinned Message</p>
                                            <p className="text-xs text-amber-900 dark:text-amber-200 truncate opacity-80">
                                                {activeRoom.pinnedMessages[activeRoom.pinnedMessages.length - 1].content}
                                            </p>
                                        </div>
                                    </div>
                                    {activeRoom.pinnedMessages.length > 1 && (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded ml-2">
                                            +{activeRoom.pinnedMessages.length - 1}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gray-100/30 dark:bg-transparent native-scroll scroll-smooth">
                                {groupMessagesByDate(messages).map((group, groupIdx) => (
                                    <div key={groupIdx}>
                                        {/* Date Header */}
                                        <div className="flex items-center justify-center my-4">
                                            <span className="px-3 py-1 text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800/50 rounded-full shadow-sm dark:shadow-none">
                                                {formatDateHeader(group.date)}
                                            </span>
                                        </div>

                                        {/* Messages */}
                                        {group.messages.map((msg, msgIdx) => {
                                            const sender = typeof msg.senderId === 'object' ? msg.senderId : null;
                                            const isOwn = sender?._id === currentUser.id || msg.senderId === currentUser.id;
                                            const isSystem = msg.type === 'SYSTEM';

                                            if (isSystem) {
                                                return (
                                                    <div key={msg._id} className="flex justify-center my-2">
                                                        <span className="text-xs text-gray-500 dark:text-slate-500 italic">
                                                            {msg.content}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={msg._id}
                                                    className={cn(
                                                        "flex gap-3 group/msg relative mb-1",
                                                        isOwn ? "flex-row-reverse" : "flex-row"
                                                    )}
                                                >
                                                    {/* Avatar (for others) */}
                                                    {!isOwn && (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 
                                                                      flex items-center justify-center flex-shrink-0 mt-auto shadow-sm border border-white/20">
                                                            <span className="text-white text-[10px] font-bold">
                                                                {sender?.name?.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Message Bubble Container */}
                                                    <div className={cn(
                                                        "max-w-[85%] sm:max-w-[70%] relative flex flex-col",
                                                        isOwn ? "items-end text-right" : "items-start text-left"
                                                    )}>
                                                        {/* Message Actions (on hover) */}
                                                        {!msg.isDeleted && (
                                                            <div className={cn(
                                                                "flex items-center opacity-0 group-hover/msg:opacity-100 transition-all duration-200 absolute -top-5 z-20",
                                                                isOwn ? "right-1" : "left-1"
                                                            )}>
                                                                <div className="bg-white dark:bg-slate-800 shadow-xl border border-gray-100 dark:border-slate-700/50 rounded-full p-0.5 flex gap-0.5 backdrop-blur-md">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleReply(msg)}
                                                                        className="h-6 w-6 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                                                                    >
                                                                        <Reply className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handlePinMessage(msg._id)}
                                                                        className={cn(
                                                                            "h-6 w-6 p-0 rounded-full transition-colors",
                                                                            activeRoom.pinnedMessages?.some(m => m._id === msg._id)
                                                                                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                                                : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                                                                        )}
                                                                    >
                                                                        <Pin className={cn("w-3 h-3", activeRoom.pinnedMessages?.some(m => m._id === msg._id) && "fill-current")} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleForwardMessage(msg)}
                                                                        className="h-6 w-6 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                                                                    >
                                                                        <Forward className="w-3 h-3" />
                                                                    </Button>
                                                                    {isOwn && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteMessage(msg._id)}
                                                                            className="h-6 w-6 p-0 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    )}
                                                                    <div className="relative msg-menu-container">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setMessageMenuOpen(messageMenuOpen === msg._id ? null : msg._id)}
                                                                            className="h-6 w-6 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                                                                        >
                                                                            <MoreVertical className="w-3 h-3" />
                                                                        </Button>

                                                                        {messageMenuOpen === msg._id && (
                                                                            <div className={cn(
                                                                                "absolute mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-100 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100",
                                                                                isOwn ? "right-0" : "left-0"
                                                                            )}>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(msg.content);
                                                                                        setMessageMenuOpen(null);
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                                                >
                                                                                    <Copy className="w-3 h-3" />
                                                                                    Copy Text
                                                                                </button>
                                                                                {!isOwn && (
                                                                                    <button
                                                                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                                                    >
                                                                                        <Share2 className="w-3 h-3" />
                                                                                        Share
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Sender name (for group chats) */}
                                                        {!isOwn && activeRoom.type === 'GROUP' && (
                                                            <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1 ml-2">
                                                                {sender?.name}
                                                            </p>
                                                        )}

                                                        <div className={cn(
                                                            "relative rounded-[20px] shadow-sm transition-all duration-200",
                                                            isOwn
                                                                ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none hover:shadow-md hover:shadow-blue-500/10"
                                                                : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-slate-700/50 hover:shadow-md hover:shadow-black/5",
                                                            msg.isDeleted && "opacity-60 italic bg-gray-100 dark:bg-slate-900 text-gray-500"
                                                        )}>
                                                            {/* Forwarded Tag */}
                                                            {msg.isForwarded && (
                                                                <div className="flex items-center gap-1 px-3 pt-2 text-[10px] opacity-70 italic font-medium">
                                                                    <Forward className="w-2.5 h-2.5" />
                                                                    Forwarded
                                                                </div>
                                                            )}

                                                            {/* Reply Reference */}
                                                            {msg.replyTo && (
                                                                <div className={cn(
                                                                    "mx-2 mt-2 p-2 rounded-lg text-xs border-l-4 bg-black/5 dark:bg-white/5",
                                                                    isOwn ? "border-white/30" : "border-blue-500/50"
                                                                )}>
                                                                    <p className="font-bold opacity-70 mb-0.5">
                                                                        {typeof msg.replyTo.senderId === 'object' ? msg.replyTo.senderId.name : 'User'}
                                                                    </p>
                                                                    <p className="line-clamp-1 opacity-60">
                                                                        {msg.replyTo.content}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Bubble Tail */}
                                                            <div className={cn(
                                                                "absolute top-0 w-3 h-3 overflow-hidden",
                                                                isOwn ? "-right-2" : "-left-2"
                                                            )}>
                                                                <div className={cn(
                                                                    "w-full h-full transform origin-top",
                                                                    isOwn
                                                                        ? "bg-indigo-700 rotate-45 -translate-x-1"
                                                                        : "bg-white dark:bg-slate-800 border-l border-t border-gray-100 dark:border-slate-700/50 -rotate-45 translate-x-1"
                                                                )} />
                                                            </div>

                                                            <div className="px-4 py-2.5">
                                                                {/* Attachments */}
                                                                {msg.attachments && msg.attachments.length > 0 && (
                                                                    <div className="mb-2 -mx-1 flex flex-wrap gap-1">
                                                                        {msg.attachments.map((file, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className={cn(
                                                                                    "rounded-xl overflow-hidden border transition-transform hover:scale-[1.02]",
                                                                                    isOwn ? "border-white/20" : "border-gray-100 dark:border-slate-700"
                                                                                )}
                                                                            >
                                                                                {file.type.startsWith('image/') ? (
                                                                                    <div className="relative group/attach cursor-zoom-in">
                                                                                        <img
                                                                                            src={file.url}
                                                                                            alt={file.name}
                                                                                            className="max-w-full h-auto max-h-72 object-cover"
                                                                                            onClick={() => window.open(file.url, '_blank')}
                                                                                        />
                                                                                        <div className="absolute inset-0 bg-black/0 group-hover/attach:bg-black/10 transition-colors" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <a
                                                                                        href={file.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className={cn(
                                                                                            "flex items-center gap-3 p-3 transition-colors min-w-[200px]",
                                                                                            isOwn ? "bg-white/10 hover:bg-white/20" : "bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700"
                                                                                        )}
                                                                                    >
                                                                                        <div className={cn(
                                                                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                                                                            isOwn ? "bg-white/20" : "bg-blue-500/10 text-blue-500"
                                                                                        )}>
                                                                                            <FileIcon className="w-5 h-5" />
                                                                                        </div>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-xs font-medium truncate">{file.name}</p>
                                                                                            <p className={cn("text-[10px] opacity-60", isOwn ? "text-white" : "text-gray-500")}>{(file.size / 1024).toFixed(1)} KB</p>
                                                                                        </div>
                                                                                        <Download className="w-4 h-4 opacity-40 hover:opacity-100" />
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <p className="text-[14px] leading-relaxed break-words font-normal tracking-[0.01em]">
                                                                    {msg.content}
                                                                </p>

                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 mt-1",
                                                                    isOwn ? "justify-end" : "justify-start"
                                                                )}>
                                                                    <span className={cn(
                                                                        "text-[10px] font-medium",
                                                                        isOwn ? "text-white/60" : "text-gray-400 dark:text-slate-500"
                                                                    )}>
                                                                        {formatTime(msg.createdAt)}
                                                                    </span>

                                                                    {msg.isEdited && (
                                                                        <span className={cn(
                                                                            "text-[10px] italic",
                                                                            isOwn ? "text-white/40" : "text-gray-400"
                                                                        )}>edited</span>
                                                                    )}

                                                                    {isOwn && (
                                                                        <div className="flex -space-x-1 ml-0.5">
                                                                            {msg.readBy.length > 0 ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-blue-300 drop-shadow-sm" />
                                                                            ) : (
                                                                                <Check className="w-3.5 h-3.5 text-white/40" />
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {activeRoom.pinnedMessages?.some(m => m._id === msg._id) && (
                                                                        <Pin className="w-2.5 h-2.5 text-amber-500 fill-current ml-1" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Typing Indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-sm">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span>Someone is typing...</span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50">
                                {/* Reply Preview */}
                                {replyingTo && (
                                    <div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border-l-4 border-blue-500 flex items-center gap-3 relative animate-in slide-in-from-bottom-2">
                                        <Reply className="w-4 h-4 text-blue-500" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                                Replying to {typeof replyingTo.senderId === 'object' ? replyingTo.senderId.name : 'User'}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                                                {replyingTo.content}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setReplyingTo(null)}
                                            className="p-1 h-auto hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {/* Attachment Preview */}
                                {pendingAttachment && (
                                    <div className="mb-3 p-2 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center gap-3 relative animate-in slide-in-from-bottom-2">
                                        {pendingAttachment.type.startsWith('image/') ? (
                                            <div className="w-12 h-12 rounded bg-gray-200 dark:bg-slate-700 overflow-hidden">
                                                <img src={pendingAttachment.url} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded bg-blue-500/20 flex items-center justify-center">
                                                <FileIcon className="w-6 h-6 text-blue-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{pendingAttachment.name}</p>
                                            <p className="text-xs text-gray-500">{(pendingAttachment.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPendingAttachment(null)}
                                            className="p-1 h-auto"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                                    >
                                        {isUploading ? (
                                            <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                        ) : (
                                            <Paperclip className="w-5 h-5" />
                                        )}
                                    </Button>

                                    <div className="flex-1 relative">
                                        <input
                                            ref={messageInputRef}
                                            type="text"
                                            placeholder="Type a message..."
                                            value={messageInput}
                                            onChange={handleTyping}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 
                                                     rounded-full text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                                                     focus:outline-none focus:border-blue-500/50 shadow-inner"
                                        />
                                    </div>

                                    <div className="relative" ref={emojiPickerRef}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={cn(
                                                "p-2 transition-colors",
                                                showEmojiPicker ? "text-blue-500" : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                                            )}
                                        >
                                            <Smile className="w-5 h-5" />
                                        </Button>

                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
                                                <EmojiPicker
                                                    onEmojiClick={onEmojiClick}
                                                    theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                                    lazyLoadEmojis={true}
                                                    searchPlaceholder="Search emojis..."
                                                    width={320}
                                                    height={400}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSendMessage}
                                        disabled={(!messageInput.trim() && !pendingAttachment) || sendingMessage || isUploading}
                                        className="p-3 rounded-full shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                                    >
                                        {sendingMessage ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            <Modal
                isOpen={showNewChatModal}
                onClose={() => {
                    setShowNewChatModal(false);
                    setSelectedUsers([]);
                }}
                title="Start New Conversation"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400">Select a user to start a direct message</p>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {availableUsers.map(user => (
                            <div
                                key={user._id}
                                onClick={() => handleCreateDirectChat(user._id)}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer
                                         hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 
                                              flex items-center justify-center">
                                    <span className="text-white font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                                </div>
                                {onlineUsers.includes(user._id) && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Create Group Modal */}
            <Modal
                isOpen={showGroupModal}
                onClose={() => {
                    setShowGroupModal(false);
                    setSelectedUsers([]);
                    setGroupName('');
                    setGroupDescription('');
                }}
                title="Create Group Chat"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name..."
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 
                                     rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                                     focus:outline-none focus:border-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description (optional)</label>
                        <input
                            type="text"
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="What's this group about?"
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 
                                     rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500
                                     focus:outline-none focus:border-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Select Members ({selectedUsers.length} selected)
                        </label>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {availableUsers.map(user => (
                                <div
                                    key={user._id}
                                    onClick={() => {
                                        setSelectedUsers(prev =>
                                            prev.includes(user._id)
                                                ? prev.filter(id => id !== user._id)
                                                : [...prev, user._id]
                                        );
                                    }}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                        selectedUsers.includes(user._id)
                                            ? "bg-blue-50 dark:bg-blue-500/20 border border-blue-500/50"
                                            : "hover:bg-gray-100 dark:hover:bg-slate-800/50 border border-transparent"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                                                  flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{user.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{user.email}</p>
                                    </div>
                                    {selectedUsers.includes(user._id) && (
                                        <Check className="w-5 h-5 text-blue-400" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                setShowGroupModal(false);
                                setSelectedUsers([]);
                                setGroupName('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1"
                            disabled={!groupName.trim() || selectedUsers.length === 0}
                            onClick={handleCreateGroupChat}
                        >
                            Create Group
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Forward Message Modal */}
            <Modal
                isOpen={showForwardModal}
                onClose={() => {
                    setShowForwardModal(false);
                    setMessageToForward(null);
                }}
                title="Forward Message"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-slate-400">Select a conversation to forward this message to</p>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {rooms.map(room => (
                            <div
                                key={room._id}
                                onClick={() => confirmForward(room._id)}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer
                                         hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-blue-500/20"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    room.type === 'DIRECT'
                                        ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                                )}>
                                    {room.type === 'DIRECT' ? (
                                        <span className="text-white font-bold">
                                            {getOtherParticipant(room)?.name?.charAt(0).toUpperCase()}
                                        </span>
                                    ) : (
                                        <Users className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {room.type === 'DIRECT'
                                            ? getOtherParticipant(room)?.name
                                            : room.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        {room.type === 'DIRECT' ? 'Direct Message' : 'Group Chat'}
                                    </p>
                                </div>
                                <Forward className="w-4 h-4 text-gray-400" />
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </DashboardLayout >
    );
}
