
import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    QueryConstraint,
    DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook for real-time Firestore collection syncing
 * Implements performance optimizations: limit, orderBy, and cleanup
 */
export function useRealtimeCollection<T = DocumentData>(
    collectionPath: string,
    constraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(50)]
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const colRef = collection(db, collectionPath);
        const q = query(colRef, ...constraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items: T[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as T));
                setData(items);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error(`Firestore error in ${collectionPath}:`, err);
                setError(err as Error);
                setLoading(false);
            }
        );

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [collectionPath]); // Deep comparison for constraints could be added if needed

    return { data, loading, error };
}
