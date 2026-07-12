import express from 'express';
import {
  uploadLecture,
  getAllLectures,
  getLectureById,
  deleteLecture,
} from '../controllers/lectureController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadLecture);
router.get('/lectures', protect, getAllLectures);
router.get('/lecture/:id', protect, getLectureById);
router.delete('/lecture/:id', protect, deleteLecture);

export default router;
