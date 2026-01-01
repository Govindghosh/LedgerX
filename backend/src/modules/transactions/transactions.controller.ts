import { Response, NextFunction } from 'express';
import Transaction from '../../models/Transaction.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 20, userId, type, from, to, search } = req.query;
        const query: any = {};

        // Users can only see their own transactions, Admins/Managers can see any
        if (req.user!.role === 'USER') {
            query.userId = req.user!.userId;
        } else if (userId) {
            query.userId = userId;
        }

        if (type) query.type = type;
        if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from as string);
            if (to) query.createdAt.$lte = new Date(to as string);
        }
        if (search) {
            query.referenceId = { $regex: search, $options: 'i' };
        }

        const transactions = await Transaction.find(query)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: transactions,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
            },
        });
    } catch (error) {
        next(error);
    }
};
