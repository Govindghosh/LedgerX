import { Router } from 'express';
import * as userController from './users.controller.js';

const router = Router();

router.get('/', userController.getUsers);
router.patch('/:id/toggle-status', userController.toggleUserStatus);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;
