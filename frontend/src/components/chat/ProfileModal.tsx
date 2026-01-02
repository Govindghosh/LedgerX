'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, cn } from '../ui';
import { User, Mail, Shield, Calendar, Phone, FileText, Camera, Loader2, Edit2, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    isOwnProfile?: boolean;
    onUpdate?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen,
    onClose,
    userId,
    isOwnProfile,
    onUpdate
}) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        phoneNumber: ''
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen && (userId || isOwnProfile)) {
            fetchProfile();
        }
    }, [isOpen, userId, isOwnProfile]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const url = isOwnProfile ? '/profile/me' : `/profile/${userId}`;
            console.log('[ProfileModal] Fetching profile from:', url);
            const res = await api.get(url);
            console.log('[ProfileModal] Profile data received:', res.data.data);
            setUser(res.data.data);
            setFormData({
                name: res.data.data.name || '',
                bio: res.data.data.bio || '',
                phoneNumber: res.data.data.phoneNumber || ''
            });
        } catch (err: any) {
            console.error('[ProfileModal] Failed to fetch profile:', err);
            console.error('[ProfileModal] Error response:', err.response?.data);

            if (err.response?.status === 404) {
                toast.error('User profile not found. Please try logging in again.');
            } else if (err.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = '/login';
                }, 2000);
            } else {
                toast.error('Failed to load profile. Please try again.');
            }
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            setUpdating(true);
            const res = await api.patch('/profile/me', formData);
            setUser(res.data.data);
            setEditing(false);
            toast.success('Profile updated successfully');
            if (onUpdate) onUpdate();

            // Update local storage if own profile
            if (isOwnProfile) {
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...currentUser, ...res.data.data }));
            }
        } catch (err) {
            toast.error('Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            setUploading(true);
            const res = await api.post('/profile/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUser(res.data.data);
            toast.success('Profile picture updated');
            if (onUpdate) onUpdate();
        } catch (err) {
            toast.error('Failed to upload picture');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="User Profile">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm text-gray-500">Loading profile...</p>
                </div>
            </Modal>
        );
    }

    if (!user) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isOwnProfile ? "My Profile" : "User Profile"}
            className="sm:max-w-lg"
        >
            <div className="space-y-8">
                {/* Header / Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl overflow-hidden">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0).toUpperCase()
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>

                        {isOwnProfile && (
                            <label className="absolute -bottom-1 -right-1 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform">
                                <Camera className="w-4 h-4 text-blue-500" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            </label>
                        )}
                    </div>

                    <div className="text-center">
                        {editing ? (
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="text-xl font-bold bg-gray-100 dark:bg-slate-800 border-none rounded-lg px-2 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        ) : (
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{user.name}</h3>
                        )}
                        <p className="text-sm font-bold text-blue-500 uppercase tracking-widest mt-1 flex items-center justify-center gap-2">
                            <Shield className="w-3 h-3" />
                            {user.role}
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid gap-4 bg-gray-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                            {editing ? (
                                <input
                                    type="text"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 dark:text-white focus:ring-0 outline-none"
                                    placeholder="Add phone number..."
                                />
                            ) : (
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {user.phoneNumber || 'Not provided'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined Since</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bio Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Biography</h4>
                    </div>
                    {editing ? (
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full min-h-[100px] bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            placeholder="Tell us about yourself..."
                        />
                    ) : (
                        <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800/50 rounded-2xl p-4 min-h-[80px]">
                            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed italic">
                                {user.bio || (isOwnProfile ? "You haven't added a bio yet. Click edit to add one!" : "No bio provided.")}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                {isOwnProfile && (
                    <div className="flex gap-3 pt-4">
                        {editing ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-2xl h-12 font-bold"
                                    onClick={() => setEditing(false)}
                                    disabled={updating}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 rounded-2xl h-12 font-bold shadow-lg shadow-blue-500/20"
                                    onClick={handleUpdate}
                                    disabled={updating}
                                >
                                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full rounded-2xl h-12 font-bold border-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-500 transition-all"
                                onClick={() => setEditing(true)}
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};
