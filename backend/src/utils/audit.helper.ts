import AuditLog from '../models/AuditLog';
import mongoose from 'mongoose';

export async function logAction(
    action: string,
    entityType: 'USER' | 'WALLET' | 'TRANSACTION' | 'AUTH',
    entityId: string,
    performedBy: string,
    metadata: Record<string, any> = {}
) {
    try {
        await AuditLog.create({
            action,
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId),
            performedBy: new mongoose.Types.ObjectId(performedBy),
            metadata,
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // We don't throw here to avoid failing main operation if audit log fails
    }
}
