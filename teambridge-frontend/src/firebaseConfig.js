// Import the core initialization functions from the official Firebase SDK
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage"; // ◄ FIXED: Import storage instead of analytics

// Your web app's live Firebase configuration metrics
const firebaseConfig = {
  apiKey: "AIzaSyDBmVTHDIGJSdHUvjvFW8sIkcnOsA6nguQ",
  authDomain: "teambridge-88a7c.firebaseapp.com",
  projectId: "teambridge-88a7c",
  storageBucket: "teambridge-88a7c.firebasestorage.app",
  messagingSenderId: "1018296629025",
  appId: "1:1018296629025:web:9c51eb123673cb6bd97060",
  measurementId: "G-ND7VDPKNNN"
};

// Initialize the primary Firebase connection bridge
const app = initializeApp(firebaseConfig);

// 🔏 Export the live Storage hook globally so Profile.jsx can handle direct uploads
export const storage = getStorage(app);