import { Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Wallet from '../../models/Wallet.js';
import Transaction from '../../models/Transaction.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { processWalletTransaction, requestWithdrawal, processWithdrawalApproval } from '../../utils/transaction.helper.js';
import { logAction } from '../../utils/audit.helper.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { notificationService } from '../notification/notification.service.js';

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

const depositSchema = z.object({
    amount: z.string().transform((val) => parseFloat(val)),
    description: z.string().optional(),
});

// Modified deposit - now creates PENDING transaction for admin approval
export const deposit = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const validatedData = depositSchema.parse(req.body);
        const file = req.file;

        if (!file) {
            throw new AppError('Deposit receipt (proof of payment) is required', 400);
        }

        if (validatedData.amount <= 0) {
            throw new AppError('Amount must be positive', 400);
        }

        const wallet = await Wallet.findOne({ userId: req.user!.userId });
        if (!wallet) throw new AppError('Wallet not found', 404);

        // Create PENDING deposit transaction (not credited yet)
        const tx = await Transaction.create({
            userId: req.user!.userId,
            walletId: wallet._id,
            type: 'CREDIT',
            amount: validatedData.amount,
            beforeBalance: wallet.balance,
            afterBalance: wallet.balance + validatedData.amount, // Expected after approval
            referenceId: `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            initiatedBy: req.user!.userId,
            source: 'USER',
            description: validatedData.description || 'Self Deposit',
            receiptUrl: (file as any).path,
            status: 'PENDING', // Requires admin approval
        });

        await logAction(
            'WALLET_DEPOSIT_REQUEST',
            'WALLET',
            req.user!.userId,
            req.user!.userId,
            { amount: validatedData.amount, referenceId: tx.referenceId }
        );

        // Send notification to user
        await notificationService.notifyDepositPending(
            req.user!.userId,
            validatedData.amount,
            tx._id.toString()
        );

        res.json({
            success: true,
            message: 'Deposit request submitted. Pending admin approval.',
            data: tx,
        });
    } catch (error) {
        next(error);
    }
};

// Admin deposit approval/rejection
export const handleDepositAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { transactionId, action, rejectionReason } = req.body;
        if (!['APPROVE', 'REJECT'].includes(action)) throw new AppError('Invalid action', 400);

        const session = await mongoose.startSession();
        try {
            session.startTransaction();

            const tx = await Transaction.findById(transactionId).session(session);
            if (!tx || tx.status !== 'PENDING' || tx.type !== 'CREDIT') {
                throw new AppError('Invalid or inactive deposit transaction', 400);
            }

            const wallet = await Wallet.findById(tx.walletId).session(session);
            if (!wallet) throw new AppError('Wallet not found', 404);

            if (action === 'APPROVE') {
                // Credit the wallet
                tx.status = 'COMPLETED';
                tx.beforeBalance = wallet.balance;
                tx.afterBalance = wallet.balance + tx.amount;
                wallet.balance = Math.round((wallet.balance + tx.amount) * 100) / 100;
                wallet.lastTransactionAt = new Date();
            } else {
                tx.status = 'FAILED';
                if (rejectionReason) {
                    tx.description = `${tx.description} | Rejected: ${rejectionReason}`;
                }
            }

            await tx.save({ session });
            await wallet.save({ session });
            await session.commitTransaction();

            await logAction(
                action === 'APPROVE' ? 'DEPOSIT_APPROVED' : 'DEPOSIT_REJECTED',
                'WALLET',
                tx.userId.toString(),
                req.user!.userId,
                { amount: tx.amount, referenceId: tx.referenceId }
            );

            // Send notification to user
            if (action === 'APPROVE') {
                await notificationService.notifyDepositApproved(
                    tx.userId.toString(),
                    tx.amount,
                    tx._id.toString()
                );
            } else {
                await notificationService.notifyDepositRejected(
                    tx.userId.toString(),
                    tx.amount,
                    rejectionReason || 'No reason provided',
                    tx._id.toString()
                );
            }

            res.json({
                success: true,
                message: `Deposit ${action.toLowerCase()}d successfully`,
                data: tx,
            });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    } catch (error) {
        next(error);
    }
};

const withdrawSchema = z.object({
    amount: z.number().positive(),
    beneficiaryId: z.string().optional(),
    description: z.string().optional(),
});

export const withdraw = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const validatedData = withdrawSchema.parse(req.body);

        const tx = await requestWithdrawal({
            userId: req.user!.userId,
            amount: validatedData.amount,
            referenceId: `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            initiatedBy: req.user!.userId,
            description: validatedData.description || 'Withdrawal Request',
        });

        await logAction(
            'WALLET_WITHDRAW_REQUEST',
            'WALLET',
            req.user!.userId,
            req.user!.userId,
            { amount: validatedData.amount, referenceId: tx.referenceId, beneficiaryId: validatedData.beneficiaryId }
        );

        // Send notification to user
        await notificationService.notifyWithdrawalPending(
            req.user!.userId,
            validatedData.amount,
            tx._id.toString()
        );

        res.json({
            success: true,
            message: 'Withdrawal request submitted for approval',
            data: tx,
        });
    } catch (error) {
        next(error);
    }
};

export const handleWithdrawalAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { transactionId, action, rejectionReason } = req.body;
        if (!['APPROVE', 'REJECT'].includes(action)) throw new AppError('Invalid action', 400);

        const tx = await processWithdrawalApproval(transactionId, req.user!.userId, action === 'APPROVE', rejectionReason);

        await logAction(
            action === 'APPROVE' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
            'WALLET',
            tx.userId.toString(),
            req.user!.userId,
            { amount: tx.amount, referenceId: tx.referenceId }
        );

        // Send notification to user
        if (action === 'APPROVE') {
            await notificationService.notifyWithdrawalApproved(
                tx.userId.toString(),
                tx.amount,
                tx._id.toString()
            );
        } else {
            await notificationService.notifyWithdrawalRejected(
                tx.userId.toString(),
                tx.amount,
                rejectionReason || 'No reason provided',
                tx._id.toString()
            );
        }

        res.json({
            success: true,
            message: `Withdrawal ${action.toLowerCase()}d successfully`,
            data: tx,
        });
    } catch (error) {
        next(error);
    }
};

// Get all pending transactions for admin
export const getPendingTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { type } = req.query; // 'CREDIT' for deposits, 'DEBIT' for withdrawals

        const query: any = { status: 'PENDING' };
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: transactions,
        });
    } catch (error) {
        next(error);
    }
};
