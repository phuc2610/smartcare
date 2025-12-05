# Hướng dẫn Setup File .env cho Backend

## ⚠️ QUAN TRỌNG: File .env là BẮT BUỘC

Backend cần file `.env` để chạy. File này chứa các thông tin nhạy cảm và KHÔNG được commit lên Git.

## 📝 Cách tạo file .env

1. **Tạo file `.env` trong thư mục `smartcare/server/`**

2. **Copy nội dung sau vào file `.env`:**

```env
NODE_ENV=development
PORT=4000

# MongoDB Atlas - Thay bằng connection string thật của bạn
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/smartcare?retryWrites=true&w=majority

# JWT Secret - Thay bằng chuỗi ngẫu nhiên bất kỳ (ít nhất 32 ký tự)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_123456789
JWT_EXPIRES_IN=7d

# Cloudinary - Lấy từ https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=smartcare

# OpenAI - Lấy từ https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_key_here
OPENAI_MODEL=gpt-4o-mini

# Optional: Google Maps API (nếu muốn dùng Google Places thay vì OpenStreetMap)
GOOGLE_MAPS_API_KEY=
```

## 🔑 Cách lấy các API Keys

### 1. MongoDB Atlas
1. Đăng ký tại https://www.mongodb.com/cloud/atlas
2. Tạo cluster miễn phí
3. Tạo database user
4. Whitelist IP (0.0.0.0/0 cho dev)
5. Copy connection string và thay `<user>`, `<pass>`, `<cluster>`

### 2. Cloudinary
1. Đăng ký tại https://cloudinary.com
2. Vào Dashboard
3. Copy `Cloud name`, `API Key`, `API Secret`

### 3. OpenAI
1. Đăng ký tại https://platform.openai.com
2. Vào API Keys section
3. Tạo API key mới
4. Copy key (bắt đầu với `sk-`)

### 4. JWT Secret
- Tạo chuỗi ngẫu nhiên bất kỳ, ít nhất 32 ký tự
- Có thể dùng: `openssl rand -base64 32` hoặc tạo ngẫu nhiên

## ✅ Kiểm tra file .env

Sau khi tạo file `.env`, chạy:

```bash
cd smartcare/server
npm install
npm run dev
```

Nếu thiếu biến môi trường, server sẽ báo lỗi khi khởi động.

## 🔒 Bảo mật

- **KHÔNG** commit file `.env` lên Git
- File `.env` đã được thêm vào `.gitignore`
- Chỉ chia sẻ `.env.example` (không có giá trị thật)

