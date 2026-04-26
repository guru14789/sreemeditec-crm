
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

async function checkCollections() {
  const collections = ["invoices", "archives", "archived_reports"];
  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    console.log(`Collection ${col}: ${snap.size} documents`);
    if (snap.size > 0) {
      console.log(`First doc of ${col}:`, JSON.stringify(snap.docs[0].data(), null, 2).slice(0, 500));
    }
  }
}

checkCollections();
