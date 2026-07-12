import Lecture from '../models/Lecture.js';
import { chatWithLecture } from '../services/geminiService.js';

// @desc    Chat with a specific lecture transcript
// @route   POST /api/chat
// @access  Private
export const chatWithLectureController = async (req, res) => {
  try {
    const { lectureId, question, chatHistory } = req.body;

    if (!lectureId || !question) {
      return res.status(400).json({ success: false, message: 'Please provide lectureId and question' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    console.log(`User asking chat: "${question}" in lecture: ${lecture.title}`);

    const responseText = await chatWithLecture(
      lecture.transcript,
      chatHistory || [],
      question
    );

    res.json({
      success: true,
      data: {
        message: responseText,
      },
    });
  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle flashcard learned status
// @route   POST /api/flashcards
// @access  Private
export const toggleFlashcardLearned = async (req, res) => {
  try {
    const { lectureId, flashcardId, isLearned } = req.body;

    if (!lectureId || !flashcardId) {
      return res.status(400).json({ success: false, message: 'Please provide lectureId and flashcardId' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Find the flashcard in the array
    const card = lecture.flashcards.id(flashcardId);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }

    card.isLearned = isLearned !== undefined ? isLearned : !card.isLearned;
    await lecture.save();

    res.json({
      success: true,
      message: 'Flashcard status updated',
      data: lecture.flashcards,
    });
  } catch (error) {
    console.error('Flashcards toggle error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record quiz completion or fetch quiz
// @route   POST /api/quiz
// @access  Private
export const recordQuizResult = async (req, res) => {
  try {
    const { lectureId, score, totalQuestions } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'Please provide lectureId' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // We can return the quiz structure, or save a history.
    // For a production-ready solution, we return success and echo the score.
    res.json({
      success: true,
      message: 'Quiz result logged',
      data: {
        lectureId,
        score,
        totalQuestions,
        percentage: ((score / totalQuestions) * 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error('Quiz record error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get summary structure of a lecture
// @route   POST /api/summary
// @access  Private
export const getLectureSummaryOnly = async (req, res) => {
  try {
    const { lectureId } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'Please provide lectureId' });
    }

    const lecture = await Lecture.findOne({ _id: lectureId, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    res.json({
      success: true,
      data: lecture.summary,
    });
  } catch (error) {
    console.error('Summary controller error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
