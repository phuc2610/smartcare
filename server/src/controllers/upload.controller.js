/**
 * UPLOAD CONTROLLER - Xử lý upload ảnh lên Cloudinary
 * Chức năng: Upload ảnh từ client lên Cloudinary, trả về URL và publicId
 */

const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Cấu hình multer: lưu file vào memory (không lưu vào disk), giới hạn 5MB
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Upload ảnh lên Cloudinary
 * Luồng: Kiểm tra file có tồn tại -> Upload lên Cloudinary (từ buffer) -> Trả về URL và publicId
 */
const uploadImage = async (req, res) => {
  try {
    // Kiểm tra file đã được upload chưa (từ multer middleware)
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload file lên Cloudinary từ buffer (file đã được load vào memory bởi multer)
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || 'smartcare', // Thư mục lưu trên Cloudinary
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Ghi buffer vào upload stream
      uploadStream.end(req.file.buffer);
    });

    // Trả về URL ảnh (HTTPS) và publicId (để xóa sau này nếu cần)
    res.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
};

module.exports = {
  uploadImage,
  uploadMiddleware: upload.single('image'),
};


