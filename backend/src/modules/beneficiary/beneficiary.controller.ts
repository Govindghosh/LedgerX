import { Response, NextFunction } from 'express';
import { z } from 'zod';
import Beneficiary from '../../models/Beneficiary.js';
import { AuthRequest } from '../../middlewares/auth.middleware.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { logAction } from '../../utils/audit.helper.js';
import { notificationService } from '../notification/notification.service.js';

const addBeneficiarySchema = z.object({
    accountHolderName: z.string().min(2),
    bankName: z.string().min(2),
    accountNumber: z.string().min(8).max(20),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
    accountType: z.enum(['SAVINGS', 'CURRENT']).optional(),
    nickname: z.string().optional(),
    proofType: z.enum(['PASSBOOK', 'CHECKBOOK', 'UPI_SCREENSHOT', 'BANK_STATEMENT']).optional(),
});

export const addBeneficiary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const validatedData = addBeneficiarySchema.parse(req.body);
        const file = req.file;

        // Check if this account already exists for the user
        const existing = await Beneficiary.findOne({
            userId: req.user!.userId,
            accountNumber: validatedData.accountNumber,
        });

        if (existing) {
            throw new AppError('This bank account is already added', 400);
        }

        const beneficiary = await Beneficiary.create({
            ...validatedData,
            userId: req.user!.userId,
            status: 'PENDING',
            proofUrl: file ? (file as any).path : undefined,
        });

        await logAction(
            'BENEFICIARY_ADDED',
            'USER',
            req.user!.userId,
            req.user!.userId,
            {
                beneficiaryId: beneficiary._id,
                bankName: validatedData.bankName,
                proofType: validatedData.proofType,
                hasProof: !!file,
            }
        );

        res.status(201).json({
            success: true,
            message: 'Beneficiary added successfully. Pending admin approval.',
            data: beneficiary,
        });
    } catch (error) {
        next(error);
    }
};

export const getMyBeneficiaries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const beneficiaries = await Beneficiary.find({ userId: req.user!.userId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: beneficiaries,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllPendingBeneficiaries = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status = 'PENDING' } = req.query;

        const beneficiaries = await Beneficiary.find({ status })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: beneficiaries,
        });
    } catch (error) {
        next(error);
    }
};

export const approveBeneficiary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { action, rejectionReason } = req.body;

        if (!['APPROVE', 'REJECT'].includes(action)) {
            throw new AppError('Invalid action', 400);
        }

        const beneficiary = await Beneficiary.findById(id);
        if (!beneficiary) {
            throw new AppError('Beneficiary not found', 404);
        }

        if (beneficiary.status !== 'PENDING') {
            throw new AppError('Beneficiary is not pending approval', 400);
        }

        beneficiary.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        beneficiary.approvedBy = req.user!.userId as any;
        beneficiary.approvedAt = new Date();

        if (action === 'REJECT' && rejectionReason) {
            beneficiary.rejectionReason = rejectionReason;
        }

        await beneficiary.save();

        await logAction(
            action === 'APPROVE' ? 'BENEFICIARY_APPROVED' : 'BENEFICIARY_REJECTED',
            'USER',
            beneficiary.userId.toString(),
            req.user!.userId,
            { beneficiaryId: beneficiary._id }
        );

        // Send notification to user
        if (action === 'APPROVE') {
            await notificationService.notifyBeneficiaryApproved(
                beneficiary.userId.toString(),
                beneficiary.accountHolderName
            );
        } else {
            await notificationService.notifyBeneficiaryRejected(
                beneficiary.userId.toString(),
                beneficiary.accountHolderName,
                rejectionReason || 'No reason provided'
            );
        }

        res.json({
            success: true,
            message: `Beneficiary ${action.toLowerCase()}d successfully`,
            data: beneficiary,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteBeneficiary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const beneficiary = await Beneficiary.findOne({
            _id: id,
            userId: req.user!.userId,
        });

        if (!beneficiary) {
            throw new AppError('Beneficiary not found', 404);
        }

        await beneficiary.deleteOne();

        await logAction(
            'BENEFICIARY_DELETED',
            'USER',
            req.user!.userId,
            req.user!.userId,
            { beneficiaryId: id }
        );

        res.json({
            success: true,
            message: 'Beneficiary deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
