import { Request, Response, NextFunction } from 'express';
import User from '../../models/User';
import Wallet from '../../models/Wallet';
import { AppError } from '../../middlewares/error.middleware';
import { logAction } from '../../utils/audit.helper';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const query: any = {};

        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const users = await User.find(query)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .sort({ createdAt: -1 })
            .select('-passwordHash');

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: users,
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

export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const user = await User.findById(id);
        if (!user) throw new AppError('User not found', 404);

        user.isActive = isActive;
        await user.save();

        await logAction(
            isActive ? 'USER_ENABLED' : 'USER_DISABLED',
            'USER',
            user._id.toString(),
            req.user!.userId
        );

        res.json({
            success: true,
            message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
        });
    } catch (error) {
        next(error);
    }
};
