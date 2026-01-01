'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
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
    Sun,
    CheckCircle,
    MessageSquare,
    Circle
} from 'lucide-react';
import { cn } from '@/components/ui';
import { useTheme } from 'next-themes';
import { SocketProvider, useSocket } from '@/contexts/SocketContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/users', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Wallets', href: '/wallets', icon: Wallet },
    { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
    { label: 'Chat', href: '/chat', icon: MessageSquare },
    { label: 'Approvals', href: '/approvals', icon: CheckCircle, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { label: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert, roles: ['ADMIN'] },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const { isConnected } = useSocket();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || 'USER');
        setUserName(user.name || 'User');
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        router.push('/login');
    };

    // Filter nav items based on user role
    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
    });

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
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center font-bold text-white text-xl">X</div>
                        <span className="text-xl font-bold dark:text-white">LedgerX</span>
                    </div>

                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {filteredNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    pathname === item.href
                                        ? "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5",
                                    pathname === item.href && "text-blue-500"
                                )} />
                                {item.label}
                                {item.href === '/chat' && (
                                    <span className="ml-auto text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                                        New
                                    </span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-2">
                            <Settings className="w-5 h-5" />
                            Settings
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-800 flex items-center justify-between px-4 lg:px-8">
                    <button className="lg:hidden p-2 text-gray-600 dark:text-gray-400" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex-1 ml-4 lg:ml-0">
                        <h2 className="text-lg font-semibold dark:text-white capitalize">
                            {pathname.split('/').pop() || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Connection Status */}
                        <div className={cn(
                            "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            isConnected
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                            <Circle className={cn(
                                "w-2 h-2 fill-current",
                                isConnected ? "text-emerald-500" : "text-amber-500 animate-pulse"
                            )} />
                            {isConnected ? 'Online' : 'Connecting...'}
                        </div>

                        {/* Notification Bell */}
                        <NotificationBell />

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* User Avatar */}
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-medium dark:text-white">{userName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{userRole}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className={cn(
                    "flex-1 relative",
                    pathname === '/chat' ? "overflow-hidden" : "overflow-y-auto p-4 lg:p-8"
                )}>
                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <DashboardContent>{children}</DashboardContent>;
}
