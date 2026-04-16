
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
            // Support for Capacitor/Mobile app lifecycle
            document.addEventListener('pause', () => this.flush());
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.flush();
            });
        }
    }

    private isApp(): boolean {
        return !!(window as any).Capacitor || window.location.protocol === 'capacitor:';
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
        // Mobile apps need more frequent flushing because they get killed faster
        const interval = this.isApp() ? 10000 : BATCH_FLUSH_INTERVAL; 
        
        this.flushTimer = setInterval(() => {
            if (this.buffer.length > 0) {
                this.flush();
            }
        }, interval);
    }

    public async enqueue(log: LogEntry) {
        this.buffer.push(log);
        this.saveToStorage();
        
        // If it's an app, flush more aggressively (every 5 logs instead of 20)
        const limit = this.isApp() ? 5 : MAX_BATCH_SIZE;
        
        if (this.buffer.length >= limit) {
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

        // Writing individual logs to 'logs' collection for real-time pagination
        for (const log of logsToFlush) {
            try {
                await setDoc(doc(db, 'logs', log.id), log);
            } catch (e) {
                console.error(`Failed to write log ${log.id}`, e);
                this.buffer.push(log); // Re-buffer on failure
            }
        }
        this.saveToStorage();
    }
}

export const auditBatcher = new AuditBatcher();
