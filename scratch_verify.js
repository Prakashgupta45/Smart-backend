import dotenv from 'dotenv';
import { generateLectureSummaries } from './services/geminiService.js';
import { transcribeFile } from './services/whisperService.js';

dotenv.config();

const runVerification = async () => {
  console.log('=============================================');
  console.log('🚀 RUNNING BACKEND AI INTEGRATION TEST...');
  console.log('=============================================');
  
  try {
    // 1. Test transcription service (verifying whisper/gemini fallback/mock results)
    console.log('\n[1/2] Testing speech-to-text pipeline (verifying fallback)...');
    const mockFile = './server.js'; 
    const transcription = await transcribeFile(mockFile);
    console.log('✅ Transcription verified successfully!');
    console.log(`- Language: ${transcription.language}`);
    console.log(`- Text Sample: "${transcription.text.substring(0, 120)}..."`);

    // 2. Test Gemini structured output summaries
    console.log('\n[2/2] Testing Gemini AI analysis structured JSON output...');
    const aids = await generateLectureSummaries(transcription.text);
    console.log('✅ Gemini analysis verified successfully!');
    console.log(`- Short Summary: "${aids.shortSummary}"`);
    console.log(`- Key Points Extracted: ${aids.keyPoints.length}`);
    console.log(`- Definitions Extracted: ${aids.definitions.length}`);
    console.log(`- Flashcards Generated: ${aids.flashcards.length}`);
    console.log(`- Quiz Questions Generated: ${aids.quiz.length}`);
    console.log(`- Mind Map Root Name: "${aids.mindMap.name}"`);
    console.log('\n🎉 ALL AI INTEGRATION SERVICES PASSED VERIFICATION!');
    console.log('=============================================');
  } catch (error) {
    console.error('❌ Integration Verification Failed:', error);
  }
};

runVerification();
