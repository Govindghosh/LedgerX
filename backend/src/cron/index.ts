import cron from 'node-cron';
import Transaction from '../models/Transaction';
import ReportSnapshot from '../models/ReportSnapshot';
import User from '../models/User';

export const startDailyReportJob = () => {
    // Every day at 00:05 AM
    cron.schedule('5 0 * * *', async () => {
        console.log('Running DAILY report cron');
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setHours(23, 59, 59, 999);

        const summary = await Transaction.aggregate([
            { $match: { createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: '$type',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ]);

        let totalCredit = 0, totalDebit = 0, transactionCount = 0;
        summary.forEach((s) => {
            transactionCount += s.count;
            if (s._id === 'CREDIT') totalCredit = s.totalAmount;
            if (s._id === 'DEBIT') totalDebit = s.totalAmount;
        });

        const activeUsers = await User.countDocuments({ isActive: true });

        await ReportSnapshot.findOneAndUpdate(
            { type: 'DAILY', date: start },
            {
                totalCredit,
                totalDebit,
                netAmount: totalCredit - totalDebit,
                transactionCount,
                activeUsers,
            },
            { upsert: true }
        );
        console.log('Daily report snapshot saved');
    });
};

export const startCrons = () => {
    startDailyReportJob();
    // Monthly job can be added similarly logic: cron.schedule('10 0 1 * *', ...)
};
