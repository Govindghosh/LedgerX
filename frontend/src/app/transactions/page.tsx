'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Search, Download, Check, X, Clock, Eye, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/components/ui';

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED'>('ALL');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUserRole(JSON.parse(storedUser).role);
        }
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const resp = await api.get('/transactions');
            setTransactions(resp.data.data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (transaction: any, action: 'APPROVE' | 'REJECT') => {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this ${transaction.type === 'CREDIT' ? 'deposit' : 'withdrawal'}?`)) return;

        try {
            // Use different endpoint based on transaction type
            const endpoint = transaction.type === 'CREDIT'
                ? '/wallet/admin/deposit-action'
                : '/wallet/admin/withdrawal-action';

            await api.post(endpoint, { transactionId: transaction._id, action });
            alert(`${transaction.type === 'CREDIT' ? 'Deposit' : 'Withdrawal'} ${action.toLowerCase()}d successfully`);
            fetchTransactions();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Action failed');
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filter !== 'ALL' && tx.type !== filter) return false;
        if (statusFilter !== 'ALL' && tx.status !== statusFilter) return false;
        return true;
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

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
                            <select
                                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as any)}
                            >
                                <option value="ALL">All Types</option>
                                <option value="CREDIT">Deposits</option>
                                <option value="DEBIT">Withdrawals</option>
                            </select>
                            <select
                                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white outline-none"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Transaction ID</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Description</th>
                                    {(userRole === 'ADMIN' || userRole === 'MANAGER') && <th className="px-6 py-4 text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-500">Loading transactions...</td></tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-500">No transactions found</td></tr>
                                ) : filteredTransactions.map((tx) => (
                                    <tr key={tx._id} className="text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-medium text-xs">{tx.referenceId}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                                    {tx.userId?.name?.[0] || '?'}
                                                </div>
                                                <span className="text-xs">{tx.userId?.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                                tx.status === 'COMPLETED' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    tx.status === 'PENDING' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse" :
                                                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            )}>
                                                {tx.status === 'PENDING' && <Clock className="w-3 h-3" />}
                                                {tx.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold",
                                                tx.type === 'CREDIT' ? "text-green-600 bg-green-50 dark:bg-green-600/10" : "text-red-600 bg-red-50 dark:bg-red-600/10"
                                            )}>
                                                {tx.type === 'CREDIT' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                                {tx.type === 'CREDIT' ? 'DEPOSIT' : 'WITHDRAW'}
                                            </span>
                                        </td>
                                        <td className={cn("px-6 py-4 font-bold", tx.type === 'CREDIT' ? "text-green-600" : "text-red-600")}>
                                            {tx.type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {formatDate(tx.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-gray-500 truncate max-w-[200px]">{tx.description}</td>
                                        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                                            <td className="px-6 py-4">
                                                {tx.status === 'PENDING' ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        {tx.receiptUrl && (
                                                            <a
                                                                href={tx.receiptUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                                                title="View Receipt"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => handleAction(tx, 'APPROVE')}
                                                            className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(tx, 'REJECT')}
                                                            className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-all"
                                                            title="Reject"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-xs text-gray-400 italic">—</div>
                                                )}
                                            </td>
                                        )}
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
