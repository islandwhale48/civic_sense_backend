import express from 'express';
import issueRoutes from './issueRoutes.js';
import authorityRoutes from './authorityRoutes.js';
import userRoutes from './userRoutes.js';

const router = express.Router();

// Mount modular sub-routes
router.use('/authority', authorityRoutes);
router.use('/users', userRoutes);
router.use('/user', userRoutes);
router.use('/', issueRoutes);

export default router;

