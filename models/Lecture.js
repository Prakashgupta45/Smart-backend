import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'audio', 'video'],
      required: true,
    },
    transcript: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'en',
    },
    duration: {
      type: Number, // in seconds (for audio/video)
      default: 0,
    },
    summary: {
      shortSummary: { type: String, default: '' },
      detailedNotes: { type: String, default: '' },
      keyPoints: { type: [String], default: [] },
      definitions: [
        {
          term: String,
          definition: String,
        },
      ],
      formulas: { type: [String], default: [] },
      examples: { type: [String], default: [] },
      actionItems: { type: [String], default: [] },
      learningObjectives: { type: [String], default: [] },
    },
    flashcards: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        isLearned: { type: Boolean, default: false },
      },
    ],
    quiz: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: { type: String, required: true },
        explanation: { type: String, default: '' },
      },
    ],
    mindMap: {
      type: mongoose.Schema.Types.Mixed, // Storing reactflow style nodes and edges or raw JSON hierarchical structure
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB Indexing for text search inside title and transcript
lectureSchema.index({ title: 'text', transcript: 'text' });

const Lecture = mongoose.model('Lecture', lectureSchema);
export default Lecture;
