import { Router } from 'express';
import * as profileController from './profile.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { upload } from '../../utils/fileUpload.js';

const router = Router();

router.get('/me', authMiddleware, profileController.getProfile);
router.patch('/me', authMiddleware, profileController.updateProfile);
router.post('/me/avatar', authMiddleware, upload.single('avatar'), profileController.updateProfilePicture);
router.get('/:id', authMiddleware, profileController.getUserPublicProfile);

export default router;
