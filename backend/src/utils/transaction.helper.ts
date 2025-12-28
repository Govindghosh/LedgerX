import mongoose from 'mongoose';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import { AppError } from '../middlewares/error.middleware';

export type TxType = 'CREDIT' | 'DEBIT' | 'ADJUSTMENT';

interface ProcessTxParams {
    userId: string;
    amount: number;
    type: TxType;
    referenceId: string;
    initiatedBy: string;
    source?: 'SYSTEM' | 'ADMIN' | 'USER';
    description?: string;
}

export async function processWalletTransaction({
    userId,
    amount,
    type,
    referenceId,
    initiatedBy,
    source = 'SYSTEM',
    description = '',
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
