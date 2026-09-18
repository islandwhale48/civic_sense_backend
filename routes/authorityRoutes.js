import express from 'express';
import {
  authorityLogin,
  getRegisteredAuthorities,
  getAuthorityProfile
} from '../controllers/authorityController.js';

const router = express.Router();

// POST /api/authority/login
router.post('/login', authorityLogin);

// GET /api/authority/accounts
router.get('/accounts', getRegisteredAuthorities);

// GET /api/authority/me
router.get('/me', getAuthorityProfile);

export default router;
