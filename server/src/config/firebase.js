const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin using the service account key
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
  // Do not crash the app, but log clearly that Firebase Auth will fail
}

module.exports = admin;
