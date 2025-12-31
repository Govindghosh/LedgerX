'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Search, Plus, UserCheck, UserX, MoreVertical } from 'lucide-react';
import { cn } from '@/components/ui';

export default function UsersPage() {
    const [users] = useState([
        { id: '1', name: 'Govind Ghosh', email: 'govind@test.com', role: 'ADMIN', status: 'ACTIVE', joined: '2025-01-01' },
        { id: '2', name: 'John Doe', email: 'john@test.com', role: 'USER', status: 'ACTIVE', joined: '2025-12-20' },
        { id: '3', name: 'Jane Smith', email: 'jane@test.com', role: 'MANAGER', status: 'INACTIVE', joined: '2025-12-25' },
    ]);

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">User Management</h1>
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Add User
                    </Button>
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                placeholder="Search users by name or email..."
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Joined Date</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {users.map((user) => (
                                    <tr key={user.id} className="text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {user.name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "flex items-center gap-1.5 text-xs font-medium",
                                                user.status === 'ACTIVE' ? "text-green-600" : "text-gray-400"
                                            )}>
                                                <div className={cn("w-1.5 h-1.5 rounded-full", user.status === 'ACTIVE' ? "bg-green-600" : "bg-gray-400")} />
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{user.joined}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-blue-600">
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-red-600">
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
