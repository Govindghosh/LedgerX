import { Response, NextFunction } from 'express';
import { z } from 'zod';
import Wallet from '../../models/Wallet';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { processWalletTransaction } from '../../utils/transaction.helper';
import { logAction } from '../../utils/audit.helper';
import { AppError } from '../../middlewares/error.middleware';

const adjustSchema = z.object({
    userId: z.string(),
    amount: z.number().positive(),
    type: z.enum(['CREDIT', 'DEBIT', 'ADJUSTMENT']),
    reason: z.string().optional(),
});

export const getMyWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.user!.userId });
        if (!wallet) throw new AppError('Wallet not found', 404);

        res.json({
            success: true,
            data: wallet,
        });
    } catch (error) {
        next(error);
    }
};

export const adjustWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const validatedData = adjustSchema.parse(req.body);

        const tx = await processWalletTransaction({
            userId: validatedData.userId,
            amount: validatedData.amount,
            type: validatedData.type,
            referenceId: `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            initiatedBy: req.user!.userId,
            source: 'ADMIN',
            description: validatedData.reason || 'Manual Adjustment',
        });

        await logAction(
            'WALLET_ADJUSTED',
            'WALLET',
            validatedData.userId,
            req.user!.userId,
            { amount: validatedData.amount, type: validatedData.type }
        );

        res.json({
            success: true,
            message: 'Wallet adjusted successfully',
            data: tx,
        });
    } catch (error) {
        next(error);
    }
};
