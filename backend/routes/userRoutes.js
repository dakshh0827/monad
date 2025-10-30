import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// Set or update display name
router.post('/set-display-name', userController.setDisplayName);

// Get user by wallet address
router.get('/:walletAddress', userController.getUserByWallet);

// Get or create user
router.post('/get-or-create', userController.getOrCreateUser);

export default router;