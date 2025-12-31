import { Router } from 'express';
import {
    addBeneficiary,
    getMyBeneficiaries,
    getAllPendingBeneficiaries,
    approveBeneficiary,
    deleteBeneficiary,
} from './beneficiary.controller';
import { checkRole } from '../../middlewares/auth.middleware';
import { upload } from '../../utils/fileUpload';

const router = Router();

// User routes
router.post('/', upload.single('proof'), addBeneficiary);
router.get('/me', getMyBeneficiaries);
router.delete('/:id', deleteBeneficiary);

// Admin routes
router.get('/admin/pending', checkRole(['ADMIN', 'MANAGER']), getAllPendingBeneficiaries);
router.post('/admin/:id/action', checkRole(['ADMIN', 'MANAGER']), approveBeneficiary);

export default router;
