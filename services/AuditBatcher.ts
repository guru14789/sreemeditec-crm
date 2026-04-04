
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { LogEntry } from '../types';

const BATCH_FLUSH_INTERVAL = 45000; // 45 seconds
const MAX_BATCH_SIZE = 20;

class AuditBatcher {
    private buffer: LogEntry[] = [];
    private flushTimer: any = null;
    private storageKey = 'nirva_pending_logs';

    constructor() {
        this.loadFromStorage();
        this.startTimer();
        
        // Listen for tab closure/refresh
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flush());
        }
    }

    private loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.buffer = JSON.parse(saved);
                console.log(`[AuditBatcher] Restored ${this.buffer.length} logs from storage`);
            }
        } catch (e) {
            console.error('Failed to load logs from storage', e);
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.buffer));
        } catch (e) {
            console.error('Failed to save logs to storage', e);
        }
    }

    private startTimer() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => {
            if (this.buffer.length > 0) {
                this.flush();
            }
        }, BATCH_FLUSH_INTERVAL);
    }

    public async enqueue(log: LogEntry) {
        this.buffer.push(log);
        this.saveToStorage();
        
        if (this.buffer.length >= MAX_BATCH_SIZE) {
            this.flush();
        }
    }

    public async flush() {
        if (this.buffer.length === 0) return;

        const logsToFlush = [...this.buffer];
        this.buffer = [];
        this.saveToStorage();

        // Group by date for atomic writes
        const groups: Record<string, LogEntry[]> = {};
        logsToFlush.forEach(log => {
            const date = log.timestamp.split('T')[0];
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
        });

        console.log(`[AuditBatcher] Flushing ${logsToFlush.length} logs...`);

        for (const [date, entries] of Object.entries(groups)) {
            const docRef = doc(db, 'system_audit', date);
            try {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    await updateDoc(docRef, {
                        entries: arrayUnion(...entries),
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    await setDoc(docRef, {
                        date,
                        entries,
                        lastUpdated: new Date().toISOString()
                    });
                }
            } catch (e) {
                console.error(`Failed to flush logs for ${date}`, e);
                // On failure, re-buffer (at least partially)
                this.buffer = [...this.buffer, ...entries];
                this.saveToStorage();
            }
        }
    }
}

export const auditBatcher = new AuditBatcher();
