import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { AppError } from '../middlewares/error.middleware.js';

export type TxType = 'CREDIT' | 'DEBIT' | 'ADJUSTMENT';

interface ProcessTxParams {
    userId: string;
    amount: number;
    type: TxType;
    referenceId: string;
    initiatedBy: string;
    source?: 'SYSTEM' | 'ADMIN' | 'USER';
    description?: string;
    receiptUrl?: string;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export async function processWalletTransaction({
    userId,
    amount,
    type,
    referenceId,
    initiatedBy,
    source = 'SYSTEM',
    description = '',
    receiptUrl = '',
    status = 'COMPLETED',
}: ProcessTxParams) {
    if (amount <= 0) {
        throw new AppError('Amount must be positive', 400);
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Find user's wallet
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) {
            throw new AppError('Wallet not found for this user', 404);
        }

        const beforeBalance = wallet.balance;
        let afterBalance = beforeBalance;

        if (type === 'DEBIT') {
            if (beforeBalance < amount) {
                throw new AppError('Insufficient balance', 400);
            }
            afterBalance = beforeBalance - amount;
        } else {
            // CREDIT or ADJUSTMENT
            afterBalance = beforeBalance + amount;
        }

        // 1. Create transaction log
        const tx = await Transaction.create(
            [
                {
                    userId,
                    walletId: wallet._id,
                    type,
                    amount,
                    beforeBalance,
                    afterBalance,
                    referenceId,
                    initiatedBy,
                    source,
                    description,
                    receiptUrl,
                    status,
                },
            ],
            { session }
        );

        // 2. Update wallet balance
        wallet.balance = Math.round(afterBalance * 100) / 100; // Small precision safe
        wallet.lastTransactionAt = new Date();
        await wallet.save({ session });

        await session.commitTransaction();
        session.endSession();

        return tx[0];
    } catch (err: any) {
        await session.abortTransaction();
        session.endSession();
        if (err instanceof AppError) throw err;
        if (err.code === 11000) {
            throw new AppError('Duplicate transaction reference', 400);
        }
        throw new AppError(err.message || 'Transaction processing failed', 500);
    }
}

export async function requestWithdrawal({
    userId,
    amount,
    referenceId,
    initiatedBy,
    description = 'Withdrawal Request',
}: {
    userId: string;
    amount: number;
    referenceId: string;
    initiatedBy: string;
    description?: string;
}) {
    if (amount <= 0) throw new AppError('Amount must be positive', 400);
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) throw new AppError('Wallet not found', 404);
        if (wallet.balance < amount) throw new AppError('Insufficient balance', 400);

        // 1. Create Pending Transaction
        const tx = await Transaction.create([{
            userId,
            walletId: wallet._id,
            type: 'DEBIT',
            amount,
            beforeBalance: wallet.balance,
            afterBalance: wallet.balance - amount,
            referenceId,
            initiatedBy,
            source: 'USER',
            description,
            status: 'PENDING'
        }], { session });

        // 2. Lock Balance
        wallet.balance -= amount;
        wallet.lockedBalance += amount;
        await wallet.save({ session });

        await session.commitTransaction();
        return tx[0];
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

export async function processWithdrawalApproval(transactionId: string, adminId: string, approve: boolean, rejectionReason?: string) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const tx = await Transaction.findById(transactionId).session(session);
        if (!tx || tx.status !== 'PENDING') throw new AppError('Invalid or inactive transaction', 400);

        const wallet = await Wallet.findById(tx.walletId).session(session);
        if (!wallet) throw new AppError('Wallet not found', 404);

        if (approve) {
            tx.status = 'COMPLETED';
            wallet.lockedBalance -= tx.amount;
        } else {
            tx.status = 'FAILED';
            wallet.balance += tx.amount;
            wallet.lockedBalance -= tx.amount;
            if (rejectionReason) {
                tx.description = `${tx.description} | Rejected: ${rejectionReason}`;
            }
        }

        await tx.save({ session });
        await wallet.save({ session });
        await session.commitTransaction();
        return tx;
    } catch (err: any) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}
