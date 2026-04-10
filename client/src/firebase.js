import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  projectId: "pdfinance-58751",
  storageBucket: "pdfinance-58751.appspot.com",
  appId: "1:748924403166:web:865187e83868065f41295b"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
