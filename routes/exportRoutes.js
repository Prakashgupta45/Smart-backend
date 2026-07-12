import express from 'express';
import { exportPDF, exportMarkdown } from '../controllers/exportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/pdf/:id', protect, exportPDF);
router.get('/export/markdown/:id', protect, exportMarkdown);

export default router;
