import mongoose, { Schema, Document } from 'mongoose';

export interface IBeneficiary extends Document {
    userId: mongoose.Types.ObjectId;
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'SAVINGS' | 'CURRENT';
    nickname?: string;
    proofUrl?: string;
    proofType?: 'PASSBOOK' | 'CHECKBOOK' | 'UPI_SCREENSHOT' | 'BANK_STATEMENT';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const BeneficiarySchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        accountHolderName: { type: String, required: true },
        bankName: { type: String, required: true },
        accountNumber: { type: String, required: true },
        ifscCode: { type: String, required: true },
        accountType: {
            type: String,
            enum: ['SAVINGS', 'CURRENT'],
            default: 'SAVINGS',
        },
        nickname: { type: String },
        proofUrl: { type: String },
        proofType: {
            type: String,
            enum: ['PASSBOOK', 'CHECKBOOK', 'UPI_SCREENSHOT', 'BANK_STATEMENT'],
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING',
            index: true,
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: { type: Date },
        rejectionReason: { type: String },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Ensure unique account per user
BeneficiarySchema.index({ userId: 1, accountNumber: 1 }, { unique: true });

export default mongoose.model<IBeneficiary>('Beneficiary', BeneficiarySchema);
