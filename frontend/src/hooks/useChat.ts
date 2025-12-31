'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/api';

interface User {
    _id: string;
    name: string;
    email: string;
}

interface Message {
    _id: string;
    roomId: string;
    senderId: User | string;
    content: string;
    type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
    status: 'SENT' | 'DELIVERED' | 'READ';
    attachments?: { url: string; name: string; type: string; size: number }[];
    replyTo?: Message;
    readBy: { userId: string; readAt: string }[];
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ChatRoom {
    _id: string;
    name?: string;
    type: 'DIRECT' | 'GROUP';
    participants: User[];
    admins?: User[];
    lastMessage?: Message;
    lastMessageAt?: string;
    createdAt: string;
}

interface UseChatReturn {
    rooms: ChatRoom[];
    activeRoom: ChatRoom | null;
    messages: Message[];
    loading: boolean;
    sendingMessage: boolean;
    error: string | null;
    typingUsers: string[];
    unreadCounts: Record<string, number>;
    setActiveRoom: (room: ChatRoom | null) => void;
    sendMessage: (content: string, type?: 'TEXT' | 'IMAGE' | 'FILE') => Promise<void>;
    createDirectChat: (participantId: string) => Promise<ChatRoom>;
    createGroupChat: (name: string, participantIds: string[], description?: string) => Promise<ChatRoom>;
    loadMoreMessages: () => Promise<void>;
    markAsRead: () => Promise<void>;
    setTyping: (isTyping: boolean) => void;
    fetchRooms: () => Promise<void>;
    fetchAvailableUsers: () => Promise<User[]>;
}

export function useChat(): UseChatReturn {
    const { socket, isConnected } = useSocket();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch all rooms
    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true);
            const [roomsRes, unreadRes] = await Promise.all([
                api.get('/chat/rooms'),
                api.get('/chat/unread'),
            ]);
            setRooms(roomsRes.data.data || []);

            const counts: Record<string, number> = {};
            (unreadRes.data.data || []).forEach((item: { roomId: string; count: number }) => {
                counts[item.roomId] = item.count;
            });
            setUnreadCounts(counts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch room messages
    const fetchMessages = useCallback(async (roomId: string, pageNum: number = 1) => {
        try {
            setLoading(true);
            const res = await api.get(`/chat/rooms/${roomId}/messages?page=${pageNum}&limit=50`);
            const newMessages = res.data.data || [];

            if (pageNum === 1) {
                setMessages(newMessages);
            } else {
                setMessages(prev => [...newMessages, ...prev]);
            }

            setHasMore(res.data.pagination?.page < res.data.pagination?.pages);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Set active room and load messages
    const handleSetActiveRoom = useCallback(async (room: ChatRoom | null) => {
        if (activeRoom && socket) {
            socket.emit('chat:leave', activeRoom._id);
        }

        setActiveRoom(room);
        setMessages([]);
        setPage(1);
        setHasMore(true);
        setTypingUsers([]);

        if (room && socket) {
            socket.emit('chat:join', room._id);
            await fetchMessages(room._id, 1);

            // Clear unread count
            setUnreadCounts(prev => ({ ...prev, [room._id]: 0 }));
        }
    }, [activeRoom, socket, fetchMessages]);

    // Load more messages (pagination)
    const loadMoreMessages = useCallback(async () => {
        if (!activeRoom || !hasMore || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        await fetchMessages(activeRoom._id, nextPage);
    }, [activeRoom, hasMore, loading, page, fetchMessages]);

    // Send message
    const sendMessage = useCallback(async (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT') => {
        if (!activeRoom || !content.trim()) return;

        try {
            setSendingMessage(true);
            const res = await api.post(`/chat/rooms/${activeRoom._id}/messages`, {
                content,
                type
            });
            // Message will be added via socket event
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSendingMessage(false);
        }
    }, [activeRoom]);

    // Create direct chat
    const createDirectChat = useCallback(async (participantId: string): Promise<ChatRoom> => {
        const res = await api.post('/chat/direct', { participantId });
        const newRoom = res.data.data;
        setRooms(prev => {
            const exists = prev.find(r => r._id === newRoom._id);
            if (exists) return prev;
            return [newRoom, ...prev];
        });
        return newRoom;
    }, []);

    // Create group chat
    const createGroupChat = useCallback(async (
        name: string,
        participantIds: string[],
        description?: string
    ): Promise<ChatRoom> => {
        const res = await api.post('/chat/group', { name, participantIds, description });
        const newRoom = res.data.data;
        setRooms(prev => [newRoom, ...prev]);
        return newRoom;
    }, []);

    // Mark messages as read
    const markAsRead = useCallback(async () => {
        if (!activeRoom) return;
        try {
            await api.patch(`/chat/rooms/${activeRoom._id}/read`);
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, [activeRoom]);

    // Set typing indicator
    const setTyping = useCallback((isTyping: boolean) => {
        if (!activeRoom || !socket) return;

        socket.emit('chat:typing', { roomId: activeRoom._id, isTyping });

        if (isTyping) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('chat:typing', { roomId: activeRoom._id, isTyping: false });
            }, 3000);
        }
    }, [activeRoom, socket]);

    // Fetch available users for new chat
    const fetchAvailableUsers = useCallback(async (): Promise<User[]> => {
        const res = await api.get('/chat/users');
        return res.data.data || [];
    }, []);

    // Socket event listeners
    useEffect(() => {
        if (!socket || !isConnected) return;

        // New message handler
        const handleNewMessage = ({ message, roomId }: { message: Message; roomId: string }) => {
            if (activeRoom?._id === roomId) {
                setMessages(prev => [...prev, message]);
            } else {
                // Increment unread count for other rooms
                setUnreadCounts(prev => ({
                    ...prev,
                    [roomId]: (prev[roomId] || 0) + 1,
                }));
            }

            // Update room's last message
            setRooms(prev => prev.map(room => {
                if (room._id === roomId) {
                    return { ...room, lastMessage: message, lastMessageAt: message.createdAt };
                }
                return room;
            }).sort((a, b) => {
                const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return bTime - aTime;
            }));
        };

        // Message edited handler
        const handleMessageEdited = ({ messageId, content, editedAt }: {
            messageId: string;
            content: string;
            editedAt: string;
        }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId
                    ? { ...msg, content, isEdited: true, editedAt }
                    : msg
            ));
        };

        // Message deleted handler
        const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
            setMessages(prev => prev.map(msg =>
                msg._id === messageId
                    ? { ...msg, isDeleted: true, content: 'This message was deleted' }
                    : msg
            ));
        };

        // Typing indicator handler
        const handleTyping = ({ oderId, isTyping }: { oderId: string; isTyping: boolean }) => {
            setTypingUsers(prev => {
                if (isTyping && !prev.includes(oderId)) {
                    return [...prev, oderId];
                } else if (!isTyping) {
                    return prev.filter(id => id !== oderId);
                }
                return prev;
            });
        };

        // Messages read handler
        const handleMessagesRead = ({ roomId, readBy }: { roomId: string; readBy: string }) => {
            if (activeRoom?._id === roomId) {
                setMessages(prev => prev.map(msg => ({
                    ...msg,
                    readBy: [...msg.readBy, { userId: readBy, readAt: new Date().toISOString() }],
                })));
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('message:edited', handleMessageEdited);
        socket.on('message:deleted', handleMessageDeleted);
        socket.on('chat:typing', handleTyping);
        socket.on('messages:read', handleMessagesRead);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('message:edited', handleMessageEdited);
            socket.off('message:deleted', handleMessageDeleted);
            socket.off('chat:typing', handleTyping);
            socket.off('messages:read', handleMessagesRead);
        };
    }, [socket, isConnected, activeRoom]);

    // Initial fetch
    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    return {
        rooms,
        activeRoom,
        messages,
        loading,
        sendingMessage,
        error,
        typingUsers,
        unreadCounts,
        setActiveRoom: handleSetActiveRoom,
        sendMessage,
        createDirectChat,
        createGroupChat,
        loadMoreMessages,
        markAsRead,
        setTyping,
        fetchRooms,
        fetchAvailableUsers,
    };
}
