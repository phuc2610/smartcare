import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB2iXDCexjrjVPEqrvY_TBgHmdE2kI_MJs",
  authDomain: "smartcare-60c3b.firebaseapp.com",
  projectId: "smartcare-60c3b",
  storageBucket: "smartcare-60c3b.firebasestorage.app",
  messagingSenderId: "126128573471",
  appId: "1:126128573471:web:134dc4cc1819f2b5da992a" // Placeholder, Auth mainly needs apiKey and authDomain
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
