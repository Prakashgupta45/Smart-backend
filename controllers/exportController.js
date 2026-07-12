import PDFDocument from 'pdfkit';
import Lecture from '../models/Lecture.js';

// @desc    Export lecture summary as PDF
// @route   GET /api/pdf/:id
// @access  Private
export const exportPDF = async (req, res) => {
  try {
    const lecture = await Lecture.findOne({ _id: req.params.id, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Initialize PDF Document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      info: {
        Title: `${lecture.title} - AI Summary`,
        Author: 'Smart Lecture Summarizer',
      },
    });

    // Stream PDF directly to HTTP response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${lecture.title.replace(/[^a-zA-Z0-9]/g, '_')}_summary.pdf"`
    );
    doc.pipe(res);

    // Header Design (Purple Theme #7C3AED)
    doc.fillColor('#7C3AED').fontSize(26).text(lecture.title, { align: 'center' });
    doc.fillColor('#4B5563').fontSize(10).text(`Study guide generated on ${new Date(lecture.createdAt).toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Draw horizontal rule line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
    doc.moveDown(1.5);

    // 1. Short Summary Section
    doc.fillColor('#1F2937').fontSize(16).text('Overview', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#374151').fontSize(11).text(lecture.summary.shortSummary || 'No summary available.', { align: 'justify' });
    doc.moveDown(2);

    // 2. Key Points Section
    if (lecture.summary.keyPoints && lecture.summary.keyPoints.length > 0) {
      doc.fillColor('#1F2937').fontSize(16).text('Key Takeaways', { underline: true });
      doc.moveDown(0.5);
      lecture.summary.keyPoints.forEach((point) => {
        doc.fillColor('#374151').fontSize(11).text(`• ${point}`);
        doc.moveDown(0.3);
      });
      doc.moveDown(1.5);
    }

    // 3. Definitions Section
    if (lecture.summary.definitions && lecture.summary.definitions.length > 0) {
      doc.fillColor('#1F2937').fontSize(16).text('Key Definitions', { underline: true });
      doc.moveDown(0.5);
      lecture.summary.definitions.forEach((def) => {
        doc.fillColor('#1F2937').fontSize(11).text(`${def.term}: `, { bold: true, continued: true });
        doc.fillColor('#374151').text(def.definition);
        doc.moveDown(0.4);
      });
      doc.moveDown(1.5);
    }

    // 4. Formulas Section
    if (lecture.summary.formulas && lecture.summary.formulas.length > 0 && lecture.summary.formulas[0] !== '') {
      doc.fillColor('#1F2937').fontSize(16).text('Formulas & Equations', { underline: true });
      doc.moveDown(0.5);
      lecture.summary.formulas.forEach((formula) => {
        doc.fillColor('#374151').fontSize(11).text(`  - ${formula}`);
        doc.moveDown(0.3);
      });
      doc.moveDown(1.5);
    }

    // Add New Page for Detailed Notes
    doc.addPage();
    doc.fillColor('#7C3AED').fontSize(20).text('Detailed Lecture Notes', { align: 'left' });
    doc.moveDown(1);
    doc.fillColor('#374151').fontSize(10.5).text(lecture.summary.detailedNotes || 'No notes available.', { align: 'justify' });
    doc.moveDown(2);

    // 5. Flashcards Section
    if (lecture.flashcards && lecture.flashcards.length > 0) {
      doc.addPage();
      doc.fillColor('#7C3AED').fontSize(20).text('Study Flashcards', { align: 'left' });
      doc.moveDown(1);

      lecture.flashcards.forEach((card, idx) => {
        doc.fillColor('#1F2937').fontSize(11).text(`Q${idx + 1}: ${card.question}`, { bold: true });
        doc.fillColor('#4B5563').fontSize(10.5).text(`A: ${card.answer}`);
        doc.moveDown(0.8);
      });
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export lecture summary as Markdown file
// @route   GET /api/export/markdown/:id
// @access  Private
export const exportMarkdown = async (req, res) => {
  try {
    const lecture = await Lecture.findOne({ _id: req.params.id, userId: req.user._id });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    let markdown = `# ${lecture.title}\n\n`;
    markdown += `Generated on: ${new Date(lecture.createdAt).toLocaleString()}\n\n`;
    
    markdown += `## Short Summary\n${lecture.summary.shortSummary}\n\n`;
    
    if (lecture.summary.keyPoints.length > 0) {
      markdown += `## Key Takeaways\n`;
      lecture.summary.keyPoints.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += `\n`;
    }

    if (lecture.summary.definitions.length > 0) {
      markdown += `## Definitions\n`;
      lecture.summary.definitions.forEach(def => {
        markdown += `* **${def.term}**: ${def.definition}\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Detailed Lecture Notes\n${lecture.summary.detailedNotes}\n\n`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${lecture.title.replace(/[^a-zA-Z0-9]/g, '_')}_notes.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('Markdown export error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
