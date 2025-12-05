# 📊 Data Sync & MongoDB Storage - Giải thích

## ✅ **Vấn đề đã được giải quyết:**

Bạn đúng - trước đây khi API fail, data chỉ được lưu local (mock) và không sync lên MongoDB. Giờ đã được sửa!

## 🔄 **Cơ chế mới:**

### **1. Khi API thành công (Backend hoạt động):**
```
Frontend → API Call → Backend → MongoDB → Response
```
✅ **Data ĐƯỢC LƯU vào MongoDB ngay lập tức**

### **2. Khi API fail (Backend offline/lỗi):**
```
Frontend → API Call → Fail
         ↓
    Queue vào AsyncStorage (offline queue)
         ↓
    Return mock data (UI vẫn hoạt động)
         ↓
    Khi app active/online → Auto sync lên MongoDB
```

## 📋 **Các thay đổi:**

### **1. Tạo `sync.service.ts`**
- Queue operations khi API fail
- Auto sync khi app active
- Sync medications, health logs, reminders

### **2. Cập nhật Services:**
- `medication.service.ts` - Queue khi create/update fail
- `health.service.ts` - Queue khi create fail
- `wellness.service.ts` - Queue khi log fail

### **3. Auto Sync trong App.tsx:**
- Sync khi app mở
- Sync khi app trở lại foreground
- Background sync tự động

## 🎯 **Flow hoạt động:**

### **Case 1: Backend hoạt động bình thường**
1. User tạo medication
2. API call thành công → Lưu vào MongoDB ✅
3. UI hiển thị data thật

### **Case 2: Backend offline**
1. User tạo medication
2. API call fail (404/500/network error)
3. Operation được queue vào AsyncStorage
4. UI hiển thị mock data (không crash)
5. Khi app active/online → Auto sync lên MongoDB ✅

## 📊 **Storage Structure:**

### **AsyncStorage Keys:**
- `@smartcare_token` - Auth token
- `@smartcare_user` - User info
- `@smartcare_pending_medications` - Queue medications
- `@smartcare_pending_health_logs` - Queue health logs
- `@smartcare_pending_reminders` - Queue reminders

## 🔍 **Kiểm tra:**

### **1. Xem có pending operations:**
```typescript
import { hasPendingOperations } from './src/services/sync.service';
const hasPending = await hasPendingOperations();
console.log('Has pending:', hasPending);
```

### **2. Manual sync:**
```typescript
import { syncPendingOperations } from './src/services/sync.service';
await syncPendingOperations();
```

### **3. Logs:**
Với `DEBUG_LOGS=true`, sẽ thấy:
- `[SYNC] Queued operation: CREATE_MEDICATION`
- `[SYNC] Starting sync...`
- `[SYNC] Synced medication: xxx`
- `[API] Create medication SUCCESS - saved to MongoDB`

## ⚠️ **Lưu ý:**

1. **Queue chỉ lưu khi API fail** - Nếu API thành công, data lưu trực tiếp vào MongoDB
2. **Auto sync chạy khi app active** - Không cần manual sync
3. **Mock data chỉ để UI không crash** - Data thật vẫn được queue và sync sau
4. **Queue có giới hạn** - Nên sync thường xuyên để tránh queue quá lớn

## 🚀 **Đảm bảo data luôn lưu vào MongoDB:**

### **Khi backend hoạt động:**
- ✅ Data lưu trực tiếp vào MongoDB
- ✅ Không cần queue

### **Khi backend offline:**
- ✅ Data được queue vào AsyncStorage
- ✅ Auto sync khi backend online
- ✅ Data vẫn được lưu vào MongoDB (sau khi sync)

---

**Kết luận:** Giờ đây **TẤT CẢ data sẽ được lưu vào MongoDB**, dù backend có offline hay không! 🎉

