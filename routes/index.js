import express from 'express';
import issueRoutes from './issueRoutes.js';

const router = express.Router();

// Mount modular sub-routes
router.use('/', issueRoutes);

export default router;