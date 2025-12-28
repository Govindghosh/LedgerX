'use client';

import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Search, Filter, Download } from 'lucide-react';

export default function TransactionsPage() {
    const [transactions] = useState([
        { id: 'TX-12345', date: '2025-12-28', type: 'CREDIT', amount: 5000, balance: 125430, source: 'ADMIN', ref: 'Manual Adjustment' },
        { id: 'TX-12344', date: '2025-12-27', type: 'DEBIT', amount: 1200, balance: 120430, source: 'USER', ref: 'Service Purchase' },
        { id: 'TX-12343', date: '2025-12-27', type: 'CREDIT', amount: 3000, balance: 121630, source: 'SYSTEM', ref: 'Referral Bonus' },
    ]);

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">Transaction History</h1>
                    <Button variant="outline" className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                placeholder="Search by reference ID..."
                                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="gap-2 text-sm py-1.5 h-auto">
                                <Filter className="w-4 h-4" /> Type
                            </Button>
                            <Button variant="outline" className="gap-2 text-sm py-1.5 h-auto">
                                <Filter className="w-4 h-4" /> Date Range
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Transaction ID</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">After Balance</th>
                                    <th className="px-6 py-4">Source</th>
                                    <th className="px-6 py-4">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium">{tx.id}</td>
                                        <td className="px-6 py-4">{tx.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-[10px] font-bold",
                                                tx.type === 'CREDIT' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            )}>
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className={cn("px-6 py-4 font-bold", tx.type === 'CREDIT' ? "text-green-600" : "text-red-600")}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium">₹{tx.balance.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs font-semibold">{tx.source}</td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{tx.ref}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm">
                        <span className="text-gray-500">Showing 1 to 3 of 120 results</span>
                        <div className="flex gap-2">
                            <Button variant="outline" className="px-3 py-1 h-auto" disabled>Previous</Button>
                            <Button variant="outline" className="px-3 py-1 h-auto text-blue-600 border-blue-600">1</Button>
                            <Button variant="outline" className="px-3 py-1 h-auto">2</Button>
                            <Button variant="outline" className="px-3 py-1 h-auto">Next</Button>
                        </div>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}

import { cn } from '@/components/ui';
