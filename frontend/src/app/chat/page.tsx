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
    Copy
} from 'lucide-react';

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
        createDirectChat,
        createGroupChat,
        setTyping,
        fetchAvailableUsers,
    } = useChat();

    const { isConnected, onlineUsers } = useSocket();

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle mobile view
    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load available users for new chat
    const loadAvailableUsers = async () => {
        const users = await fetchAvailableUsers();
        setAvailableUsers(users);
    };

    // Handle send message
    const handleSendMessage = async () => {
        if (!messageInput.trim() || sendingMessage) return;

        const content = messageInput.trim();
        setMessageInput('');
        await sendMessage(content);
        messageInputRef.current?.focus();
    };

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
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
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

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-120px)] flex bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">

                {/* Sidebar - Chat List */}
                <div className={cn(
                    "w-80 border-r border-slate-700/50 flex flex-col bg-slate-900/30",
                    isMobileView && !showMobileSidebar && "hidden",
                    isMobileView && "w-full"
                )}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 
                                         rounded-lg text-sm text-white placeholder-slate-500
                                         focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>

                    {/* Room List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading && rooms.length === 0 ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                                <p className="text-sm">No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to begin</p>
                            </div>
                        ) : (
                            filteredRooms.map(room => {
                                const otherUser = room.type === 'DIRECT' ? getOtherParticipant(room) : null;
                                const isOnline = otherUser && onlineUsers.includes(otherUser._id);
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
                                                ? "bg-blue-500/10 border-blue-500"
                                                : "border-transparent hover:bg-slate-800/30"
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
                                                                   bg-emerald-500 border-2 border-slate-900 rounded-full" />
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-semibold text-white truncate">
                                                        {room.type === 'DIRECT'
                                                            ? otherUser?.name
                                                            : room.name}
                                                    </p>
                                                    <span className="text-xs text-slate-500">
                                                        {room.lastMessageAt && formatTime(room.lastMessageAt)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className="text-sm text-slate-400 truncate">
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
                    <div className="p-4 border-t border-slate-700/50">
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
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <div className="w-24 h-24 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                                <MessageSquare className="w-12 h-12 opacity-50" />
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Welcome to Chat</h3>
                            <p className="text-sm text-center max-w-sm">
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
                            <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-900/50">
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
                                            <h3 className="font-semibold text-white">
                                                {activeRoom.type === 'DIRECT'
                                                    ? getOtherParticipant(activeRoom)?.name
                                                    : activeRoom.name}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                {activeRoom.type === 'DIRECT' ? (
                                                    onlineUsers.includes(getOtherParticipant(activeRoom)?._id || '')
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
                                                Connecting...
                                            </span>
                                        )}
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <Phone className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <Video className="w-5 h-5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="p-2">
                                            <MoreVertical className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {groupMessagesByDate(messages).map((group, groupIdx) => (
                                    <div key={groupIdx}>
                                        {/* Date Header */}
                                        <div className="flex items-center justify-center my-4">
                                            <span className="px-3 py-1 text-xs text-slate-400 bg-slate-800/50 rounded-full">
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
                                                        <span className="text-xs text-slate-500 italic">
                                                            {msg.content}
                                                        </span>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={msg._id}
                                                    className={cn(
                                                        "flex gap-3 group",
                                                        isOwn ? "justify-end" : "justify-start"
                                                    )}
                                                >
                                                    {/* Avatar (for others) */}
                                                    {!isOwn && (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 
                                                                      flex items-center justify-center flex-shrink-0">
                                                            <span className="text-white text-sm font-bold">
                                                                {sender?.name?.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Message Bubble */}
                                                    <div className={cn(
                                                        "max-w-[70%] rounded-2xl px-4 py-2",
                                                        isOwn
                                                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm"
                                                            : "bg-slate-800/70 text-white rounded-bl-sm",
                                                        msg.isDeleted && "opacity-50 italic"
                                                    )}>
                                                        {/* Sender name (for group chats) */}
                                                        {!isOwn && activeRoom.type === 'GROUP' && (
                                                            <p className="text-xs font-medium text-blue-400 mb-1">
                                                                {sender?.name}
                                                            </p>
                                                        )}

                                                        <p className="text-sm break-words">{msg.content}</p>

                                                        <div className={cn(
                                                            "flex items-center gap-1 mt-1",
                                                            isOwn ? "justify-end" : "justify-start"
                                                        )}>
                                                            <span className={cn(
                                                                "text-xs",
                                                                isOwn ? "text-blue-100/70" : "text-slate-400"
                                                            )}>
                                                                {formatTime(msg.createdAt)}
                                                            </span>
                                                            {msg.isEdited && (
                                                                <span className="text-xs text-slate-400">(edited)</span>
                                                            )}
                                                            {isOwn && (
                                                                msg.readBy.length > 0
                                                                    ? <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                                                    : <Check className="w-3.5 h-3.5 text-blue-100/50" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Typing Indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
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
                            <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="sm" className="p-2 text-slate-400 hover:text-white">
                                        <Paperclip className="w-5 h-5" />
                                    </Button>

                                    <div className="flex-1 relative">
                                        <input
                                            ref={messageInputRef}
                                            type="text"
                                            placeholder="Type a message..."
                                            value={messageInput}
                                            onChange={handleTyping}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 
                                                     rounded-full text-white placeholder-slate-500
                                                     focus:outline-none focus:border-blue-500/50"
                                        />
                                    </div>

                                    <Button variant="ghost" size="sm" className="p-2 text-slate-400 hover:text-white">
                                        <Smile className="w-5 h-5" />
                                    </Button>

                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendingMessage}
                                        className="p-3 rounded-full"
                                    >
                                        <Send className="w-5 h-5" />
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
                    <p className="text-sm text-slate-400">Select a user to start a direct message</p>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {availableUsers.map(user => (
                            <div
                                key={user._id}
                                onClick={() => handleCreateDirectChat(user._id)}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer
                                         hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 
                                              flex items-center justify-center">
                                    <span className="text-white font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-white">{user.name}</p>
                                    <p className="text-xs text-slate-400">{user.email}</p>
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name..."
                            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 
                                     rounded-lg text-white placeholder-slate-500
                                     focus:outline-none focus:border-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Description (optional)</label>
                        <input
                            type="text"
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="What's this group about?"
                            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 
                                     rounded-lg text-white placeholder-slate-500
                                     focus:outline-none focus:border-blue-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
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
                                            ? "bg-blue-500/20 border border-blue-500/50"
                                            : "hover:bg-slate-800/50 border border-transparent"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                                                  flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white text-sm">{user.name}</p>
                                        <p className="text-xs text-slate-400">{user.email}</p>
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
        </DashboardLayout>
    );
}
