import express from 'express';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';
import {
  createIssue,
  getIssues,
  getIssueById,
  toggleSupport,
  routeAuthorityPreview,
  refineDescriptionWithAI
} from '../controllers/issueController.js';

const router = express.Router();

// Public & Citizen Endpoints per SRS Section 10
router.get('/issues', getIssues);
router.post('/issues', uploadSingleImage, createIssue);
router.get('/issues/:id', getIssueById);
router.post('/issues/:id/support', toggleSupport);

// Route Preview & AI Refine
router.post('/issues/route-authority', routeAuthorityPreview);
router.post('/issues/nearest-local-body', routeAuthorityPreview);
router.post('/issues/ai-refine', refineDescriptionWithAI);

export default router;
