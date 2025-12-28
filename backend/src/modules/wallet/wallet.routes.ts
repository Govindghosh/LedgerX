import { Router } from 'express';
import * as walletController from './wallet.controller';
import { checkRole } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/me', walletController.getMyWallet);
router.post('/adjust', checkRole(['ADMIN']), walletController.adjustWallet);

export default router;
