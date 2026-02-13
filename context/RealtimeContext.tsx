
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit,
    doc,
    updateDoc,
    serverTimestamp,
    DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';

interface RealtimeContextType {
    tasks: Task[];
    isOnline: boolean;
    loading: boolean;
    error: string | null;
    updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

/**
 * Singleton Listener Provider
 * Optimizes reads by sharing a single Firestore listener across the app
 */
export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Monitor connectivity
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Singleton Listener for Tasks
    useEffect(() => {
        const q = query(
            collection(db, 'tasks'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const taskList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Task));
                setTasks(taskList);
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    /**
     * Optimized Write Function
     * Uses serverTimestamp for consistency
     */
    const updateTask = async (taskId: string, updates: Partial<Task>) => {
        const taskRef = doc(db, 'tasks', taskId);
        try {
            await updateDoc(taskRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Update failed:", err);
            throw err;
        }
    };

    return (
        <RealtimeContext.Provider value={{ tasks, isOnline, loading, error, updateTask }}>
            {children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = () => {
    const context = useContext(RealtimeContext);
    if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
    return context;
};
