import express from 'express';
import multer from 'multer';
import {
  createIssue,
  getIssues,
  routeAuthorityPreview,
  refineDescriptionWithAI
} from '../controllers/issueController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/issues', upload.single('image'), createIssue);
router.get('/issues', getIssues);
router.get('/tickets', getIssues);
router.post('/issues/route-authority', routeAuthorityPreview);
router.post('/issues/nearest-local-body', routeAuthorityPreview);
router.post('/issues/ai-refine', refineDescriptionWithAI);

export default router;
