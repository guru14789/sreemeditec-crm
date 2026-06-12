import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0mlqOrMgpc0F5mlwunK033gD9KYyYUJ4",
  authDomain: "sreemeditec-app.firebaseapp.com",
  projectId: "sreemeditec-app",
  storageBucket: "sreemeditec-app.firebasestorage.app",
  messagingSenderId: "376656303612",
  appId: "1:376656303612:web:bc844a8db07b329d1a0e79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ledgersCol = collection(db, "ledgers");
const snap = await getDocs(ledgersCol);
snap.forEach(doc => {
  const data = doc.data();
  console.log(`${doc.id} | Name: ${data.name} | Balance: ${data.currentBalance} | Group: ${data.groupId}`);
});

process.exit(0);
