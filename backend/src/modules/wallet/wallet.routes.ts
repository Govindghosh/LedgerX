import { Router } from 'express';
import * as walletController from './wallet.controller';
import { checkRole } from '../../middlewares/auth.middleware';
import { upload } from '../../utils/fileUpload';

const router = Router();

// User routes
router.get('/me', walletController.getMyWallet);
router.post('/deposit', upload.single('receipt'), walletController.deposit);
router.post('/withdraw', walletController.withdraw);

// Admin routes
router.post('/adjust', checkRole(['ADMIN']), walletController.adjustWallet);
router.get('/admin/pending', checkRole(['ADMIN', 'MANAGER']), walletController.getPendingTransactions);
router.post('/admin/deposit-action', checkRole(['ADMIN']), walletController.handleDepositAction);
router.post('/admin/withdrawal-action', checkRole(['ADMIN']), walletController.handleWithdrawalAction);

// Backward compatibility
router.post('/withdrawal-action', checkRole(['ADMIN']), walletController.handleWithdrawalAction);

export default router;
