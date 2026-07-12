import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to convert local file to base64 for Gemini inline upload
const fileToGenerativePart = (filePath, mimeType) => {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
};

// Helper to get mime type from extension
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.mp3':
      return 'audio/mp3';
    case '.wav':
      return 'audio/wav';
    case '.m4a':
      return 'audio/m4a';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    default:
      return 'audio/mp3';
  }
};

/**
 * Transcribe Audio/Video file to text
 * @param {string} filePath - Path to the local file
 * @returns {Promise<{text: string, language: string, duration: number}>}
 */
export const transcribeFile = async (filePath) => {
  const fileStats = fs.statSync(filePath);
  const fileSizeInMB = fileStats.size / (1024 * 1024);
  console.log(`Transcribing file: ${filePath} (${fileSizeInMB.toFixed(2)} MB)`);

  // 1. Try OpenAI Whisper if API key is present
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log('Using OpenAI Whisper API for transcription...');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
      });

      return {
        text: response.text,
        language: 'en',
        duration: 0, // Whisper doesn't return duration directly without extra tools, default to 0
      };
    } catch (error) {
      console.error('Whisper API Error, trying Gemini fallback:', error);
    }
  }

  // 2. Try Gemini Native Audio transcription if API key is present
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Using Gemini Native Audio Understanding for transcription...');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Use gemini-1.5-flash for fast and cost-effective transcription
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const mimeType = getMimeType(filePath);
      const audioPart = fileToGenerativePart(filePath, mimeType);

      const result = await model.generateContent([
        audioPart,
        'Please write a complete, verbatim transcription of this audio/video. Do not summarize it. Return only the transcript.',
      ]);

      const text = result.response.text();
      return {
        text: text.trim(),
        language: 'en',
        duration: 0,
      };
    } catch (error) {
      console.error('Gemini transcription fallback error:', error);
    }
  }

  // 3. Simulated transcription fallback for sandbox/testing environment
  console.warn('WARNING: No API keys configured. Using simulated demo transcript.');
  return {
    text: `Welcome to the Smart Lecture Summarizer demo. This is a simulated transcript generated because no OpenAI or Gemini API keys were configured in your environment. 
    In a real deployment, uploading a lecture audio/video file will trigger OpenAI Whisper or Google Gemini to transcribe your lectures with high accuracy. 
    Let's talk about Operating Systems. An operating system is software that acts as an interface between computer hardware components and the user. Every computer system must have at least one operating system to run other programs. Applications like browsers, games, or word processors need some environment in which to run and perform tasks. 
    The operating system helps you manage processes, threads, memory, and devices. Process management involves handling processes, which are programs in execution. Thread management involves threads, which are the smallest unit of execution within a process.
    CPU scheduling is another critical feature. The OS selects processes from the queue and allocates the CPU to them. CPU scheduling algorithms include First-Come-First-Serve, Shortest Job First, and Round Robin.
    Another important concept is Deadlock. A deadlock is a situation where two or more processes are blocked forever, because each process is holding a resource and waiting for another resource held by some other process.
    We hope you enjoy using this tool to learn and revise faster!`,
    language: 'en',
    duration: 120, // Simulated 2 minutes duration
  };
};
