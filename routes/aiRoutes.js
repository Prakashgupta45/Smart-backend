import express from 'express';
import {
  chatWithLectureController,
  toggleFlashcardLearned,
  recordQuizResult,
  getLectureSummaryOnly,
} from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/summary', protect, getLectureSummaryOnly);
router.post('/quiz', protect, recordQuizResult);
router.post('/flashcards', protect, toggleFlashcardLearned);
router.post('/chat', protect, chatWithLectureController);

export default router;
