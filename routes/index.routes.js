const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/authe');
const supabase = require('../config/supabase.config');
const upload = require('../config/multer.config');
const fileModel = require('../models/files.models');
const { v4: uuidv4 } = require('uuid');

// GET Home Page with user files
router.get('/home', authMiddleware, async (req, res) => {
  const userFiles = await fileModel.find({
    user: req.user.userId,
  });

  res.render('home', {
    files: userFiles,
  });
});

// POST Upload File
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const uniqueFileName = `uploads/${uuidv4()}-${file.originalname}`;

    const { data, error } = await supabase.storage
      .from('my-drive-bucket')
      .upload(uniqueFileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const newFile = await fileModel.create({
      path: uniqueFileName,
      originalName: file.originalname,
      user: req.user.userId,
    });

    res.json({ message: 'File uploaded successfully', file: newFile });
  } catch (err) {
    console.error('Upload exception:', err.message);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// GET Download file with signed URL
router.get('/download/:encodedPath', authMiddleware, async (req, res) => {
  const loggedInUserId = req.user.userId;
  const encodedPath = req.params.encodedPath;
  const decodedPath = decodeURIComponent(encodedPath);

  try {
    const file = await fileModel.findOne({
      user: loggedInUserId,
      path: decodedPath,
    });

    if (!file) {
      return res.status(403).json({ message: 'Unauthorized or file not found' });
    }

    const { data, error } = await supabase.storage
      .from('my-drive-bucket')
      .createSignedUrl(decodedPath, 60);

    if (error) {
      console.error('Signed URL error:', error.message);
      return res.status(500).json({ error: 'Could not generate download URL' });
    }

    res.redirect(data.signedUrl);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).json({ error: 'Server error during download' });
  }
});

module.exports = router;
