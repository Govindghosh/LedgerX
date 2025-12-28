'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { Wallet, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        balance: 0,
        credit: 0,
        debit: 0,
        users: 0
    });

    useEffect(() => {
        // Fetch dashboard stats (mocking for now or hitting API if ready)
        setStats({
            balance: 125430,
            credit: 8540,
            debit: 3210,
            users: 128
        });
    }, []);

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <Card className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", color)}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold dark:text-white">₹{value.toLocaleString()}</h3>
            </div>
        </Card>
    );

    return (
        <DashboardLayout>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Balance" value={stats.balance} icon={Wallet} color="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" />
                <StatCard title="Daily Credit" value={stats.credit} icon={ArrowUpRight} color="bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" />
                <StatCard title="Daily Debit" value={stats.debit} icon={ArrowDownRight} color="bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" />
                <StatCard title="Active Users" value={stats.users} icon={Users} color="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 min-h-[400px]">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Net Revenue (30 Days)</h3>
                    <div className="h-[320px] flex items-center justify-center text-gray-500">
                        Chart visualization will be here
                    </div>
                </Card>

                <Card className="min-h-[400px]">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Recent Transactions</h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium dark:text-white">TRX-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
                                    <p className="text-xs text-gray-500">28 Dec 2025, 02:30 PM</p>
                                </div>
                                <div className={i % 2 === 0 ? "text-green-600" : "text-red-600"}>
                                    {i % 2 === 0 ? "+" : "-"}₹{Math.floor(Math.random() * 5000)}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}

// Utility imported in Card component file but needed here too for local cn usage
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
