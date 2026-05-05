import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC7gMyfw-HVd2bIfbvipBxkAp-XYhoq-_M",
  authDomain: "smartcare-c9420.firebaseapp.com",
  projectId: "smartcare-c9420",
  storageBucket: "smartcare-c9420.firebasestorage.app",
  messagingSenderId: "702302005567",
  appId: "1:702302005567:web:xxxxxxxxxxxxxxxxxxxx" // appId is optional for Phone Auth
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
