require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndex() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');

  // Xem các index hiện tại
  const indexes = await usersCollection.indexes();
  console.log('Current indexes:', JSON.stringify(indexes, null, 2));

  // Xóa index phone_1 nếu tồn tại
  try {
    await usersCollection.dropIndex('phone_1');
    console.log('Dropped phone_1 index');
  } catch (e) {
    console.log('phone_1 index not found or already dropped:', e.message);
  }

  // Xóa các user tạm (Pending) không cần thiết
  const deleted = await usersCollection.deleteMany({ name: 'Pending', isEmailVerified: false });
  console.log(`Deleted ${deleted.deletedCount} pending temp users`);

  // Tạo lại index sparse đúng cách
  await usersCollection.createIndex({ phone: 1 }, { unique: true, sparse: true });
  console.log('Recreated phone_1 index as sparse');

  // Verify
  const newIndexes = await usersCollection.indexes();
  const phoneIndex = newIndexes.find(i => i.name === 'phone_1');
  console.log('New phone index:', phoneIndex);

  await mongoose.disconnect();
  console.log('Done!');
}

fixIndex().catch(console.error);
