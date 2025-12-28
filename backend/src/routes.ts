import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import transactionRoutes from './modules/transactions/transactions.routes';
import reportRoutes from './modules/reports/reports.routes';
import { authMiddleware, checkRole } from './middlewares/auth.middleware';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', authMiddleware, checkRole(['ADMIN', 'MANAGER']), userRoutes);
router.use('/wallet', authMiddleware, walletRoutes);
router.use('/transactions', authMiddleware, transactionRoutes);
router.use('/reports', authMiddleware, checkRole(['ADMIN', 'MANAGER']), reportRoutes);

export default router;
