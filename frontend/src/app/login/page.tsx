'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-2xl">X</div>
                        <span className="text-2xl font-bold dark:text-white">LedgerX</span>
                    </div>
                </div>

                <Card className="p-8">
                    <h1 className="text-2xl font-bold mb-2 dark:text-white">Welcome back</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Login to manage your business wallet</p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="admin@test.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <div className="text-red-600 text-sm">{error}</div>}

                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? 'Logging in...' : 'Sign in'}
                        </Button>
                    </form>
                </Card>

                <p className="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
                    Demo Admin: admin@test.com / Admin@123
                </p>
            </div>
        </div>
    );
}
