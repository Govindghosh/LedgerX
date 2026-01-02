import mongoose, { Schema, Document } from 'mongoose';

export interface ICallLog extends Document {
    caller: mongoose.Types.ObjectId;
    receiver: mongoose.Types.ObjectId;
    type: 'audio' | 'video';
    status: 'missed' | 'completed' | 'rejected' | 'busy' | 'ongoing';
    startTime: Date;
    endTime?: Date;
    duration?: number; // in seconds
    roomId?: string;
}

const CallLogSchema: Schema = new Schema({
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['audio', 'video'], required: true },
    status: { type: String, enum: ['missed', 'completed', 'rejected', 'busy', 'ongoing'], default: 'ongoing' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number },
    roomId: { type: String }
}, {
    timestamps: true
});

// Index for faster queries
CallLogSchema.index({ caller: 1, createdAt: -1 });
CallLogSchema.index({ receiver: 1, createdAt: -1 });

export default mongoose.model<ICallLog>('CallLog', CallLogSchema);
