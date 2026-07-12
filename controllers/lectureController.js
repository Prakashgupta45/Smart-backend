import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import cloudinary from '../config/cloudinary.js';
import Lecture from '../models/Lecture.js';
import { transcribeFile } from '../services/whisperService.js';
import { generateLectureSummaries } from '../services/geminiService.js';

// @desc    Upload & process new lecture (Audio/Video/PDF)
// @route   POST /api/lectures/upload
// @access  Private
export const uploadLecture = async (req, res) => {
  let filePath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    filePath = req.file.path;
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    const title = req.body.title || originalName.substring(0, originalName.lastIndexOf('.')) || originalName;

    let fileType = 'audio';
    if (fileExtension === '.pdf') {
      fileType = 'pdf';
    } else if (['.mp4', '.webm'].includes(fileExtension)) {
      fileType = 'video';
    }

    console.log(`Processing file: ${originalName} as type: ${fileType}`);

    let transcript = '';
    let language = 'en';
    let duration = 0;

    // 1. Process File based on Type
    if (fileType === 'pdf') {
      console.log('Parsing PDF contents...');
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      transcript = pdfData.text || '';
      if (!transcript.trim()) {
        throw new Error('The PDF file appears to be empty or lacks extractable text.');
      }
    } else {
      // Audio or Video transcription
      console.log('Transcribing audio/video file...');
      const transcriptionResult = await transcribeFile(filePath);
      transcript = transcriptionResult.text;
      language = transcriptionResult.language || 'en';
      duration = transcriptionResult.duration || 0;
    }

    if (!transcript.trim()) {
      throw new Error('Failed to extract or transcribe text from the uploaded file.');
    }

    // 2. Upload file to Cloudinary with local storage failover
    let fileUrl = '';
    let isUploadedToCloudinary = false;

    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        console.log('Uploading file to Cloudinary...');
        const cloudinaryResponse = await cloudinary.uploader.upload(filePath, {
          resource_type: 'auto',
          folder: 'smart_lecture_summarizer',
          public_id: path.parse(req.file.filename).name,
        });
        fileUrl = cloudinaryResponse.secure_url;
        isUploadedToCloudinary = true;
        console.log(`Uploaded file url (Cloudinary): ${fileUrl}`);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, falling back to local file storage:', cloudinaryError.message);
      }
    }

    if (!fileUrl) {
      console.log('Using local server storage failover...');
      const host = req.get('host');
      const protocol = req.protocol;
      fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      console.log(`Served file URL (Local): ${fileUrl}`);
    }

    // 3. Send transcript to Gemini to generate summaries, quizzes, flashcards, mindMap
    console.log('Triggering Gemini AI analysis engine...');
    const aiSummaryResult = await generateLectureSummaries(transcript);

    // 4. Save to Database
    const lecture = await Lecture.create({
      userId: req.user._id,
      title,
      fileUrl,
      fileType,
      transcript,
      language,
      duration,
      summary: {
        shortSummary: aiSummaryResult.shortSummary || '',
        detailedNotes: aiSummaryResult.detailedNotes || '',
        keyPoints: aiSummaryResult.keyPoints || [],
        definitions: aiSummaryResult.definitions || [],
        formulas: aiSummaryResult.formulas || [],
        examples: aiSummaryResult.examples || [],
        actionItems: aiSummaryResult.actionItems || [],
        learningObjectives: aiSummaryResult.learningObjectives || [],
      },
      flashcards: aiSummaryResult.flashcards || [],
      quiz: aiSummaryResult.quiz || [],
      mindMap: aiSummaryResult.mindMap || {},
    });

    console.log(`Lecture created successfully: ${lecture._id}`);

    // 5. Clean up local temporary file ONLY if it was moved to Cloudinary
    if (isUploadedToCloudinary && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(201).json({
      success: true,
      data: lecture,
    });
  } catch (error) {
    console.error('Upload & Processing error:', error);
    // Cleanup file in case of error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting temp file on crash:', err);
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all lectures for user
// @route   GET /api/lectures
// @access  Private
export const getAllLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: lectures.length,
      data: lectures,
    });
  } catch (error) {
    console.error('Get all lectures error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get lecture by ID
// @route   GET /api/lectures/:id
// @access  Private
export const getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findOne({ _id: req.params.id, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    res.json({
      success: true,
      data: lecture,
    });
  } catch (error) {
    console.error('Get lecture by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete lecture
// @route   DELETE /api/lectures/:id
// @access  Private
export const deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findOne({ _id: req.params.id, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Try to delete from Cloudinary
    try {
      // Extract public_id from secure_url
      // Example url: https://res.cloudinary.com/cloudname/video/upload/v12345/folder/filename.mp4
      const parts = lecture.fileUrl.split('/');
      const folderIdx = parts.indexOf('smart_lecture_summarizer');
      if (folderIdx !== -1) {
        // public_id is "smart_lecture_summarizer/filename" without extension
        const rawFilename = parts.slice(folderIdx).join('/');
        const publicId = rawFilename.substring(0, rawFilename.lastIndexOf('.'));
        console.log(`Deleting file from Cloudinary public_id: ${publicId}`);

        let resourceType = 'raw'; // Default for PDFs
        if (lecture.fileType === 'audio' || lecture.fileType === 'video') {
          resourceType = 'video';
        }
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }
    } catch (clErr) {
      console.error('Cloudinary deletion failed:', clErr);
    }

    await lecture.deleteOne();

    res.json({
      success: true,
      message: 'Lecture deleted successfully',
    });
  } catch (error) {
    console.error('Delete lecture error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
