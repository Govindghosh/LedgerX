import mongoose, { Schema, Document } from 'mongoose';

export type ChatRoomType = 'DIRECT' | 'GROUP';

export interface IChatRoom extends Document {
    name?: string;
    type: ChatRoomType;
    participants: mongoose.Types.ObjectId[];
    admins: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    description?: string;
    avatar?: string;
    isActive: boolean;
    lastMessage?: mongoose.Types.ObjectId;
    lastMessageAt?: Date;
    settings: {
        allowFileSharing: boolean;
        isEncrypted: boolean;
        maxMembers: number;
    };
    pinnedMessages: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const chatRoomSchema = new Schema<IChatRoom>(
    {
        name: {
            type: String,
            maxlength: 100,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['DIRECT', 'GROUP'],
        },
        participants: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }],
        admins: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        description: {
            type: String,
            maxlength: 500,
        },
        avatar: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastMessageAt: {
            type: Date,
        },
        settings: {
            allowFileSharing: { type: Boolean, default: true },
            isEncrypted: { type: Boolean, default: false },
            maxMembers: { type: Number, default: 100 },
        },
        pinnedMessages: [{
            type: Schema.Types.ObjectId,
            ref: 'Message'
        }],
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
chatRoomSchema.index({ participants: 1, type: 1 });
chatRoomSchema.index({ type: 1, lastMessageAt: -1 });
chatRoomSchema.index({ createdBy: 1 });

export default mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema);
