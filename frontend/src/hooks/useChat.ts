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
    pinnedMessages?: Message[];
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
    sendMessage: (content: string, type?: 'TEXT' | 'IMAGE' | 'FILE', attachments?: Message['attachments'], replyToId?: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    uploadFile: (file: File) => Promise<any>;
    createDirectChat: (participantId: string) => Promise<ChatRoom>;
    createGroupChat: (name: string, participantIds: string[], description?: string) => Promise<ChatRoom>;
    forwardMessage: (messageId: string, targetRoomIds: string[]) => Promise<void>;
    pinMessage: (messageId: string) => Promise<void>;
    unpinMessage: (messageId: string) => Promise<void>;
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

        if (room) {
            // Join socket room if connected
            if (socket) {
                socket.emit('chat:join', room._id);
            }

            // Always fetch messages, regardless of socket connection
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
    const sendMessage = useCallback(async (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', attachments?: Message['attachments'], replyToId?: string) => {
        if (!activeRoom || (!content.trim() && !attachments)) return;

        try {
            setSendingMessage(true);
            const res = await api.post(`/chat/rooms/${activeRoom._id}/messages`, {
                content,
                type,
                attachments,
                replyToId
            });

            // Add message to state immediately (optimistic update)
            const newMessage = res.data.data;
            if (newMessage) {
                setMessages(prev => {
                    // Check if message already exists (from socket event)
                    if (prev.find(m => m._id === newMessage._id)) {
                        return prev;
                    }
                    return [...prev, newMessage];
                });

                // Update room's last message
                setRooms(prevRooms => prevRooms.map(room => {
                    if (room._id === activeRoom._id) {
                        return { ...room, lastMessage: newMessage, lastMessageAt: newMessage.createdAt };
                    }
                    return room;
                }));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSendingMessage(false);
        }
    }, [activeRoom]);

    // Delete message
    const deleteMessage = useCallback(async (messageId: string) => {
        try {
            await api.delete(`/chat/messages/${messageId}`);
            // State update handled by socket event 'message:deleted'
        } catch (err: any) {
            setError(err.message);
        }
    }, []);

    // Upload file
    const uploadFile = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/chat/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return res.data.data;
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    }, []);

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

    // Pin message
    const pinMessage = useCallback(async (messageId: string) => {
        if (!activeRoom) return;
        try {
            await api.post(`/chat/rooms/${activeRoom._id}/messages/${messageId}/pin`);
        } catch (err: any) {
            setError(err.message);
        }
    }, [activeRoom]);

    // Unpin message
    const unpinMessage = useCallback(async (messageId: string) => {
        if (!activeRoom) return;
        try {
            await api.delete(`/chat/rooms/${activeRoom._id}/messages/${messageId}/pin`);
        } catch (err: any) {
            setError(err.message);
        }
    }, [activeRoom]);

    // Forward message
    const forwardMessage = useCallback(async (messageId: string, targetRoomIds: string[]) => {
        try {
            await api.post(`/chat/messages/${messageId}/forward`, { targetRoomIds });
            await fetchRooms();
        } catch (err: any) {
            setError(err.message);
        }
    }, [fetchRooms]);

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
        const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
            setTypingUsers(prev => {
                if (isTyping && !prev.includes(userId)) {
                    return [...prev, userId];
                } else if (!isTyping) {
                    return prev.filter(id => id !== userId);
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

        // Pin update handler
        const handlePinUpdate = ({ roomId, pinnedMessages }: { roomId: string; pinnedMessages: Message[] }) => {
            if (activeRoom?._id === roomId) {
                setActiveRoom(prev => prev ? { ...prev, pinnedMessages } : null);
            }
        };

        socket.on('message:new', handleNewMessage);
        socket.on('message:edited', handleMessageEdited);
        socket.on('message:deleted', handleMessageDeleted);
        socket.on('chat:typing', handleTyping);
        socket.on('messages:read', handleMessagesRead);
        socket.on('room:pin_update', handlePinUpdate);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('message:edited', handleMessageEdited);
            socket.off('message:deleted', handleMessageDeleted);
            socket.off('chat:typing', handleTyping);
            socket.off('messages:read', handleMessagesRead);
            socket.off('room:pin_update', handlePinUpdate);
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
        deleteMessage,
        uploadFile,
        createDirectChat,
        createGroupChat,
        loadMoreMessages,
        markAsRead,
        setTyping,
        fetchRooms,
        fetchAvailableUsers,
        forwardMessage,
        pinMessage,
        unpinMessage,
    };
}
