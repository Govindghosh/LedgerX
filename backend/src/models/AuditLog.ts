import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    action: string;
    entityType: 'USER' | 'WALLET' | 'TRANSACTION' | 'AUTH';
    entityId: mongoose.Types.ObjectId;
    performedBy: mongoose.Types.ObjectId;
    metadata: Record<string, any>;
    createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
    {
        action: { type: String, required: true },
        entityType: {
            type: String,
            enum: ['USER', 'WALLET', 'TRANSACTION', 'AUTH'],
            required: true,
            index: true,
        },
        entityId: { type: Schema.Types.ObjectId, required: true, index: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
