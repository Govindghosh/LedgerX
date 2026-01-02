'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { toast } from 'sonner';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallContextType {
    isCalling: boolean;
    callType: 'audio' | 'video' | null;
    callStatus: 'idle' | 'outgoing' | 'incoming' | 'connected';
    activeCallUser: { id: string; name: string } | null;
    initiateCall: (toUserId: string, name: string, type: 'audio' | 'video', roomId: string, callerName?: string) => void;
    acceptCall: () => void;
    rejectCall: () => void;
    endCall: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within CallProvider');
    return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { socket, isConnected } = useSocket();
    const [callStatus, setCallStatus] = useState<'idle' | 'outgoing' | 'incoming' | 'connected'>('idle');
    const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
    const [activeCallUser, setActiveCallUser] = useState<{ id: string; name: string } | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
    const incomingToastId = useRef<string | number | null>(null);

    const cleanup = useCallback(() => {
        console.log('🧹 Cleaning up call...');
        if (incomingToastId.current) {
            toast.dismiss(incomingToastId.current);
            incomingToastId.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopping track: ${track.kind}`);
            });
        }
        if (peerConnection.current) {
            peerConnection.current.onicecandidate = null;
            peerConnection.current.ontrack = null;
            peerConnection.current.oniceconnectionstatechange = null;
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setCallStatus('idle');
        setCallType(null);
        setActiveCallUser(null);
        localStreamRef.current = null;
        iceCandidateQueue.current = [];
    }, []);

    const createPeerConnection = useCallback((toUserId: string) => {
        console.log('🏗️ Creating RTCPeerConnection for:', toUserId);
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun.services.mozilla.com' },
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 Sending ICE candidate');
                socket?.emit('call:candidate', { toUserId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            console.log('📺 Received remote track:', event.track.kind);
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            } else {
                console.log('📺 No stream in event, creating new MediaStream from track');
                const newStream = new MediaStream([event.track]);
                setRemoteStream(newStream);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('🌐 ICE Connection State:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                console.log('🌐 Connection lost, cleaning up...');
                cleanup();
            }
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                console.log(`📤 Adding local track to PC: ${track.kind}`);
                pc.addTrack(track, localStreamRef.current!);
            });
        } else {
            console.warn('⚠️ No local stream available when creating PeerConnection');
        }

        peerConnection.current = pc;
        return pc;
    }, [socket, cleanup]);

    const processIceQueue = useCallback(async () => {
        if (!peerConnection.current || !peerConnection.current.remoteDescription) return;

        console.log(`📥 Processing ${iceCandidateQueue.current.length} queued ICE candidates`);
        while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            if (candidate) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('❌ Error adding queued ICE candidate', e);
                }
            }
        }
    }, []);

    const callStatusRef = useRef(callStatus);
    useEffect(() => {
        callStatusRef.current = callStatus;
    }, [callStatus]);

    const activeCallUserRef = useRef(activeCallUser);
    useEffect(() => {
        activeCallUserRef.current = activeCallUser;
    }, [activeCallUser]);

    // Handle Socket Events
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleIncomingCall = ({ callerId, callerName, type, roomId }: any) => {
            console.log('📞 Incoming call from:', callerName, type);
            if (callStatusRef.current !== 'idle') {
                console.log('🚫 Already in a call, sending busy...');
                socket.emit('call:respond', { toUserId: callerId, response: 'busy' });
                return;
            }
            setActiveCallUser({ id: callerId, name: callerName || 'User' });
            setCallType(type);
            setCallStatus('incoming');

            const tId = toast.custom((t) => (
                <div className="w-[360px] bg-slate-900 border border-white/20 p-5 rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.8)] flex flex-col gap-6 animate-in slide-in-from-top-10 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-2xl relative shadow-lg">
                                {callerName?.charAt(0) || 'U'}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Incoming Transaction</p>
                            <h4 className="font-black text-white text-xl truncate tracking-tight">{callerName || 'Unknown User'}</h4>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                                {type === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                                Secure {type} Call
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { toast.dismiss(t); handleRejectCall(); }}
                            className="flex-1 h-14 bg-slate-800 hover:bg-red-600 text-white border border-white/10 rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 group"
                        >
                            <PhoneOff className="w-4 h-4 transition-transform group-hover:scale-110" />
                            Decline
                        </button>
                        <button
                            onClick={() => { toast.dismiss(t); handleAcceptCall(callerId, type); }}
                            className="flex-1 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/40 group"
                        >
                            {type === 'video' ? <Video className="w-4 h-4 transition-transform group-hover:scale-110" /> : <Phone className="w-4 h-4 transition-transform group-hover:scale-110" />}
                            Accept
                        </button>
                    </div>
                </div>
            ), { duration: 30000, position: 'top-center' });
            incomingToastId.current = tId;
        };

        const handleCallResponse = async ({ fromUserId, response }: any) => {
            console.log('📞 Call response received:', response);
            if (response === 'accepted') {
                setCallStatus('connected');
                // Initiate WebRTC offer if we are the caller
                const pc = createPeerConnection(fromUserId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                console.log('📡 Sending offer to:', fromUserId);
                socket.emit('call:signal', { toUserId: fromUserId, signal: pc.localDescription });
            } else {
                toast.error(`Call ${response}`);
                cleanup();
            }
        };

        const handleCallSignal = async ({ fromUserId, signal }: any) => {
            console.log('📡 Signal received type:', signal.type, 'from:', fromUserId);

            if (signal.type === 'offer') {
                const pc = createPeerConnection(fromUserId);
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                console.log('📡 Sending answer to:', fromUserId);
                socket.emit('call:signal', { toUserId: fromUserId, signal: pc.localDescription });
                await processIceQueue();
            } else if (signal.type === 'answer') {
                if (peerConnection.current) {
                    console.log('📡 Applying answer...');
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                    await processIceQueue();
                } else {
                    console.error('❌ Received answer but no peer connection exists!');
                }
            }
        };

        const handleCallCandidate = async ({ fromUserId, candidate }: any) => {
            console.log('📡 ICE Candidate received from:', fromUserId);
            if (peerConnection.current && peerConnection.current.remoteDescription) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('❌ Error adding ICE candidate', e);
                }
            } else {
                console.log('⏳ Queuing ICE candidate');
                iceCandidateQueue.current.push(candidate);
            }
        };

        const handleCallEnd = () => {
            console.log('📞 Call ended by remote');
            toast.info('Call ended');
            cleanup();
        };

        socket.on('call:incoming', handleIncomingCall);
        socket.on('call:response', handleCallResponse);
        socket.on('call:signal', handleCallSignal);
        socket.on('call:candidate', handleCallCandidate);
        socket.on('call:end', handleCallEnd);

        return () => {
            socket.off('call:incoming', handleIncomingCall);
            socket.off('call:response', handleCallResponse);
            socket.off('call:signal', handleCallSignal);
            socket.off('call:candidate', handleCallCandidate);
            socket.off('call:end', handleCallEnd);
        };
    }, [socket, isConnected, cleanup, createPeerConnection, processIceQueue]);

    const initiateCall = async (toUserId: string, name: string, type: 'audio' | 'video', roomId: string, callerName?: string) => {
        try {
            console.log(`🚀 Initiating ${type} call to ${name}`);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setActiveCallUser({ id: toUserId, name });
            setCallType(type);
            setCallStatus('outgoing');
            socket?.emit('call:initiate', { toUserId, type, roomId, callerName });
        } catch (err) {
            toast.error('Could not access camera/microphone');
            console.error(err);
        }
    };

    const handleAcceptCall = async (callerId: string, type: 'audio' | 'video') => {
        try {
            console.log('✅ Accepting call...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setCallStatus('connected');
            socket?.emit('call:respond', { toUserId: callerId, response: 'accepted' });
        } catch (err) {
            toast.error('Could not access camera/microphone');
            handleRejectCall();
        }
    };

    const handleRejectCall = () => {
        if (activeCallUser) {
            socket?.emit('call:respond', { toUserId: activeCallUser.id, response: 'rejected' });
        }
        cleanup();
    };

    const endCall = () => {
        if (activeCallUser) {
            socket?.emit('call:end', { toUserId: activeCallUser.id });
        }
        cleanup();
    };

    // Connection watchdog: reset if stuck in connecting phase
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if ((callStatus === 'outgoing' || callStatus === 'connected') && !remoteStream) {
            timeout = setTimeout(() => {
                console.warn('🕒 Connection timeout: remote stream not received within 45s');
                toast.error('Connection timed out. Please try again.');
                cleanup();
            }, 45000);
        }
        return () => clearTimeout(timeout);
    }, [callStatus, remoteStream, cleanup]);

    return (
        <CallContext.Provider value={{
            isCalling: callStatus !== 'idle',
            callType,
            callStatus,
            activeCallUser,
            initiateCall,
            acceptCall: () => {
                if (activeCallUser && callStatus === 'incoming') {
                    handleAcceptCall(activeCallUser.id, callType || 'audio');
                }
            },
            rejectCall: handleRejectCall,
            endCall,
            localStream,
            remoteStream
        }}>
            {children}
            {callStatus !== 'idle' && <CallOverlay />}
        </CallContext.Provider>
    );
};

const CallOverlay: React.FC = () => {
    const { callStatus, callType, activeCallUser, endCall, localStream, remoteStream } = useCall();
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callStatus === 'connected') {
            interval = setInterval(() => setDuration(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const toggleMic = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
            {/* Immersive Background Blur */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30 blur-[100px] opacity-50 animate-pulse" />
                {callType === 'audio' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[150%] h-[150%] bg-blue-500/10 rounded-full blur-[120px] animate-ping duration-3000" />
                    </div>
                )}
            </div>

            <div className="relative z-10 w-full h-full flex flex-col md:p-8">
                {/* Main Content Area */}
                <div className="flex-1 relative bg-slate-900 md:rounded-[40px] border border-white/10 shadow-2xl flex items-center justify-center">

                    {/* Remote Video/Avatar */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {callType === 'video' ? (
                            remoteStream ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-5xl font-black text-white shadow-2xl animate-pulse">
                                        {activeCallUser?.name?.charAt(0) || 'U'}
                                    </div>
                                    <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Establishing Peer Link...</p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-ping" />
                                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 border-4 border-white/10 flex items-center justify-center text-7xl font-black text-white shadow-[0_0_80px_rgba(59,130,246,0.5)] relative">
                                        {activeCallUser?.name?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <h2 className="mt-12 text-4xl font-black text-white tracking-tight">{activeCallUser?.name}</h2>
                                {callStatus === 'connected' ? (
                                    <div className="mt-4 px-4 py-1.5 bg-blue-500/20 border border-blue-500/20 rounded-full flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-blue-400 font-mono font-bold text-sm tracking-widest">{formatDuration(duration)}</span>
                                    </div>
                                ) : (
                                    <p className="mt-4 text-blue-400 font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse">
                                        {callStatus === 'outgoing' ? 'Connecting Secure Channel...' : 'Incoming Transmission...'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Local Stream Overlay (Floating) */}
                    {localStream && (
                        <div className="absolute top-6 right-6 w-32 md:w-56 aspect-video bg-black rounded-2xl md:rounded-[24px] overflow-hidden border border-white/20 shadow-2xl z-20 group transition-all duration-300 hover:scale-105">
                            {callType === 'video' ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover mirror"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white/20">
                                    <Mic className="w-8 h-8" />
                                </div>
                            )}
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-md text-[8px] font-bold text-white uppercase tracking-widest">You</div>
                        </div>
                    )}

                    {/* Top Stats Overlay */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
                        <div className="px-4 py-2 bg-black/20 blur-background border border-white/10 rounded-full flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">AES-256 Encrypted Connection</span>
                        </div>
                    </div>
                </div>

                {/* High-Visibility Control Bar */}
                <div className="h-32 md:h-48 flex items-center justify-center gap-4 md:gap-10 px-8 bg-slate-950 border-t border-white/10 z-30">
                    <button
                        onClick={toggleMic}
                        className={cn(
                            "group relative p-5 rounded-3xl transition-all duration-300 active:scale-95",
                            isMuted ? "bg-red-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
                        )}
                    >
                        {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg font-bold">
                            {isMuted ? 'Unmute' : 'Mute'}
                        </span>
                    </button>

                    {callType === 'video' && (
                        <button
                            onClick={toggleVideo}
                            className={cn(
                                "group relative p-5 rounded-3xl transition-all duration-300 active:scale-95",
                                isVideoOff ? "bg-red-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
                            )}
                        >
                            {isVideoOff ? <VideoOff className="w-7 h-7" /> : <Video className="w-7 h-7" />}
                            <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg font-bold">
                                {isVideoOff ? 'Cam On' : 'Cam Off'}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={endCall}
                        className="p-7 md:p-8 rounded-[38px] bg-red-600 hover:bg-red-500 text-white transition-all duration-300 active:scale-90 shadow-2xl border border-red-400/20 group"
                    >
                        <PhoneOff className="w-10 h-10 transition-transform group-hover:rotate-12" />
                    </button>

                    <button className="hidden md:flex group relative p-5 rounded-3xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition-all active:scale-95">
                        <Settings className="w-7 h-7" />
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg font-bold">Settings</span>
                    </button>
                </div>
            </div>

            <style jsx>{`
                .blur-background {
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
                .mirror { transform: rotateY(180deg); }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 5s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};
