import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import lectureRoutes from './routes/lectureRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

// Load Env variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows loading Cloudinary assets on frontend
}));

// CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting (Prevent Brute force & abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 mins
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api', lectureRoutes); // /api/upload, /api/lectures, /api/lecture/:id, /api/lecture/:id (DELETE)
app.use('/api', aiRoutes);      // /api/summary, /api/quiz, /api/flashcards, /api/chat
app.use('/api', exportRoutes);  // /api/pdf/:id, /api/export/markdown/:id

// Root Route & Health Check
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Lecture Summarizer API is running...',
    status: 'healthy',
  });
});

// Serve Static Uploads folder in local dev if needed
app.use('/uploads', express.static('uploads'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
