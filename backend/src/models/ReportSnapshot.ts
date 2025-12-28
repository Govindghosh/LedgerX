import mongoose, { Schema, Document } from 'mongoose';

export interface IReportSnapshot extends Document {
    type: 'DAILY' | 'MONTHLY';
    date: Date;
    totalCredit: number;
    totalDebit: number;
    netAmount: number;
    transactionCount: number;
    activeUsers: number;
    createdAt: Date;
}

const ReportSnapshotSchema: Schema = new Schema(
    {
        type: { type: String, enum: ['DAILY', 'MONTHLY'], required: true },
        date: { type: Date, required: true },
        totalCredit: { type: Number, required: true },
        totalDebit: { type: Number, required: true },
        netAmount: { type: Number, required: true },
        transactionCount: { type: Number, required: true },
        activeUsers: { type: Number, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Unique index to prevent duplicate snapshots for the same type and date
ReportSnapshotSchema.index({ type: 1, date: 1 }, { unique: true });

export default mongoose.model<IReportSnapshot>('ReportSnapshot', ReportSnapshotSchema);
