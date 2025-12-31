'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ShieldAlert, Terminal, Clock, User as UserIcon } from 'lucide-react';
import { cn } from '@/components/ui';

export default function AuditLogsPage() {
    const [logs] = useState([
        { id: '1', action: 'USER_ROLE_UPDATE', admin: 'Govind Ghosh', target: 'John Doe', timestamp: '2025-12-28 14:30', details: 'Changed USER to MANAGER', ip: '192.168.1.1' },
        { id: '2', action: 'WALLET_ADJUSTMENT', admin: 'Govind Ghosh', target: 'Alice Smith', timestamp: '2025-12-28 12:15', details: 'Manual credit: +₹500.00', ip: '192.168.1.1' },
        { id: '3', action: 'LOGIN_FAILURE', admin: 'N/A', target: 'admin@test.com', timestamp: '2025-12-28 10:05', details: 'Invalid password attempt', ip: '45.12.33.2' },
    ]);

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold dark:text-white">Security Audit Logs</h1>
                    </div>
                </div>

                <Card className="p-0 overflow-hidden bg-gray-900 dark:bg-black border-gray-800">
                    <div className="p-4 border-b border-gray-800 flex items-center gap-2 text-gray-400 text-sm">
                        <Terminal className="w-4 h-4" />
                        <span>System Activity Stream</span>
                    </div>

                    <div className="divide-y divide-gray-800 font-mono text-sm">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-gray-800/50 transition-colors group">
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                    <span className="text-blue-400 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> {log.timestamp}
                                    </span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold",
                                        log.action.includes('UPDATE') ? "bg-yellow-900/40 text-yellow-400" :
                                            log.action.includes('FAILURE') ? "bg-red-900/40 text-red-400" : "bg-green-900/40 text-green-400"
                                    )}>
                                        {log.action}
                                    </span>
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <UserIcon className="w-3 h-3" /> Admin: {log.admin}
                                    </span>
                                </div>
                                <div className="text-gray-300">
                                    <span className="text-gray-600 mr-2">➜</span>
                                    {log.details} on <span className="text-blue-400">{log.target}</span>
                                </div>
                                <div className="mt-2 text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    IP Address: {log.ip} | ID: {log.id}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-800/20 text-center">
                        <button className="text-blue-400 hover:underline text-xs">Load older logs...</button>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
