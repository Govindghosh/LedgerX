'use client';

import React from 'react';
import { Card, Button } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings as SettingsIcon, Bell, Shield, Key, Database, Globe } from 'lucide-react';

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">Account Settings</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar Nav */}
                    <Card className="lg:col-span-1 p-2 h-fit space-y-1">
                        {[
                            { icon: SettingsIcon, label: 'General', active: true },
                            { icon: Shield, label: 'Security' },
                            { icon: Bell, label: 'Notifications' },
                            { icon: Globe, label: 'System' },
                            { icon: Database, label: 'Logs' },
                        ].map((item) => (
                            <button
                                key={item.label}
                                className={cn(
                                    "flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    item.active ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </button>
                        ))}
                    </Card>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card>
                            <h3 className="text-lg font-bold mb-6 dark:text-white">Profile Information</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Display Name</label>
                                        <input className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" defaultValue="Govind Ghosh" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Email Address</label>
                                        <input className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" defaultValue="admin@test.com" disabled />
                                    </div>
                                </div>
                                <Button>Save Profile</Button>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="text-lg font-bold mb-6 dark:text-white">Password & Security</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <div className="font-medium dark:text-white text-sm">Two-Factor Authentication</div>
                                            <div className="text-xs text-gray-500">Add an extra layer of security to your account.</div>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="text-xs h-8">Enable</Button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-gray-500" />
                                        <div>
                                            <div className="font-medium dark:text-white text-sm">Login Sessions</div>
                                            <div className="text-xs text-gray-500">Currently active on 2 devices.</div>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="text-xs h-8">Manage</Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

import { cn } from '@/components/ui';
