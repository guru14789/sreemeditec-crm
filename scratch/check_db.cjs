
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD0mlqOrMgpc0F5mlwunK033gD9KYyYUJ4",
  authDomain: "sreemeditec-app.firebaseapp.com",
  projectId: "sreemeditec-app",
  storageBucket: "sreemeditec-app.firebasestorage.app",
  messagingSenderId: "376656303612",
  appId: "1:376656303612:web:bc844a8db07b329d1a0e79",
  measurementId: "G-BJMPX7QYZX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
  const collections = ["invoices", "archives", "archived_reports"];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`Collection ${col}: ${snap.size} documents`);
      if (snap.size > 0) {
        const types = new Set();
        snap.forEach(d => types.add(d.data().documentType || 'undefined'));
        console.log(`  Document types in ${col}:`, Array.from(types));
        console.log(`  Sample doc:`, JSON.stringify(snap.docs[0].data()).slice(0, 200));
      }
    } catch (err) {
      console.error(`Error fetching ${col}:`, err.message);
    }
  }
}

checkCollections();
