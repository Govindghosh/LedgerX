'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    onlineUsers: [],
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const connectSocket = () => {
            const token = localStorage.getItem('accessToken');

            if (!token) {
                console.log('⚠️ No token found, skipping socket connection');
                setIsConnected(false);
                return;
            }

            // Avoid creating multiple socket instances if one is already connecting/connected
            if (socketRef.current?.connected) {
                console.log('♻️ Socket already connected');
                setIsConnected(true);
                return;
            }

            if (socketRef.current) {
                console.log('♻️ Closing existing socket before reconnecting...');
                socketRef.current.disconnect();
                socketRef.current = null;
            }

            console.log('🔌 Initializing socket connection...');
            const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
            console.log('📡 Connecting to:', socketUrl);

            const socketInstance = io(socketUrl, {
                auth: { token },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 20,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: true,
                forceNew: true // Ensure a new connection
            });

            socketRef.current = socketInstance;
            setSocket(socketInstance);

            // Connection successful
            socketInstance.on('connect', () => {
                console.log('✅ Socket connected successfully! ID:', socketInstance.id);
                setIsConnected(true);
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
            });

            // Disconnection handler
            socketInstance.on('disconnect', (reason) => {
                console.log('❌ Socket disconnected. Reason:', reason);
                setIsConnected(false);

                // Handle different disconnect reasons
                if (reason === 'io server disconnect') {
                    // Server initiated disconnect, reconnect manually
                    console.log('🔄 Server disconnected, attempting manual reconnect...');
                    reconnectTimeoutRef.current = setTimeout(() => {
                        socketInstance.connect();
                    }, 2000);
                }
            });

            // Connection error handler
            socketInstance.on('connect_error', (error) => {
                console.error('🚨 Socket connection error:', error.message);
                console.error('Error details:', {
                    message: error.message,
                    description: error.toString(),
                    auth: error.message.includes('Authentication') || error.message.includes('token')
                });
                setIsConnected(false);
            });

            // Reconnection attempt handler
            socketInstance.on('reconnect_attempt', (attemptNumber) => {
                console.log(`🔄 Reconnection attempt #${attemptNumber}...`);
            });

            // Reconnection failed handler
            socketInstance.on('reconnect_failed', () => {
                console.error('🚨 All reconnection attempts failed');
                setIsConnected(false);
            });

            // Successful reconnection
            socketInstance.on('reconnect', (attemptNumber) => {
                console.log(`✅ Socket reconnected successfully after ${attemptNumber} attempts`);
                setIsConnected(true);
            });

            // Authentication error
            socketInstance.on('error', (error) => {
                console.error('🚨 Socket error:', error);
            });

            // Track online users
            socketInstance.on('user:online', ({ userId }: { userId: string }) => {
                console.log('👤 User came online:', userId);
                setOnlineUsers(prev => [...new Set([...prev, userId])]);
            });

            socketInstance.on('user:offline', ({ userId }: { userId: string }) => {
                console.log('👤 User went offline:', userId);
                setOnlineUsers(prev => prev.filter(id => id !== userId));
            });

            // Get initial list of online users
            socketInstance.on('users:online', ({ userIds }: { userIds: string[] }) => {
                console.log('👥 Received online users list:', userIds.length, 'users');
                setOnlineUsers(userIds);
            });
        };

        connectSocket();

        // Check for token and initialize if needed on a short interval 
        // in case token is set after initial mount
        const tokenCheckInterval = setInterval(() => {
            if (!socketRef.current && localStorage.getItem('accessToken')) {
                console.log('🔄 Token found after mount, initializing socket...');
                connectSocket();
            }
        }, 5000);

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up socket connection...');
            clearInterval(tokenCheckInterval);
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setSocket(null);
            setIsConnected(false);
            setOnlineUsers([]);
        };
    }, []); // Only run once on mount

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
