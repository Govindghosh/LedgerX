import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import walletRoutes from './modules/wallet/wallet.routes.js';
import transactionRoutes from './modules/transactions/transactions.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import beneficiaryRoutes from './modules/beneficiary/beneficiary.routes.js';
import notificationRoutes from './modules/notification/notification.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import { authMiddleware, checkRole } from './middlewares/auth.middleware.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', authMiddleware, checkRole(['ADMIN', 'MANAGER']), userRoutes);
router.use('/wallet', authMiddleware, walletRoutes);
router.use('/transactions', authMiddleware, transactionRoutes);
router.use('/reports', authMiddleware, checkRole(['ADMIN', 'MANAGER']), reportRoutes);
router.use('/beneficiaries', authMiddleware, beneficiaryRoutes);
router.use('/notifications', authMiddleware, notificationRoutes);
router.use('/chat', authMiddleware, chatRoutes);

export default router;


