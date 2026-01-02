import { Request, Response, NextFunction } from 'express';
import User from '../../models/User.js';
import Wallet from '../../models/Wallet.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { logAction } from '../../utils/audit.helper.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';

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

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;

        const user = await User.findById(id);
        if (!user) throw new AppError('User not found', 404);

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) throw new AppError('Email already in use', 400);
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;

        await user.save();

        await logAction(
            'USER_UPDATED',
            'USER',
            user._id.toString(),
            req.user!.userId
        );

        res.json({
            success: true,
            message: 'User updated successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user!.userId) {
            throw new AppError('Cannot delete your own account', 400);
        }

        const user = await User.findById(id);
        if (!user) throw new AppError('User not found', 404);

        // Delete associated wallet
        await Wallet.deleteOne({ userId: user._id });

        // Delete user
        await User.findByIdAndDelete(id);

        await logAction(
            'USER_DELETED',
            'USER',
            id,
            req.user!.userId
        );

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

