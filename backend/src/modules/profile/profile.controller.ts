import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import { AppError } from '../../middlewares/error.middleware.js';

export const getProfile = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId || req.userId;
        console.log('[ProfileController] Fetching profile for ID:', userId);

        if (!userId) {
            console.error('[ProfileController] No userId found in request object');
            throw new AppError('User ID not found in request', 400);
        }

        const user = await User.findById(new mongoose.Types.ObjectId(userId)).select('-passwordHash');

        if (!user) {
            console.error('[ProfileController] User lookup failed in DB for ID:', userId);
            throw new AppError('User not found in database', 404);
        }

        console.log('[ProfileController] Successfully fetched profile for:', user.email);
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('[ProfileController] Error in getProfile:', error);
        next(error);
    }
};

export const updateProfile = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId || req.userId;
        const { name, bio, phoneNumber } = req.body;

        console.log('[ProfileController] Updating profile for ID:', userId);

        if (!userId) {
            throw new AppError('User ID not found in request', 400);
        }

        const user = await User.findByIdAndUpdate(
            new mongoose.Types.ObjectId(userId),
            { name, bio, phoneNumber },
            { new: true, runValidators: true }
        ).select('-passwordHash');

        if (!user) {
            console.error('[ProfileController] Update failed - user not found for ID:', userId);
            throw new AppError('User not found', 404);
        }

        console.log('[ProfileController] Successfully updated profile for:', user.email);
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('[ProfileController] Error in updateProfile:', error);
        next(error);
    }
};

export const updateProfilePicture = async (req: any, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId || req.userId;

        console.log('[ProfileController] Updating profile picture for ID:', userId);

        if (!userId) {
            throw new AppError('User ID not found in request', 400);
        }

        if (!req.file) {
            throw new AppError('No file uploaded', 400);
        }

        const user = await User.findByIdAndUpdate(
            new mongoose.Types.ObjectId(userId),
            { profilePicture: req.file.path },
            { new: true }
        ).select('-passwordHash');

        if (!user) {
            console.error('[ProfileController] Avatar update failed - user not found for ID:', userId);
            throw new AppError('User not found', 404);
        }

        console.log('[ProfileController] Successfully updated avatar for:', user.email);
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('[ProfileController] Error in updateProfilePicture:', error);
        next(error);
    }
};

export const getUserPublicProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.params.id).select('name email profilePicture bio phoneNumber role createdAt');
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};
