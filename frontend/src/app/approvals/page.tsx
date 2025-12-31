'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, cn } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Shield,
    Check,
    X,
    Clock,
    ArrowUpRight,
    ArrowDownLeft,
    Building2,
    Eye,
    AlertTriangle,
    RefreshCw,
    FileText
} from 'lucide-react';
import api from '@/lib/api';

type TabType = 'deposits' | 'withdrawals' | 'beneficiaries';

interface Transaction {
    _id: string;
    userId: { _id: string; name: string; email: string } | null;
    amount: number;
    type: 'CREDIT' | 'DEBIT';
    referenceId: string;
    description: string;
    receiptUrl?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    createdAt: string;
}

interface Beneficiary {
    _id: string;
    userId: { _id: string; name: string; email: string } | null;
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: string;
    nickname?: string;
    proofUrl?: string;
    proofType?: 'PASSBOOK' | 'CHECKBOOK' | 'UPI_SCREENSHOT' | 'BANK_STATEMENT';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export default function ApprovalsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('deposits');
    const [deposits, setDeposits] = useState<Transaction[]>([]);
    const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [rejectModal, setRejectModal] = useState<{ type: TabType; id: string } | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [receiptModal, setReceiptModal] = useState<string | null>(null);

    useEffect(() => {
        fetchAllPending();
    }, []);

    const fetchAllPending = async () => {
        setLoading(true);
        try {
            const [depositsRes, withdrawalsRes, beneficiariesRes] = await Promise.all([
                api.get('/wallet/admin/pending?type=CREDIT'),
                api.get('/wallet/admin/pending?type=DEBIT'),
                api.get('/beneficiaries/admin/pending'),
            ]);
            setDeposits(depositsRes.data.data || []);
            setWithdrawals(withdrawalsRes.data.data || []);
            setBeneficiaries(beneficiariesRes.data.data || []);
        } catch (error) {
            console.error('Failed to fetch pending items', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (type: TabType, id: string) => {
        setActionLoading(id);
        try {
            if (type === 'deposits') {
                await api.post('/wallet/admin/deposit-action', { transactionId: id, action: 'APPROVE' });
            } else if (type === 'withdrawals') {
                await api.post('/wallet/admin/withdrawal-action', { transactionId: id, action: 'APPROVE' });
            } else {
                await api.post(`/beneficiaries/admin/${id}/action`, { action: 'APPROVE' });
            }
            fetchAllPending();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setActionLoading(rejectModal.id);
        try {
            if (rejectModal.type === 'deposits') {
                await api.post('/wallet/admin/deposit-action', {
                    transactionId: rejectModal.id,
                    action: 'REJECT',
                    rejectionReason
                });
            } else if (rejectModal.type === 'withdrawals') {
                await api.post('/wallet/admin/withdrawal-action', {
                    transactionId: rejectModal.id,
                    action: 'REJECT',
                    rejectionReason
                });
            } else {
                await api.post(`/beneficiaries/admin/${rejectModal.id}/action`, {
                    action: 'REJECT',
                    rejectionReason
                });
            }
            setRejectModal(null);
            setRejectionReason('');
            fetchAllPending();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const tabs = [
        { id: 'deposits' as TabType, label: 'Deposits', icon: ArrowUpRight, count: deposits.length, color: 'text-green-600' },
        { id: 'withdrawals' as TabType, label: 'Withdrawals', icon: ArrowDownLeft, count: withdrawals.length, color: 'text-red-600' },
        { id: 'beneficiaries' as TabType, label: 'Beneficiaries', icon: Building2, count: beneficiaries.length, color: 'text-blue-600' },
    ];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const maskAccountNumber = (acc: string) => {
        return `****${acc.slice(-4)}`;
    };

    const getProofTypeLabel = (type?: string) => {
        switch (type) {
            case 'PASSBOOK': return 'Passbook';
            case 'CHECKBOOK': return 'Checkbook';
            case 'UPI_SCREENSHOT': return 'UPI Screenshot';
            case 'BANK_STATEMENT': return 'Bank Statement';
            default: return 'Document';
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold dark:text-white">Admin Approvals</h1>
                            <p className="text-sm text-gray-500">Review and approve pending requests</p>
                        </div>
                    </div>
                    <Button variant="outline" className="gap-2" onClick={fetchAllPending} disabled={loading}>
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-gray-900 shadow-sm text-gray-900 dark:text-white"
                                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4", tab.color)} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="ml-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full text-xs font-bold">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <Card className="p-0 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">
                            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
                            Loading pending items...
                        </div>
                    ) : (
                        <>
                            {/* Deposits Tab */}
                            {activeTab === 'deposits' && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {deposits.length === 0 ? (
                                        <div className="p-12 text-center text-gray-500">
                                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                            <p className="font-medium">All caught up!</p>
                                            <p className="text-sm">No pending deposit requests</p>
                                        </div>
                                    ) : (
                                        deposits.map((tx) => (
                                            <div key={tx._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                                            <ArrowUpRight className="w-6 h-6 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold dark:text-white">{tx.userId?.name || 'Unknown'}</span>
                                                                <span className="text-xs text-gray-500">{tx.userId?.email}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                                <span className="font-mono text-xs">{tx.referenceId}</span>
                                                                <span>•</span>
                                                                <span>{formatDate(tx.createdAt)}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">{tx.description}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-xl font-bold text-green-600">+₹{tx.amount.toLocaleString()}</div>
                                                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                                                                <Clock className="w-3 h-3" />
                                                                Pending
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {tx.receiptUrl && (
                                                                <button
                                                                    onClick={() => setReceiptModal(tx.receiptUrl!)}
                                                                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                                                    title="View Receipt"
                                                                >
                                                                    <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleApprove('deposits', tx._id)}
                                                                disabled={actionLoading === tx._id}
                                                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectModal({ type: 'deposits', id: tx._id })}
                                                                disabled={actionLoading === tx._id}
                                                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Withdrawals Tab */}
                            {activeTab === 'withdrawals' && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {withdrawals.length === 0 ? (
                                        <div className="p-12 text-center text-gray-500">
                                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                            <p className="font-medium">All caught up!</p>
                                            <p className="text-sm">No pending withdrawal requests</p>
                                        </div>
                                    ) : (
                                        withdrawals.map((tx) => (
                                            <div key={tx._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                                                            <ArrowDownLeft className="w-6 h-6 text-red-600" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold dark:text-white">{tx.userId?.name || 'Unknown'}</span>
                                                                <span className="text-xs text-gray-500">{tx.userId?.email}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                                                <span className="font-mono text-xs">{tx.referenceId}</span>
                                                                <span>•</span>
                                                                <span>{formatDate(tx.createdAt)}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-1">{tx.description}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-xl font-bold text-red-600">-₹{tx.amount.toLocaleString()}</div>
                                                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                                                                <Clock className="w-3 h-3" />
                                                                Pending
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleApprove('withdrawals', tx._id)}
                                                                disabled={actionLoading === tx._id}
                                                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectModal({ type: 'withdrawals', id: tx._id })}
                                                                disabled={actionLoading === tx._id}
                                                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Beneficiaries Tab */}
                            {activeTab === 'beneficiaries' && (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {beneficiaries.length === 0 ? (
                                        <div className="p-12 text-center text-gray-500">
                                            <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                                            <p className="font-medium">All caught up!</p>
                                            <p className="text-sm">No pending beneficiary requests</p>
                                        </div>
                                    ) : (
                                        beneficiaries.map((ben) => (
                                            <div key={ben._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                                            <Building2 className="w-6 h-6 text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold dark:text-white">{ben.userId?.name || 'Unknown'}</span>
                                                                <span className="text-xs text-gray-500">{ben.userId?.email}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-sm mt-1">
                                                                <span className="font-medium text-gray-700 dark:text-gray-300">{ben.bankName}</span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="font-mono text-gray-500">{maskAccountNumber(ben.accountNumber)}</span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-gray-500">{ben.ifscCode}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-gray-500">Account Holder: {ben.accountHolderName}</span>
                                                                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                                                    {ben.accountType}
                                                                </span>
                                                                {ben.proofType && (
                                                                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                                        <FileText className="w-2.5 h-2.5" />
                                                                        {getProofTypeLabel(ben.proofType)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-sm text-gray-500">{formatDate(ben.createdAt)}</div>
                                                            <div className="flex items-center gap-1 text-xs text-yellow-600">
                                                                <Clock className="w-3 h-3" />
                                                                Pending Verification
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {ben.proofUrl && (
                                                                <button
                                                                    onClick={() => setReceiptModal(ben.proofUrl!)}
                                                                    className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                                                                    title={`View ${getProofTypeLabel(ben.proofType)}`}
                                                                >
                                                                    <Eye className="w-4 h-4 text-blue-600" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleApprove('beneficiaries', ben._id)}
                                                                disabled={actionLoading === ben._id}
                                                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                                                title="Approve"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectModal({ type: 'beneficiaries', id: ben._id })}
                                                                disabled={actionLoading === ben._id}
                                                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                                title="Reject"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>

            {/* Rejection Modal */}
            <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectionReason(''); }} title="Reject Request">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-400">
                            This action cannot be undone. The user will be notified of the rejection.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Rejection Reason</label>
                        <textarea
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                            placeholder="Provide a reason for rejection..."
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setRejectModal(null); setRejectionReason(''); }}>
                            Cancel
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={handleReject} disabled={actionLoading !== null}>
                            {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Document View Modal */}
            <Modal isOpen={!!receiptModal} onClose={() => setReceiptModal(null)} title="Proof Document">
                <div className="flex flex-col items-center justify-center gap-4">
                    {receiptModal && (
                        <>
                            <img
                                src={receiptModal}
                                alt="Proof Document"
                                className="max-w-full max-h-[60vh] rounded-lg object-contain"
                            />
                            <a
                                href={receiptModal}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                                <Eye className="w-4 h-4" />
                                Open in New Tab
                            </a>
                        </>
                    )}
                </div>
            </Modal>
        </DashboardLayout>
    );
}
