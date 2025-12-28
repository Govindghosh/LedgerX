import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    lockedBalance: number;
    currency: string;
    lastTransactionAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        balance: { type: Number, default: 0, min: 0 },
        lockedBalance: { type: Number, default: 0, min: 0 },
        currency: { type: String, default: 'INR' },
        lastTransactionAt: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.model<IWallet>('Wallet', WalletSchema);
