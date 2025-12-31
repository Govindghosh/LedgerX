'use client';

import React from 'react';
import { Card, Button } from '@/components/ui';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function ReportsPage() {
    const data = {
        labels: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        datasets: [
            {
                label: 'Credits',
                data: [4500, 5200, 3800, 7500, 6100, 4200, 5000],
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderRadius: 4,
            },
            {
                label: 'Debits',
                data: [3200, 4100, 2500, 5800, 4900, 3100, 3900],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12 }
                }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { display: false }
            },
            x: {
                grid: { display: false }
            }
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold dark:text-white">Financial reports</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2">
                            <Calendar className="w-4 h-4" /> Last 7 Days
                        </Button>
                        <Button className="gap-2">
                            <Download className="w-4 h-4" /> Export Report
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Credits', value: '₹125,430', trend: '+12.5%', isUp: true },
                        { label: 'Total Debits', value: '₹45,210', trend: '-2.3%', isUp: false },
                        { label: 'Net Profit', value: '₹80,220', trend: '+18.4%', isUp: true },
                        { label: 'Avg Transaction', value: '₹1,240', trend: '+4.1%', isUp: true },
                    ].map((stat) => (
                        <Card key={stat.label} className="p-6">
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{stat.label}</div>
                            <div className="text-2xl font-bold dark:text-white mb-2">{stat.value}</div>
                            <div className={cn(
                                "flex items-center gap-1 text-xs font-bold",
                                stat.isUp ? "text-green-600" : "text-red-600"
                            )}>
                                {stat.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {stat.trend} from last period
                            </div>
                        </Card>
                    ))}
                </div>

                <Card className="p-8">
                    <h3 className="text-lg font-bold mb-8 dark:text-white">Cash flow Analysis</h3>
                    <div className="h-[400px]">
                        <Bar options={options} data={data} />
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}

import { cn } from '@/components/ui';
