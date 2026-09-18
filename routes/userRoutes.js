import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile
} from '../controllers/userController.js';

const router = express.Router();

// POST /api/users/register
router.post('/register', registerUser);

// POST /api/users/login
router.post('/login', loginUser);

// GET /api/users/me
router.get('/me', getUserProfile);

export default router;
