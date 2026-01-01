import mongoose, { Schema, Document } from 'mongoose';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface IMessage extends Document {
    roomId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    content: string;
    type: MessageType;
    status: MessageStatus;
    attachments?: {
        url: string;
        name: string;
        type: string;
        size: number;
    }[];
    replyTo?: mongoose.Types.ObjectId;
    readBy: {
        userId: mongoose.Types.ObjectId;
        readAt: Date;
    }[];
    isEdited: boolean;
    editedAt?: Date;
    isForwarded: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        roomId: {
            type: Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true,
            index: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: true,
            maxlength: 5000,
        },
        type: {
            type: String,
            default: 'TEXT',
            enum: ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'],
        },
        status: {
            type: String,
            default: 'SENT',
            enum: ['SENT', 'DELIVERED', 'READ'],
        },
        attachments: [{
            url: { type: String, required: true },
            name: { type: String, required: true },
            type: { type: String, required: true },
            size: { type: Number, required: true },
        }],
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        readBy: [{
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            readAt: { type: Date, default: Date.now },
        }],
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        isForwarded: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);
