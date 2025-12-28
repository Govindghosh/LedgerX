'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Wallet,
    ArrowLeftRight,
    BarChart3,
    ShieldAlert,
    Settings,
    LogOut,
    Menu,
    X,
    Moon,
    Sun
} from 'lucide-react';
import { cn } from '@/components/ui';
import { useTheme } from 'next-themes';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/users', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Wallets', href: '/wallets', icon: Wallet },
    { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert, roles: ['ADMIN'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-black font-sans">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 transition-transform duration-300 lg:relative lg:translate-x-0",
                    !sidebarOpen && "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 px-6 h-16 border-b border-gray-200 dark:border-gray-800">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">X</div>
                        <span className="text-xl font-bold dark:text-white">LedgerX</span>
                    </div>

                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    pathname === item.href
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-2">
                            <Settings className="w-5 h-5" />
                            Settings
                        </Link>
                        <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
                    <button className="lg:hidden p-2 text-gray-600 dark:text-gray-400" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex-1 ml-4 lg:ml-0">
                        <h2 className="text-lg font-semibold dark:text-white capitalize">
                            {pathname.split('/').pop() || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold">
                            A
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
