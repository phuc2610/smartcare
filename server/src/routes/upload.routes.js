const express = require('express');
const router = express.Router();
const { uploadImage, uploadMiddleware } = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth');

router.post('/image', authenticate, uploadMiddleware, uploadImage);

module.exports = router;





