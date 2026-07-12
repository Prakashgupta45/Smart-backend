import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates all structured study aids from a lecture transcript.
 * @param {string} transcript - The transcript text.
 * @returns {Promise<Object>} The structured JSON matching the lecture schema.
 */
export const generateLectureSummaries = async (transcript) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set. Generating mock study aids.');
    return getMockStudyAids();
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-1.5-flash for speed and JSON output support
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      You are an expert AI learning companion. Analyze the lecture transcript below and extract structured study materials.
      You must respond with a JSON object adhering EXACTLY to the following schema:
      
      {
        "shortSummary": "A concise 2-3 sentence overview of the lecture.",
        "detailedNotes": "Detailed, comprehensive study notes in Markdown format covering all concepts from the lecture.",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
        "definitions": [
          { "term": "Term Name", "definition": "Clear explanation of the term from the lecture." }
        ],
        "formulas": ["Mathematical formula or equation, or empty array if none"],
        "examples": ["Real-world example or use-case described in the lecture"],
        "actionItems": ["Actionable next step for the student based on this lecture, or generic revision step"],
        "learningObjectives": ["What the student should understand after studying this lecture"],
        "flashcards": [
          { "question": "Clear question?", "answer": "Concise answer." }
        ],
        "quiz": [
          {
            "question": "A multiple choice question testing a concept from the lecture?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": "The exact string representing the correct option",
            "explanation": "Why this answer is correct."
          }
        ],
        "mindMap": {
          "name": "Main Lecture Subject",
          "children": [
            {
              "name": "Topic A",
              "children": [
                { "name": "Detail A1" },
                { "name": "Detail A2" }
              ]
            },
            {
              "name": "Topic B",
              "children": [
                { "name": "Detail B1" }
              ]
            }
          ]
        }
      }
      
      Transcript:
      ---
      ${transcript}
      ---
      
      Ensure you extract at least 4 flashcards, 4 quiz questions, and a detailed mind map with at least 3-4 main branches.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error generating AI summary from Gemini:', error);
    // Fallback to mock in case of failure (API limit, quota, parsing error)
    return getMockStudyAids();
  }
};

/**
 * Chat with a lecture transcript, strictly keeping inside the transcript boundaries
 * @param {string} transcript - The transcript text.
 * @param {Array} chatHistory - Previous messages
 * @param {string} question - Current user question
 */
export const chatWithLecture = async (transcript, chatHistory, question) => {
  if (!process.env.GEMINI_API_KEY) {
    // Local development mock chatbot
    if (question.toLowerCase().includes('deadlock') || question.toLowerCase().includes('scheduling') || question.toLowerCase().includes('process')) {
      return "Based on the lecture transcript (demo): An operating system manages processes, CPU scheduling (using algorithms like FCFS and Round Robin), and handles deadlocks, which occur when processes are mutually blocked waiting for resources.";
    } else {
      return "This topic is not covered in this lecture.";
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Format chat history for context
    const formattedHistory = chatHistory
      .map((msg) => `${msg.sender === 'user' ? 'Student' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    const prompt = `
      You are an AI teaching assistant. You help students study a lecture.
      Here is the exact transcript of the lecture:
      ---
      ${transcript}
      ---
      
      Rules:
      1. Answer the user's question ONLY using the facts and information explicitly mentioned in the transcript.
      2. Do not extrapolate, make up facts, or use general outside knowledge.
      3. If the user's question cannot be answered using ONLY the transcript, you MUST reply exactly with: "This topic is not covered in this lecture."
      
      Previous Chat History:
      ${formattedHistory}
      
      Student's Question: "${question}"
      Assistant:
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error in chatWithLecture:', error);
    return "This topic is not covered in this lecture.";
  }
};

// Mock structure in case API keys are missing or quota exceeded
const getMockStudyAids = () => {
  return {
    shortSummary: "This lecture covers the fundamental concepts of Operating Systems, focusing on CPU Scheduling, Process and Thread Management, and the conditions leading to Deadlocks.",
    detailedNotes: `# Operating Systems Concepts\n\n## Introduction to OS\nAn operating system (OS) is software that acts as an interface between computer hardware and the user. It is responsible for process management, memory management, and resource allocation.\n\n## CPU Scheduling\nCPU Scheduling is the process by which the OS allocates CPU core time to runnable processes. Common algorithms include:\n* **First-Come-First-Serve (FCFS)**: Non-preemptive, simple queue-based scheduling.\n* **Shortest Job First (SJF)**: Minimizes average waiting time.\n* **Round Robin (RR)**: Preemptive scheduling designed for time-sharing systems where each process gets a small unit of CPU time (time quantum).\n\n## Deadlocks\nA deadlock occurs when two or more processes are blocked forever, each holding a resource and waiting for another resource held by some other process. The four Coffman conditions for a deadlock are:\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait`,
    keyPoints: [
      "An Operating System coordinates hardware resources and provides interfaces for user programs.",
      "Processes represent programs in active execution, while threads are the smallest execution units.",
      "CPU Scheduling algorithms balance execution efficiency and waiting times.",
      "Deadlock occurs when circular wait requirements block progress for multiple processes."
    ],
    definitions: [
      { "term": "Operating System", "definition": "A program that manages a computer's hardware, resource allocation, and application environments." },
      { "term": "Process", "definition": "A program in execution, consisting of program code, current activity, and memory structures." },
      { "term": "Deadlock", "definition": "A state in which each member of a group of actions is waiting for some other member to release a resource." }
    ],
    formulas: [
      "Average Waiting Time = (Total Waiting Time of all processes) / (Number of processes)",
      "Turnaround Time = Completion Time - Arrival Time"
    ],
    examples: [
      "In FCFS, if Process A arrives at t=0 taking 10s and B at t=1 taking 2s, B must wait 9s, demonstrating the convoy effect.",
      "Deadlock analogy: A narrow one-way bridge where two cars meet head-on and neither can back up."
    ],
    actionItems: [
      "Review the four conditions of Deadlocks.",
      "Compare FCFS, SJF, and Round Robin scheduling algorithms on sample process queues."
    ],
    learningObjectives: [
      "Explain the fundamental role of an Operating System.",
      "Calculate process waiting and turnaround times under FCFS and Round Robin scheduling.",
      "Identify deadlock situations and state the four necessary conditions."
    ],
    flashcards: [
      { "question": "What is the difference between a process and a thread?", "answer": "A process is a program in execution with its own memory space, while a thread is a lightweight execution unit inside a process that shares the process's memory." },
      { "question": "What is preemptive scheduling?", "answer": "A scheduling method where the OS can interrupt a running process and allocate the CPU to another process, prioritizing resources dynamically." },
      { "question": "What is the Convoy Effect?", "answer": "A phenomenon in FCFS scheduling where short processes must wait a long time for a single long process to release the CPU." },
      { "question": "Name the four conditions required for a Deadlock.", "answer": "1. Mutual Exclusion, 2. Hold and Wait, 3. No Preemption, 4. Circular Wait." }
    ],
    quiz: [
      {
        "question": "Which CPU scheduling algorithm gives each process a fixed time quantum to run?",
        "options": ["First-Come-First-Serve (FCFS)", "Shortest Job First (SJF)", "Round Robin (RR)", "Priority Scheduling"],
        "correctAnswer": "Round Robin (RR)",
        "explanation": "Round Robin scheduling assigns a small, fixed time slice (quantum) to each process in a cyclic order."
      },
      {
        "question": "Which of the following is NOT one of the four Coffman conditions for deadlock?",
        "options": ["Mutual Exclusion", "No Preemption", "Resource Preemption", "Circular Wait"],
        "correctAnswer": "Resource Preemption",
        "explanation": "No Preemption is a condition; resource preemption is actually a method to prevent or resolve deadlocks."
      },
      {
        "question": "What is the state of a program that is loaded into memory and being executed by the CPU?",
        "options": ["Program", "Process", "Thread", "System Call"],
        "correctAnswer": "Process",
        "explanation": "A process is defined as a program in execution."
      }
    ],
    mindMap: {
      "name": "Operating System Core",
      "children": [
        {
          "name": "Process Management",
          "children": [
            { "name": "Processes vs Threads" },
            { "name": "States: Ready, Running, Blocked" }
          ]
        },
        {
          "name": "CPU Scheduling",
          "children": [
            { "name": "Algorithms (FCFS, SJF, RR)" },
            { "name": "Performance Criteria (Latency, Throughput)" }
          ]
        },
        {
          "name": "Deadlocks",
          "children": [
            { "name": "Coffman Conditions" },
            { "name": "Prevention & Avoidance" }
          ]
        }
      ]
    }
  };
};
