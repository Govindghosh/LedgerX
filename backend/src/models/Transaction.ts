import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    walletId: mongoose.Types.ObjectId;
    type: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT';
    amount: number;
    beforeBalance: number;
    afterBalance: number;
    referenceId: string;
    description?: string;
    receiptUrl?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    initiatedBy: mongoose.Types.ObjectId;
    source: 'SYSTEM' | 'ADMIN' | 'USER';
    createdAt: Date;
}

const TransactionSchema: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
        type: {
            type: String,
            enum: ['CREDIT', 'DEBIT', 'ADJUSTMENT'],
            required: true,
            index: true,
        },
        amount: { type: Number, required: true, min: 0 },
        beforeBalance: { type: Number, required: true },
        afterBalance: { type: Number, required: true },
        referenceId: { type: String, required: true, unique: true, index: true },
        description: { type: String },
        receiptUrl: { type: String },
        status: {
            type: String,
            enum: ['PENDING', 'COMPLETED', 'FAILED'],
            default: 'COMPLETED',
        },
        initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        source: {
            type: String,
            enum: ['SYSTEM', 'ADMIN', 'USER'],
            required: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
