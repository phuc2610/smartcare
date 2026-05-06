require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGODB_URI;

async function checkUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({}, 'name phone role isVerified createdAt');
    console.log('--- ALL USERS ---');
    users.forEach(u => console.log(`- ${u.phone} | ${u.name} | Verified: ${u.isVerified}`));
    console.log('-----------------');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

checkUsers();
