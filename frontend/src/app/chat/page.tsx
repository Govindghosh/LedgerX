'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, Button, Modal, cn } from '@/components/ui';
import { useChat } from '@/hooks/useChat';
import { useSocket } from '@/contexts/SocketContext';
import { useCall } from '@/contexts/CallContext';
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
import { toast } from 'sonner';
import { ProfileModal } from '@/components/chat/ProfileModal';
import api from '@/lib/api';

interface ChatUser {
    _id: string;
    name: string;
    email: string;
    role?: string;
    profilePicture?: string;
    bio?: string;
    phoneNumber?: string;
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
        editMessage,
        uploadFile,
        createDirectChat,
        createGroupChat,
        setTyping,
        fetchAvailableUsers,
        pinMessage,
        unpinMessage,
        forwardMessage,
        getAISuggestions,
        callLogs,
        fetchCallLogs
    } = useChat();

    const { initiateCall, endCall } = useCall();

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [fetchingSuggestions, setFetchingSuggestions] = useState(false);

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
    const [editingMessage, setEditingMessage] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<any>({ id: '', name: '', email: '', role: '' });
    const [activeTab, setActiveTab] = useState<'CHATS' | 'CALLS'>('CHATS');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [isViewingOwnProfile, setIsViewingOwnProfile] = useState(false);

    // Handle view profile
    const handleViewProfile = async (userId: string) => {
        try {
            console.log('[ChatPage] Opening profile for userId:', userId);
            console.log('[ChatPage] Current user:', currentUser);

            if (!userId) {
                console.error('[ChatPage] No userId provided');
                toast.error('Cannot view profile - user ID missing');
                return;
            }

            const isOwn = userId === currentUser.id || userId === currentUser._id;
            console.log('[ChatPage] Is own profile:', isOwn);

            setIsViewingOwnProfile(isOwn);
            setViewingUser({ _id: userId });
            setShowProfileModal(true);
        } catch (err) {
            console.error('[ChatPage] Error in handleViewProfile:', err);
            toast.error('Failed to load profile');
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const roomMenuRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

        // Fetch AI suggestions if last message is from someone else
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && typeof lastMsg.senderId === 'object' && lastMsg.senderId?._id && lastMsg.senderId._id !== currentUser.id) {
            fetchSuggestions();
        } else {
            setSuggestions([]);
        }
    }, [messages, currentUser.id]);

    const fetchSuggestions = async () => {
        if (!activeRoom) return;
        setFetchingSuggestions(true);
        try {
            const data = await getAISuggestions();
            setSuggestions(data);
        } catch (err) {
            console.error('Suggestions error:', err);
        } finally {
            setFetchingSuggestions(false);
        }
    };

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

        if (editingMessage) {
            await editMessage(editingMessage._id, content);
            setEditingMessage(null);
            setMessageInput('');
            return;
        }

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

    const handleStartEdit = (message: any) => {
        setEditingMessage(message);
        setMessageInput(message.content);
        setReplyingTo(null);
        setPendingAttachment(null);
        messageInputRef.current?.focus();
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setMessageInput('');
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
        const currentUserId = currentUser._id || currentUser.id;
        return room.participants.find(p => p._id !== currentUserId);
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
            <div className="absolute inset-0 flex flex-col lg:flex-row bg-gray-50/50 dark:bg-black overflow-hidden select-none">

                {/* Sidebar - Chat List */}
                <div className={cn(
                    "flex-shrink-0 w-full lg:w-[350px] xl:w-[400px] border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-30",
                    isMobileView && !showMobileSidebar ? "-translate-x-full absolute h-full" : "translate-x-0 relative h-full",
                    !isMobileView && "flex"
                )}>
                    {/* Sidebar Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-800/50 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl">
                                    <MessageSquare className="w-6 h-6 text-blue-500" />
                                </div>
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

                        {/* Tab Switcher */}
                        <div className="flex p-1 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                            <button
                                onClick={() => setActiveTab('CHATS')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                                    activeTab === 'CHATS'
                                        ? "bg-white dark:bg-slate-700 text-blue-500 shadow-sm"
                                        : "text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
                                )}
                            >
                                <MessageSquare className="w-4 h-4" />
                                Chats
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('CALLS');
                                    fetchCallLogs();
                                }}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase tracking-widest transition-all rounded-lg",
                                    activeTab === 'CALLS'
                                        ? "bg-white dark:bg-slate-700 text-blue-500 shadow-sm"
                                        : "text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
                                )}
                            >
                                <Phone className="w-4 h-4" />
                                Calls
                            </button>
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

                    {/* List Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide lg:scrollbar-default">
                        {activeTab === 'CHATS' ? (
                            <div className="flex flex-col">
                                {loading && rooms.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                    </div>
                                ) : filteredRooms.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 px-6 text-gray-500 dark:text-slate-500">
                                        <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                                            <MessageSquare className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">No chats yet</p>
                                        <p className="text-sm text-center mt-1 opacity-60 italic">Reach out to your colleagues to start a conversation.</p>
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
                                                    "group px-4 py-4 sm:px-6 cursor-pointer transition-all relative border-b border-gray-50 dark:border-slate-800/30",
                                                    isActive
                                                        ? "bg-blue-50/50 dark:bg-blue-500/10"
                                                        : "hover:bg-gray-50 dark:hover:bg-slate-800/20"
                                                )}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-blue-500 rounded-r-full" />
                                                )}

                                                <div className="flex items-center gap-4">
                                                    {/* Avatar */}
                                                    <div className="relative flex-shrink-0">
                                                        <div
                                                            onClick={(e) => {
                                                                if (room.type === 'DIRECT' && otherUser) {
                                                                    e.stopPropagation();
                                                                    console.log('[ChatList] Clicked avatar for user:', otherUser);
                                                                    handleViewProfile(otherUser._id);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 overflow-hidden",
                                                                room.type === 'DIRECT' && "cursor-pointer hover:ring-2 hover:ring-blue-500/50",
                                                                room.type === 'DIRECT'
                                                                    ? "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"
                                                                    : "bg-gradient-to-br from-amber-500 to-orange-600"
                                                            )}
                                                        >
                                                            {room.type === 'DIRECT' ? (
                                                                otherUser?.profilePicture ? (
                                                                    <img src={otherUser.profilePicture} alt={otherUser.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-white font-black text-xl">
                                                                        {otherUser?.name?.charAt(0).toUpperCase()}
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <Users className="w-6 h-6 text-white" />
                                                            )}
                                                        </div>
                                                        {isOnline && (
                                                            <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-900 rounded-full">
                                                                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-gray-900 dark:text-white truncate text-base">
                                                                {room.type === 'DIRECT' ? otherUser?.name : room.name}
                                                            </span>
                                                            <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-500 whitespace-nowrap ml-2 uppercase">
                                                                {room.lastMessageAt && formatTime(room.lastMessageAt)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <p className={cn(
                                                                "text-sm truncate pr-2 transition-colors",
                                                                unread > 0 ? "text-gray-900 dark:text-white font-bold" : "text-gray-500 dark:text-slate-400 font-medium"
                                                            )}>
                                                                {room.lastMessage?.content || 'Started a conversation'}
                                                            </p>
                                                            {unread > 0 && (
                                                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/30">
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
                        ) : (
                            <CallLogsList
                                logs={callLogs}
                                currentUserId={currentUser.id || currentUser._id}
                                onCall={(userId, name, type) => {
                                    const room = rooms.find(r => r.type === 'DIRECT' && r.participants.find(p => p._id === userId));
                                    if (room) initiateCall(userId, name, type, room._id, currentUser.name);
                                    else toast.error('Check your internet connection');
                                }}
                            />
                        )}
                    </div>

                    {/* Create Group Button */}
                    <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 font-bold h-12 rounded-xl group transition-all hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600"
                            onClick={() => {
                                loadAvailableUsers();
                                setShowGroupModal(true);
                            }}
                        >
                            <div className="p-1 px-1.5 bg-gray-100 dark:bg-slate-800 rounded group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Users className="w-4 h-4" />
                            </div>
                            Create New Group
                        </Button>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col relative transition-all duration-300 h-full",
                    isMobileView && showMobileSidebar && "translate-x-full absolute w-full",
                    isMobileView && !showMobileSidebar && "translate-x-0 relative w-full"
                )}>
                    {!activeRoom ? (
                        /* No active chat */
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-black">
                            <div className="relative mb-8">
                                <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center animate-pulse">
                                    <MessageSquare className="w-16 h-16 text-blue-500 opacity-20" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Your Inbox</h3>
                            <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
                                Connect with your team, share files, and keep transactions organized in one secure place.
                            </p>
                            <Button
                                variant="primary"
                                className="mt-8 h-12 px-8 rounded-2xl shadow-xl shadow-blue-500/20 font-bold transition-transform hover:scale-105"
                                onClick={() => {
                                    loadAvailableUsers();
                                    setShowNewChatModal(true);
                                }}
                            >
                                Send a Message
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full bg-white dark:bg-slate-950/20 backdrop-blur-3xl overflow-hidden shadow-2xl">
                            {/* Chat Header */}
                            <div className="px-6 h-[72px] sm:h-[84px] border-b border-gray-100 dark:border-slate-800/50 bg-white/10 dark:bg-slate-900/40 backdrop-blur-xl flex items-center justify-between z-20">
                                <div className="flex items-center gap-4">
                                    {isMobileView && (
                                        <button
                                            onClick={() => setShowMobileSidebar(true)}
                                            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                        >
                                            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-slate-400" />
                                        </button>
                                    )}

                                    <div className="relative group/avatar">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover/avatar:scale-105 transition-transform overflow-hidden",
                                            activeRoom?.type === 'DIRECT'
                                                ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                                                : "bg-gradient-to-br from-amber-500 to-orange-600"
                                        )}>
                                            {activeRoom?.type === 'DIRECT' ? (
                                                getOtherParticipant(activeRoom)?.profilePicture ? (
                                                    <img src={getOtherParticipant(activeRoom)?.profilePicture} alt={getOtherParticipant(activeRoom)?.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white font-black text-xl">
                                                        {getOtherParticipant(activeRoom)?.name?.charAt(0).toUpperCase()}
                                                    </span>
                                                )
                                            ) : (
                                                <Users className="w-6 h-6 text-white" />
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-gray-900 dark:text-white text-lg tracking-tight">
                                            {activeRoom?.type === 'DIRECT'
                                                ? getOtherParticipant(activeRoom)?.name
                                                : activeRoom?.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                                                {activeRoom?.type === 'DIRECT' ? (
                                                    !isConnected
                                                        ? 'Syncing...'
                                                        : onlineUsers.includes(getOtherParticipant(activeRoom)?._id || '')
                                                            ? 'Online'
                                                            : 'Offline'
                                                ) : (
                                                    `${activeRoom?.participants.length} Active Members`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!isConnected && (
                                        <span className="text-xs text-amber-400 px-2 py-1 rounded bg-amber-500/10">
                                            Reconnecting...
                                        </span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600"
                                        onClick={() => {
                                            const other = getOtherParticipant(activeRoom);
                                            if (other) initiateCall(other._id, other.name, 'audio', activeRoom._id, currentUser.name);
                                            else toast.error('Calling is only available in direct chats');
                                        }}
                                        disabled={activeRoom?.type !== 'DIRECT'}
                                    >
                                        <Phone className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600"
                                        onClick={() => {
                                            const other = getOtherParticipant(activeRoom);
                                            if (other) initiateCall(other._id, other.name, 'video', activeRoom._id, currentUser.name);
                                            else toast.error('Calling is only available in direct chats');
                                        }}
                                        disabled={activeRoom?.type !== 'DIRECT'}
                                    >
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
                                                <button
                                                    onClick={() => {
                                                        const other = getOtherParticipant(activeRoom);
                                                        if (other) handleViewProfile(other._id);
                                                        setShowRoomMenu(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                >
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

                            {activeRoom?.pinnedMessages && activeRoom.pinnedMessages.length > 0 && (
                                <div className="px-6 py-2 bg-amber-50/50 dark:bg-amber-500/5 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between group/pins">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pinned Message</p>
                                            <p className="text-xs text-amber-900 dark:text-amber-200 truncate opacity-80">
                                                {activeRoom?.pinnedMessages[activeRoom.pinnedMessages.length - 1].content}
                                            </p>
                                        </div>
                                    </div>
                                    {activeRoom?.pinnedMessages.length > 1 && (
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded ml-2">
                                            +{activeRoom.pinnedMessages.length - 1}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-gray-50/30 dark:bg-transparent native-scroll scroll-smooth relative">
                                {/* Ambient Background Effect */}
                                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
                                    <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />
                                    <div className="absolute bottom-[20%] right-[15%] w-[40%] h-[40%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse decoration-3000" />
                                </div>

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
                                                const isCall = msg.metadata?.callLogId;
                                                const callStatus = msg.metadata?.callStatus;
                                                const callType = msg.metadata?.callType || 'audio';
                                                const isMissed = callStatus === 'missed' || callStatus === 'rejected' || callStatus === 'busy';

                                                return (
                                                    <div key={msg._id} className="flex justify-center my-6">
                                                        {isCall ? (
                                                            <div className={cn(
                                                                "flex items-center gap-3 px-4 py-2 rounded-2xl border backdrop-blur-md shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                                isMissed
                                                                    ? "bg-red-500/5 border-red-500/10 text-red-500/80"
                                                                    : "bg-blue-500/5 border-blue-500/10 text-blue-500/80"
                                                            )}>
                                                                <div className={cn(
                                                                    "p-2 rounded-xl",
                                                                    isMissed ? "bg-red-500/10" : "bg-blue-500/10"
                                                                )}>
                                                                    {callType === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <p className="text-[11px] font-black uppercase tracking-widest">{msg.content}</p>
                                                                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">
                                                                        {formatTime(msg.createdAt)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="px-3 py-1 text-[10px] font-bold text-gray-500 dark:text-slate-500 italic bg-gray-100 dark:bg-slate-800/50 rounded-full uppercase tracking-tighter">
                                                                {msg.content}
                                                            </span>
                                                        )}
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
                                                        <div
                                                            onClick={() => handleViewProfile(sender?._id || (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId._id))}
                                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 
                                                                      flex items-center justify-center flex-shrink-0 mt-auto shadow-sm border border-white/20 cursor-pointer hover:scale-110 transition-transform overflow-hidden"
                                                        >
                                                            {sender?.profilePicture ? (
                                                                <img src={sender.profilePicture} alt={sender.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-white text-[10px] font-bold">
                                                                    {sender?.name?.charAt(0).toUpperCase()}
                                                                </span>
                                                            )}
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
                                                                            activeRoom?.pinnedMessages?.some(m => m._id === msg._id)
                                                                                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                                                : "hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                                                                        )}
                                                                    >
                                                                        <Pin className={cn("w-3 h-3", activeRoom?.pinnedMessages?.some(m => m._id === msg._id) && "fill-current")} />
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
                                                                                {isOwn && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            handleStartEdit(msg);
                                                                                            setMessageMenuOpen(null);
                                                                                        }}
                                                                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                                                                                    >
                                                                                        <Edit3 className="w-3 h-3" />
                                                                                        Edit Message
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Sender name (for group chats) */}
                                                        {!isOwn && activeRoom?.type === 'GROUP' && (
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

                                                                    {isOwn && !isSystem && (
                                                                        <div className="flex -space-x-1 ml-0.5">
                                                                            {msg.status === 'READ' ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-blue-300 drop-shadow-sm" />
                                                                            ) : msg.status === 'DELIVERED' ? (
                                                                                <CheckCheck className="w-3.5 h-3.5 text-white/40" />
                                                                            ) : (
                                                                                <Check className="w-3.5 h-3.5 text-white/40" />
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {activeRoom?.pinnedMessages?.some(m => m._id === msg._id) && (
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
                                    <div className="flex items-center gap-3 px-6 py-2 text-gray-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-full w-fit mx-auto sm:mx-0 animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '200ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '400ms' }} />
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-70">
                                            {typingUsers.length === 1 ? 'Someone is typing...' : 'Several people are typing...'}
                                        </span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} className="h-4" />
                            </div>

                            {/* Message Input Area */}
                            <div className="flex-shrink-0 p-4 sm:p-6 bg-white/20 dark:bg-slate-900/40 backdrop-blur-3xl border-t border-gray-100 dark:border-slate-800/50 z-20">
                                {/* AI Suggestions */}
                                {suggestions.length > 0 && (
                                    <div className="mb-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="w-full flex items-center gap-2 mb-1 px-1">
                                            <div className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                Smart Suggestions
                                            </div>
                                        </div>
                                        {suggestions.map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setMessageInput(suggestion);
                                                    setSuggestions([]);
                                                }}
                                                className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-500/20 
                                                         border border-gray-100 dark:border-slate-700/50 rounded-2xl text-xs font-semibold
                                                         text-gray-700 dark:text-slate-200 transition-all active:scale-95 shadow-sm
                                                         hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {fetchingSuggestions && suggestions.length === 0 && (
                                    <div className="mb-4 flex gap-2 animate-in fade-in duration-300">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-8 w-24 bg-gray-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                )}

                                {replyingTo && (
                                    <div className="mb-4 p-3 bg-blue-50/80 dark:bg-blue-500/10 border-l-4 border-blue-500 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Replying to</p>
                                            <p className="text-xs text-gray-700 dark:text-slate-300 truncate italic">
                                                "{replyingTo.content}"
                                            </p>
                                        </div>
                                        <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-gray-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {editingMessage && (
                                    <div className="mb-4 p-3 bg-amber-50/80 dark:bg-amber-500/10 border-l-4 border-amber-500 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Editing message</p>
                                            <p className="text-xs text-gray-700 dark:text-slate-300 truncate italic">
                                                "{editingMessage.content}"
                                            </p>
                                        </div>
                                        <button onClick={handleCancelEdit} className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-gray-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {pendingAttachment && (
                                    <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800/80 rounded-2xl flex items-center gap-3 border border-gray-100 dark:border-slate-700/50 group animate-in zoom-in-95 duration-200">
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                            {pendingAttachment.type.startsWith('image/') ? (
                                                <img src={pendingAttachment.url} alt="preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <FileIcon className="w-6 h-6 text-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{pendingAttachment.name}</p>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">{Math.round(pendingAttachment.size / 1024)} KB</p>
                                        </div>
                                        <button onClick={() => setPendingAttachment(null)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 sm:gap-4 relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="p-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-200 rounded-2xl transition-all active:scale-90 disabled:opacity-50 group shadow-sm flex-shrink-0"
                                    >
                                        {isUploading ? (
                                            <div className="w-6 h-6 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                        ) : (
                                            <Paperclip className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                        )}
                                    </button>

                                    <div className="flex-1 relative group">
                                        <input
                                            ref={messageInputRef}
                                            type="text"
                                            placeholder="Type something amazing..."
                                            value={messageInput}
                                            onChange={handleTyping}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            className="w-full h-14 pl-5 pr-14 bg-gray-100 dark:bg-slate-800/80 border border-transparent 
                                             focus:border-blue-500/50 rounded-2xl text-gray-900 dark:text-white font-medium
                                             placeholder-gray-400 dark:placeholder-slate-500 transition-all outline-none
                                             focus:ring-4 focus:ring-blue-500/5 dark:focus:ring-blue-500/10 shadow-sm"
                                        />

                                        <div className="absolute right-2 top-1/2 -translate-y-1/2" ref={emojiPickerRef}>
                                            <button
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className={cn(
                                                    "p-2.5 rounded-xl transition-all hover:bg-white dark:hover:bg-slate-700",
                                                    showEmojiPicker ? "text-blue-500 bg-white dark:bg-slate-700 shadow-md" : "text-gray-400 dark:text-slate-500"
                                                )}
                                            >
                                                <Smile className="w-5.5 h-5.5" />
                                            </button>

                                            {showEmojiPicker && (
                                                <div className="absolute bottom-[calc(100%+24px)] right-0 z-50 shadow-2xl rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                                    <EmojiPicker
                                                        onEmojiClick={onEmojiClick}
                                                        theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                                        lazyLoadEmojis={true}
                                                        searchPlaceholder="Search emojis..."
                                                        width={320}
                                                        height={450}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSendMessage}
                                        disabled={(!messageInput.trim() && !pendingAttachment) || sendingMessage || isUploading}
                                        className="h-14 w-14 flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale flex-shrink-0"
                                    >
                                        {sendingMessage ? (
                                            <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send className="w-6 h-6 translate-x-0.5 -translate-y-0.5 rotate-12" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
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

            {viewingUser && (
                <ProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    userId={viewingUser._id}
                    isOwnProfile={isViewingOwnProfile}
                    onUpdate={() => {
                        // Optionally refresh data
                        const userData = localStorage.getItem('user');
                        if (userData) {
                            setCurrentUser(JSON.parse(userData));
                        }
                    }}
                />
            )}
        </DashboardLayout>
    );
}

const CallLogsList = ({ logs, currentUserId, onCall }: {
    logs: any[],
    currentUserId: string,
    onCall: (userId: string, name: string, type: 'audio' | 'video') => void
}) => {
    const formatCallTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatCallDuration = (seconds?: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-gray-500 dark:text-slate-500">
                <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-slate-800/50 flex items-center justify-center mb-4">
                    <Phone className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">No call history</p>
                <p className="text-sm text-center mt-1 opacity-60">Your audio and video calls will appear here.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {logs.map(log => {
                const isCaller = log.caller._id === currentUserId;
                const otherUser = isCaller ? log.receiver : log.caller;
                const isMissed = log.status === 'missed' || (log.status === 'rejected' && !isCaller);

                return (
                    <div
                        key={log._id}
                        className="group px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-slate-800/20 transition-all border-b border-gray-50 dark:border-slate-800/30 flex items-center gap-4"
                    >
                        {/* Status Icon */}
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                            isMissed ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                            {isCaller ? (
                                <ArrowUpRight className="w-5 h-5 translate-x-0.5 -translate-y-0.5" />
                            ) : (
                                <ArrowDownLeft className={cn(
                                    "w-5 h-5 -translate-x-0.5 translate-y-0.5",
                                    isMissed && "text-red-500"
                                )} />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <h4 className="font-bold text-gray-900 dark:text-white truncate">
                                    {otherUser.name}
                                </h4>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                    {formatCallTime(log.createdAt)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <p className={cn(
                                    "text-xs font-semibold uppercase tracking-wider",
                                    isMissed ? "text-red-500" : "text-gray-500 dark:text-slate-500"
                                )}>
                                    {isMissed ? 'Missed ' : (isCaller ? 'Outgoing ' : 'Incoming ')}
                                    {log.type} Call
                                </p>
                                {log.duration > 0 && (
                                    <>
                                        <div className="w-1 h-1 bg-gray-300 dark:bg-slate-700 rounded-full" />
                                        <p className="text-[10px] font-mono text-gray-400">{formatCallDuration(log.duration)}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => onCall(otherUser._id, otherUser.name, 'audio')}
                                className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                            >
                                <Phone className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onCall(otherUser._id, otherUser.name, 'video')}
                                className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                            >
                                <Video className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// New icons for Call Logs
const ArrowUpRight = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="7" y1="17" x2="17" y2="7"></line>
        <polyline points="7 7 17 7 17 17"></polyline>
    </svg>
);

const ArrowDownLeft = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="17" y1="7" x2="7" y2="17"></line>
        <polyline points="17 17 7 17 7 7"></polyline>
    </svg>
);
