import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
    | 'DEPOSIT_PENDING'
    | 'DEPOSIT_APPROVED'
    | 'DEPOSIT_REJECTED'
    | 'WITHDRAWAL_PENDING'
    | 'WITHDRAWAL_APPROVED'
    | 'WITHDRAWAL_REJECTED'
    | 'BENEFICIARY_PENDING'
    | 'BENEFICIARY_APPROVED'
    | 'BENEFICIARY_REJECTED'
    | 'WALLET_ADJUSTED'
    | 'NEW_MESSAGE'
    | 'GROUP_INVITE'
    | 'SYSTEM_ALERT'
    | 'ANNOUNCEMENT';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                'DEPOSIT_PENDING',
                'DEPOSIT_APPROVED',
                'DEPOSIT_REJECTED',
                'WITHDRAWAL_PENDING',
                'WITHDRAWAL_APPROVED',
                'WITHDRAWAL_REJECTED',
                'BENEFICIARY_PENDING',
                'BENEFICIARY_APPROVED',
                'BENEFICIARY_REJECTED',
                'WALLET_ADJUSTED',
                'NEW_MESSAGE',
                'GROUP_INVITE',
                'SYSTEM_ALERT',
                'ANNOUNCEMENT',
            ],
        },
        title: {
            type: String,
            required: true,
            maxlength: 200,
        },
        message: {
            type: String,
            required: true,
            maxlength: 1000,
        },
        data: {
            type: Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// TTL index to auto-delete old notifications (90 days)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<INotification>('Notification', notificationSchema);
