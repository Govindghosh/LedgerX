'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, cn } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
    Wallet as WalletIcon,
    ArrowUpRight,
    ArrowDownLeft,
    Shield,
    BarChart3,
    Info,
    Upload,
    CheckCircle,
    Clock,
    Building2,
    Plus,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import api from '@/lib/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Beneficiary {
    _id: string;
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: string;
    nickname?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
}

export default function WalletsPage() {
    const [wallets] = useState([
        { id: '1', user: 'Govind Ghosh', balance: 125430, locked: 5000, currency: 'INR' },
        { id: '2', user: 'John Doe', balance: 4500, locked: 0, currency: 'INR' },
        { id: '3', user: 'Jane Smith', balance: 0, locked: 0, currency: 'INR' },
    ]);

    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isBeneficiaryOpen, setIsBeneficiaryOpen] = useState(false);
    const [isAddBeneficiaryOpen, setIsAddBeneficiaryOpen] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [receipt, setReceipt] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [userWallet, setUserWallet] = useState<any>(null);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('');

    // Add beneficiary form
    const [benForm, setBenForm] = useState({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        accountType: 'SAVINGS' as 'SAVINGS' | 'CURRENT',
        nickname: '',
        proofType: '' as '' | 'PASSBOOK' | 'CHECKBOOK' | 'UPI_SCREENSHOT' | 'BANK_STATEMENT',
    });
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [chartData, setChartData] = useState<any>({
        labels: [],
        datasets: []
    });

    useEffect(() => {
        fetchMyWallet();
        fetchBeneficiaries();

        // Generate mock chart data only on client
        setChartData({
            labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
            datasets: [
                {
                    fill: true,
                    label: 'Net Revenue',
                    data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000) + 5000),
                    borderColor: 'rgb(37, 99, 235)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                },
            ],
        });
    }, []);

    const fetchMyWallet = async () => {
        try {
            const resp = await api.get('/wallet/me');
            setUserWallet(resp.data.data);
        } catch (error) {
            console.error('Failed to fetch wallet', error);
        }
    };

    const fetchBeneficiaries = async () => {
        try {
            const resp = await api.get('/beneficiaries/me');
            setBeneficiaries(resp.data.data || []);
        } catch (error) {
            console.error('Failed to fetch beneficiaries', error);
        }
    };

    const handleDeposit = async () => {
        if (!amount || !receipt) {
            alert('Please enter amount and upload payment proof.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('description', description);
            formData.append('receipt', receipt);

            await api.post('/wallet/deposit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert('Deposit request submitted! Pending admin approval.');
            setIsDepositOpen(false);
            setAmount('');
            setDescription('');
            setReceipt(null);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Deposit failed');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawal = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/wallet/withdraw', {
                amount: parseFloat(amount),
                beneficiaryId: selectedBeneficiary || undefined,
                description: description || 'Withdrawal Request'
            });

            alert('Withdrawal request submitted! It will be processed after admin approval.');
            setIsWithdrawOpen(false);
            setAmount('');
            setDescription('');
            setSelectedBeneficiary('');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Withdrawal failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBeneficiary = async () => {
        if (!benForm.accountHolderName || !benForm.bankName || !benForm.accountNumber || !benForm.ifscCode) {
            alert('Please fill all required fields.');
            return;
        }

        if (!proofFile) {
            alert('Please upload a proof document (passbook/checkbook/UPI screenshot).');
            return;
        }

        if (!benForm.proofType) {
            alert('Please select the type of proof document.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('accountHolderName', benForm.accountHolderName);
            formData.append('bankName', benForm.bankName);
            formData.append('accountNumber', benForm.accountNumber);
            formData.append('ifscCode', benForm.ifscCode);
            formData.append('accountType', benForm.accountType);
            if (benForm.nickname) formData.append('nickname', benForm.nickname);
            formData.append('proofType', benForm.proofType);
            formData.append('proof', proofFile);

            await api.post('/beneficiaries', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Beneficiary added! Pending admin approval.');
            setIsAddBeneficiaryOpen(false);
            setBenForm({
                accountHolderName: '',
                bankName: '',
                accountNumber: '',
                ifscCode: '',
                accountType: 'SAVINGS',
                nickname: '',
                proofType: '',
            });
            setProofFile(null);
            fetchBeneficiaries();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to add beneficiary');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBeneficiary = async (id: string) => {
        if (!confirm('Are you sure you want to delete this beneficiary?')) return;

        try {
            await api.delete(`/beneficiaries/${id}`);
            fetchBeneficiaries();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete beneficiary');
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } },
        },
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-[10px] font-bold">APPROVED</span>;
            case 'PENDING':
                return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-[10px] font-bold flex items-center gap-1"><Clock className="w-3 h-3" />PENDING</span>;
            case 'REJECTED':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-[10px] font-bold">REJECTED</span>;
            default:
                return null;
        }
    };

    const approvedBeneficiaries = beneficiaries.filter(b => b.status === 'APPROVED');

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold dark:text-white">Wallets Overview</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => setIsBeneficiaryOpen(true)}>
                            <Building2 className="w-4 h-4" /> Beneficiaries
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => setIsDepositOpen(true)}>
                            <ArrowUpRight className="w-4 h-4" /> Deposit
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => setIsWithdrawOpen(true)}>
                            <ArrowDownLeft className="w-4 h-4" /> Withdraw
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-blue-600 border-none text-white p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <WalletIcon className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium opacity-80">Available</span>
                        </div>
                        <div className="text-3xl font-bold mb-1">
                            ₹{userWallet ? userWallet.balance.toLocaleString() : '0.00'}
                        </div>
                        <div className="text-xs opacity-70 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Instantly withdrawable
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Locked</span>
                        </div>
                        <div className="text-3xl font-bold mb-1 dark:text-white">
                            ₹{userWallet ? userWallet.lockedBalance.toLocaleString() : '0.00'}
                        </div>
                        <div className="text-xs text-yellow-600 flex items-center gap-1 font-medium">
                            Pending approval
                        </div>
                    </Card>

                    <Card className="p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Revenue (30 Days)</h3>
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="h-[120px]">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </Card>
                </div>

                <Card className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
                        <h3 className="font-bold dark:text-white">All User Wallets</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Available Balance</th>
                                    <th className="px-6 py-4">Locked Balance</th>
                                    <th className="px-6 py-4">Currency</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {wallets.map((wallet) => (
                                    <tr key={wallet.id} className="text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium">{wallet.user}</td>
                                        <td className="px-6 py-4 font-bold">₹{wallet.balance.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-500">₹{wallet.locked.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs font-semibold">{wallet.currency}</td>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="outline"
                                                className="text-xs py-1 h-auto"
                                                onClick={() => setSelectedWallet(wallet)}
                                            >
                                                Manage
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Deposit Modal */}
            <Modal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} title="Deposit Funds">
                <div className="space-y-5">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-400">Deposits require admin approval. You'll be notified once approved.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Amount (INR)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Description (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="e.g. Bank Transfer"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Upload Receipt (PDF/Image)</label>
                            <div className={cn(
                                "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer",
                                receipt ? "bg-blue-50/50 border-blue-600 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-800 hover:border-blue-500"
                            )}>
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                />
                                {receipt ? (
                                    <>
                                        <CheckCircle className="w-10 h-10 text-blue-600 mb-2" />
                                        <span className="text-sm font-bold text-blue-600 truncate max-w-full px-4">{receipt.name}</span>
                                        <span className="text-[10px] text-gray-500 mt-1">Click to change file</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                        <span className="text-sm font-medium dark:text-gray-400">Drag or click to upload</span>
                                        <span className="text-[10px] text-gray-500 mt-1">Max file size: 5MB</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            className="w-full py-4 rounded-xl text-base font-bold shadow-lg shadow-blue-500/20"
                            onClick={handleDeposit}
                            disabled={loading}
                        >
                            {loading ? "Processing..." : "Submit Deposit Request"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Withdraw Modal */}
            <Modal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Withdraw Funds">
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Transfer funds to your linked bank account.</p>

                    {approvedBeneficiaries.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Select Beneficiary</label>
                            <select
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={selectedBeneficiary}
                                onChange={(e) => setSelectedBeneficiary(e.target.value)}
                            >
                                <option value="">Select a beneficiary...</option>
                                {approvedBeneficiaries.map((ben) => (
                                    <option key={ben._id} value={ben._id}>
                                        {ben.nickname || ben.bankName} - ****{ben.accountNumber.slice(-4)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {approvedBeneficiaries.length === 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                            <div>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">No approved beneficiaries</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-500">Add a beneficiary first to enable withdrawals.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Amount (INR)</label>
                        <input
                            type="number"
                            className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-400">Fixed transaction fee of ₹25 applies to all withdrawals.</p>
                    </div>

                    <Button
                        variant="danger"
                        className="w-full py-3 font-bold"
                        onClick={handleWithdrawal}
                        disabled={loading}
                    >
                        {loading ? "Processing..." : "Request Withdrawal"}
                    </Button>
                </div>
            </Modal>

            {/* Beneficiaries Modal */}
            <Modal isOpen={isBeneficiaryOpen} onClose={() => setIsBeneficiaryOpen(false)} title="Manage Beneficiaries">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Linked bank accounts for withdrawals</p>
                        <Button className="gap-1 text-xs py-1.5" onClick={() => { setIsBeneficiaryOpen(false); setIsAddBeneficiaryOpen(true); }}>
                            <Plus className="w-3 h-3" /> Add New
                        </Button>
                    </div>

                    {beneficiaries.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="font-medium">No beneficiaries added</p>
                            <p className="text-sm">Add a bank account to enable withdrawals</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {beneficiaries.map((ben) => (
                                <div key={ben._id} className="p-4 border dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium dark:text-white">{ben.nickname || ben.bankName}</span>
                                                {getStatusBadge(ben.status)}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {ben.bankName} • ****{ben.accountNumber.slice(-4)}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {ben.accountHolderName} • {ben.ifscCode}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteBeneficiary(ben._id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Add Beneficiary Modal */}
            <Modal isOpen={isAddBeneficiaryOpen} onClose={() => setIsAddBeneficiaryOpen(false)} title="Add Beneficiary">
                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-400">Beneficiaries require admin approval before use.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Account Holder Name *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                                value={benForm.accountHolderName}
                                onChange={(e) => setBenForm({ ...benForm, accountHolderName: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Bank Name *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="State Bank of India"
                                value={benForm.bankName}
                                onChange={(e) => setBenForm({ ...benForm, bankName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Account Number *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1234567890"
                                value={benForm.accountNumber}
                                onChange={(e) => setBenForm({ ...benForm, accountNumber: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">IFSC Code *</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                placeholder="SBIN0001234"
                                value={benForm.ifscCode}
                                onChange={(e) => setBenForm({ ...benForm, ifscCode: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Account Type</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={benForm.accountType}
                                onChange={(e) => setBenForm({ ...benForm, accountType: e.target.value as 'SAVINGS' | 'CURRENT' })}
                            >
                                <option value="SAVINGS">Savings</option>
                                <option value="CURRENT">Current</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Nickname (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="My SBI Account"
                                value={benForm.nickname}
                                onChange={(e) => setBenForm({ ...benForm, nickname: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Proof Document Upload Section */}
                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <h4 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Proof Document *
                        </h4>
                        <p className="text-xs text-gray-500">Upload passbook, checkbook, or UPI screenshot for verification</p>

                        <div>
                            <label className="block text-sm font-medium mb-1.5 dark:text-gray-300">Document Type *</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={benForm.proofType}
                                onChange={(e) => setBenForm({ ...benForm, proofType: e.target.value as any })}
                            >
                                <option value="">Select proof type...</option>
                                <option value="PASSBOOK">Passbook Photo</option>
                                <option value="CHECKBOOK">Checkbook / Cancelled Cheque</option>
                                <option value="UPI_SCREENSHOT">UPI Screenshot</option>
                                <option value="BANK_STATEMENT">Bank Statement</option>
                            </select>
                        </div>

                        <div className={cn(
                            "relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer",
                            proofFile ? "bg-green-50/50 border-green-600 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-800 hover:border-blue-500"
                        )}>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                accept=".jpg,.jpeg,.png,.pdf"
                            />
                            {proofFile ? (
                                <>
                                    <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                                    <span className="text-sm font-bold text-green-600 truncate max-w-full px-4">{proofFile.name}</span>
                                    <span className="text-[10px] text-gray-500 mt-1">Click to change file</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm font-medium dark:text-gray-400">Click or drag to upload</span>
                                    <span className="text-[10px] text-gray-500 mt-1">JPG, PNG or PDF (Max 5MB)</span>
                                </>
                            )}
                        </div>
                    </div>

                    <Button className="w-full py-3 font-bold" onClick={handleAddBeneficiary} disabled={loading}>
                        {loading ? "Adding..." : "Add Beneficiary"}
                    </Button>
                </div>
            </Modal>

            {/* Manage Wallet Modal */}
            <Modal isOpen={!!selectedWallet} onClose={() => setSelectedWallet(null)} title="Manage Wallet">
                {selectedWallet && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Account Holder</div>
                                <div className="font-bold dark:text-white">{selectedWallet.user}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</div>
                                <div className="text-green-600 font-bold text-sm">✓ Active</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border dark:border-gray-800 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1">Available</div>
                                <div className="text-lg font-bold dark:text-white">₹{selectedWallet.balance.toLocaleString()}</div>
                            </div>
                            <div className="p-4 border dark:border-gray-800 rounded-xl">
                                <div className="text-xs text-gray-500 mb-1">Locked</div>
                                <div className="text-lg font-bold dark:text-white">₹{selectedWallet.locked.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Button variant="outline" className="w-full justify-between px-4 h-11">
                                Freeze Wallet <div className="w-2 h-2 rounded-full bg-red-600" />
                            </Button>
                            <Button variant="outline" className="w-full justify-between px-4 h-11">
                                View Transaction History <ArrowUpRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </DashboardLayout>
    );
}
