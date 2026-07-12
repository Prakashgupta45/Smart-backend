import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the local uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.mp3', '.wav', '.mp4', '.m4a', '.webm', '.mpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        `File type not allowed. Allowed: PDF, MP3, WAV, MP4, M4A, WEBM.`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit for video/audio
  },
});

export default upload;
