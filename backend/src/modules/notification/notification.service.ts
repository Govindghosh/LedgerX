import mongoose from 'mongoose';
import Notification, { INotification, NotificationType } from '../../models/Notification.js';
import { kafkaService } from '../../services/kafka.service.js';
import { socketService } from '../../services/socket.service.js';
import { kafkaConfig } from '../../config/kafka.config.js';

interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
}

class NotificationService {
    // Create and send notification
    async create(input: CreateNotificationInput): Promise<INotification> {
        const notification = await Notification.create({
            userId: new mongoose.Types.ObjectId(input.userId),
            type: input.type,
            title: input.title,
            message: input.message,
            data: input.data || {},
        });

        // Send via Kafka for distributed processing
        await kafkaService.sendMessage(
            kafkaConfig.topics.NOTIFICATIONS,
            {
                notificationId: notification._id,
                userId: input.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                data: input.data,
                timestamp: new Date().toISOString(),
            },
            input.userId
        );

        // Send real-time via Socket.IO
        socketService.sendToUser(input.userId, 'notification:new', {
            id: notification._id,
            type: input.type,
            title: input.title,
            message: input.message,
            data: input.data,
            createdAt: notification.createdAt,
        });

        return notification;
    }

    // Create notification for multiple users
    async createBulk(userIds: string[], notification: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
        const notifications = userIds.map(userId => ({
            userId: new mongoose.Types.ObjectId(userId),
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
        }));

        await Notification.insertMany(notifications);

        // Send to all users via Socket
        userIds.forEach(userId => {
            socketService.sendToUser(userId, 'notification:new', {
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: new Date(),
            });
        });
    }

    // Get user notifications with pagination
    async getUserNotifications(
        userId: string,
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false
    ) {
        const query: any = { userId: new mongoose.Types.ObjectId(userId) };
        if (unreadOnly) {
            query.isRead = false;
        }

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query),
        ]);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    // Get unread count
    async getUnreadCount(userId: string): Promise<number> {
        return Notification.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            isRead: false,
        });
    }

    // Mark notification as read
    async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
        return Notification.findOneAndUpdate(
            {
                _id: notificationId,
                userId: new mongoose.Types.ObjectId(userId),
            },
            {
                isRead: true,
                readAt: new Date(),
            },
            { new: true }
        );
    }

    // Mark all as read
    async markAllAsRead(userId: string): Promise<number> {
        const result = await Notification.updateMany(
            {
                userId: new mongoose.Types.ObjectId(userId),
                isRead: false,
            },
            {
                isRead: true,
                readAt: new Date(),
            }
        );
        return result.modifiedCount;
    }

    // Delete notification
    async delete(notificationId: string, userId: string): Promise<boolean> {
        const result = await Notification.deleteOne({
            _id: notificationId,
            userId: new mongoose.Types.ObjectId(userId),
        });
        return result.deletedCount > 0;
    }

    // Delete all notifications for user
    async deleteAll(userId: string): Promise<number> {
        const result = await Notification.deleteMany({
            userId: new mongoose.Types.ObjectId(userId),
        });
        return result.deletedCount;
    }

    // ============ Predefined Notification Helpers ============

    async notifyDepositPending(userId: string, amount: number, transactionId: string) {
        return this.create({
            userId,
            type: 'DEPOSIT_PENDING',
            title: 'Deposit Submitted',
            message: `Your deposit of ₹${amount.toLocaleString()} is pending approval.`,
            data: { transactionId, amount },
        });
    }

    async notifyDepositApproved(userId: string, amount: number, transactionId: string) {
        return this.create({
            userId,
            type: 'DEPOSIT_APPROVED',
            title: 'Deposit Approved ✅',
            message: `Your deposit of ₹${amount.toLocaleString()} has been approved and credited to your wallet.`,
            data: { transactionId, amount },
        });
    }

    async notifyDepositRejected(userId: string, amount: number, reason: string, transactionId: string) {
        return this.create({
            userId,
            type: 'DEPOSIT_REJECTED',
            title: 'Deposit Rejected ❌',
            message: `Your deposit of ₹${amount.toLocaleString()} was rejected. Reason: ${reason}`,
            data: { transactionId, amount, reason },
        });
    }

    async notifyWithdrawalPending(userId: string, amount: number, transactionId: string) {
        return this.create({
            userId,
            type: 'WITHDRAWAL_PENDING',
            title: 'Withdrawal Requested',
            message: `Your withdrawal request for ₹${amount.toLocaleString()} is being processed.`,
            data: { transactionId, amount },
        });
    }

    async notifyWithdrawalApproved(userId: string, amount: number, transactionId: string) {
        return this.create({
            userId,
            type: 'WITHDRAWAL_APPROVED',
            title: 'Withdrawal Approved ✅',
            message: `Your withdrawal of ₹${amount.toLocaleString()} has been approved and processed.`,
            data: { transactionId, amount },
        });
    }

    async notifyWithdrawalRejected(userId: string, amount: number, reason: string, transactionId: string) {
        return this.create({
            userId,
            type: 'WITHDRAWAL_REJECTED',
            title: 'Withdrawal Rejected ❌',
            message: `Your withdrawal request for ₹${amount.toLocaleString()} was rejected. Reason: ${reason}`,
            data: { transactionId, amount, reason },
        });
    }

    async notifyBeneficiaryApproved(userId: string, beneficiaryName: string) {
        return this.create({
            userId,
            type: 'BENEFICIARY_APPROVED',
            title: 'Beneficiary Approved ✅',
            message: `Your beneficiary "${beneficiaryName}" has been approved and is ready for withdrawals.`,
            data: { beneficiaryName },
        });
    }

    async notifyBeneficiaryRejected(userId: string, beneficiaryName: string, reason: string) {
        return this.create({
            userId,
            type: 'BENEFICIARY_REJECTED',
            title: 'Beneficiary Rejected ❌',
            message: `Your beneficiary "${beneficiaryName}" was rejected. Reason: ${reason}`,
            data: { beneficiaryName, reason },
        });
    }

    async notifyNewMessage(userId: string, senderName: string, roomId: string, preview: string) {
        return this.create({
            userId,
            type: 'NEW_MESSAGE',
            title: `New message from ${senderName}`,
            message: preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
            data: { roomId, senderName },
        });
    }

    async notifyGroupInvite(userId: string, groupName: string, inviterName: string, roomId: string) {
        return this.create({
            userId,
            type: 'GROUP_INVITE',
            title: 'Group Chat Invitation',
            message: `${inviterName} invited you to join "${groupName}"`,
            data: { roomId, groupName, inviterName },
        });
    }

    async broadcastAnnouncement(userIds: string[], title: string, message: string) {
        return this.createBulk(userIds, {
            type: 'ANNOUNCEMENT',
            title,
            message,
        });
    }
}

export const notificationService = new NotificationService();
