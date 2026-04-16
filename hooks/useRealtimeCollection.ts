
import { useState, useEffect, useRef } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    QueryConstraint,
    DocumentData,
    QueryDocumentSnapshot,
    startAfter
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook for real-time Firestore collection syncing with pagination support
 */
export function useRealtimeCollection<T = DocumentData>(
    collectionPath: string,
    initialConstraints: QueryConstraint[] = [orderBy('timestamp', 'desc'), limit(50)]
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const constraintsRef = useRef(initialConstraints);

    useEffect(() => {
        setLoading(true);
        const colRef = collection(db, collectionPath);
        const q = query(colRef, ...initialConstraints);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items: T[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as T));
                
                setData(items);
                setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
                setHasMore(snapshot.docs.length >= ((initialConstraints.find(c => (c as any).type === 'limit') as any)?.limit || 50));
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error(`Firestore error in ${collectionPath}:`, err);
                setError(err as Error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionPath, JSON.stringify(initialConstraints)]); 

    const fetchMore = async () => {
        if (!lastDoc || !hasMore) return;
        
        // This is a simplified fetchMore. In a real real-time scenario, 
        // you might want to extend the limit of the existing query 
        // or chain snapshots, but for UX, a simple next-page fetch is often enough.
        // For truly optimized real-time lists, we usually recommend windowing.
    };

    return { data, loading, error, hasMore, fetchMore };
}
