import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../../models/User';
import Wallet from '../../models/Wallet';
import { config } from '../../config';
import { AppError } from '../../middlewares/error.middleware';
import { logAction } from '../../utils/audit.helper';

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'MANAGER', 'USER']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const existingUser = await User.findOne({ email: validatedData.email });
        if (existingUser) {
            throw new AppError('Email already in use', 400);
        }

        const passwordHash = await bcrypt.hash(validatedData.password, 10);

        const user = await User.create({
            ...validatedData,
            passwordHash,
        });

        // Auto-create wallet for new user
        const wallet = await Wallet.create({
            userId: user._id,
            balance: 0,
        });

        await logAction('USER_REGISTERED', 'USER', user._id.toString(), user._id.toString(), {
            role: user.role,
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            throw new AppError('Invalid credentials or account disabled', 401);
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        const accessToken = jwt.sign(
            { userId: user._id, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            config.JWT_REFRESH_SECRET,
            { expiresIn: config.JWT_REFRESH_EXPIRES_IN }
        );

        user.lastLoginAt = new Date();
        await user.save();

        await logAction('USER_LOGGED_IN', 'AUTH', user._id.toString(), user._id.toString());

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
