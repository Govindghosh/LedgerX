import { Response, NextFunction } from 'express';
import ReportSnapshot from '../../models/ReportSnapshot';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getDailyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { date } = req.query;
        const searchDate = date ? new Date(date as string) : new Date();
        searchDate.setHours(0, 0, 0, 0);

        const snapshot = await ReportSnapshot.findOne({
            type: 'DAILY',
            date: searchDate,
        });

        res.json({
            success: true,
            data: snapshot,
        });
    } catch (error) {
        next(error);
    }
};

export const getChartData = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { range = '30d' } = req.query;
        const days = range === '30d' ? 30 : range === '7d' ? 7 : 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const snapshots = await ReportSnapshot.find({
            type: 'DAILY',
            date: { $gte: startDate },
        }).sort({ date: 1 });

        res.json({
            success: true,
            data: snapshots,
        });
    } catch (error) {
        next(error);
    }
};
