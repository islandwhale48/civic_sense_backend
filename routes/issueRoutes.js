import express from 'express';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';
import {
  createIssue,
  getIssues,
  getIssueById,
  toggleSupport,
  routeAuthorityPreview,
  refineDescriptionWithAI,
  getIssuesByAuthority,
  updateIssueStatus,
  submitResolution,
  adminReviewResolution,
  getPendingResolutions
} from '../controllers/issueController.js';

const router = express.Router();

// ─── IMPORTANT: Specific/static routes MUST come before parameterized (:id) routes
// Express matches top-to-bottom; placing /:id first would swallow static paths.

// ─── Admin Panel Endpoints ─────────────────────────────────────────────────────
// GET /api/admin/pending-resolutions  (requires x-admin-pin header)
router.get('/admin/pending-resolutions', getPendingResolutions);

// ─── Static Issue Routes (must be before /:id) ────────────────────────────────
router.get('/issues', getIssues);
router.post('/issues', uploadSingleImage, createIssue);

// Route Preview & AI Refine (static paths — before /:id)
router.post('/issues/route-authority', routeAuthorityPreview);
router.post('/issues/nearest-local-body', routeAuthorityPreview);
router.post('/issues/ai-refine', refineDescriptionWithAI);

// Authority Panel — get issues by local body (static path — before /:id)
router.get('/issues/by-authority', getIssuesByAuthority);

// ─── Parameterized Issue Routes (after all static paths) ──────────────────────
router.get('/issues/:id', getIssueById);
router.post('/issues/:id/support', toggleSupport);

// Authority: update status on a specific issue
router.patch('/issues/:id/status', updateIssueStatus);

// Authority: submit resolution with completion photo
router.post('/issues/:id/resolution', uploadSingleImage, submitResolution);

// Admin: review a specific resolution
router.post('/issues/:id/resolution/review', adminReviewResolution);

export default router;
