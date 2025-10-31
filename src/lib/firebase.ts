// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBdLCrw5riQk3LsAHQVTPlq2Km2vL2k_uo",
  authDomain: "pinoysgbilliards.firebaseapp.com",
  projectId: "pinoysgbilliards",
  storageBucket: "pinoysgbilliards.firebasestorage.app",
  messagingSenderId: "233244916307",
  appId: "1:233244916307:web:e240abf3da2c3ec7bbe4a6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
