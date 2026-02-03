
import { db } from '../firebase';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { Product } from '../types';

export const updateProductStock = async (productId: string, quantityChange: number, reason: string, userId: string) => {
  const productRef = doc(db, "products", productId);
  const movementRef = doc(collection(db, "stockMovements"));

  return runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) throw new Error("Product not found");

    const currentStock = productSnap.data().stock;
    const newStock = currentStock + quantityChange;

    if (newStock < 0) throw new Error("Insufficient inventory");

    transaction.update(productRef, { 
      stock: newStock, 
      updatedAt: serverTimestamp() 
    });

    transaction.set(movementRef, {
      productId,
      productName: productSnap.data().name,
      type: quantityChange > 0 ? 'In' : 'Out',
      quantity: Math.abs(quantityChange),
      date: new Date().toISOString().split('T')[0],
      reference: reason,
      createdBy: userId,
      createdAt: serverTimestamp()
    });
  });
};
