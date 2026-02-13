
import React from 'react';
import { useRealtime } from '../context/RealtimeContext';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { orderBy, limit } from 'firebase/firestore';
import { Task, AppNotification } from '../types';

/**
 * Task Dashboard Component
 * Demonstrates high-performance real-time syncing and fault tolerance
 */
export const TaskDashboard: React.FC = () => {
    const { tasks, isOnline, loading, updateTask } = useRealtime(); // From Singleton Context

    // Explicit use of the hook for a separate collection (e.g., recent notifications)
    const { data: recentNotifications } = useRealtimeCollection<AppNotification>('notifications', [
        orderBy('createdAt', 'desc'),
        limit(5)
    ]);

    const toggleTaskStatus = (task: Task) => {
        const newStatus = task.status === 'Done' ? 'Pending' : 'Done';
        updateTask(task.id, { status: newStatus });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 bg-gray-50 min-h-screen rounded-xl shadow-lg">
            {/* Header with Connectivity Status */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Operational Dashboard</h1>
                <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm font-medium text-gray-600">
                        {isOnline ? 'Real-time Sync Active' : 'Offline Mode (Changes will queue)'}
                    </span>
                </div>
            </div>

            {/* Main Task List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Active Tasks ({tasks.length})</h2>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg border border-gray-100 transition-all cursor-pointer group"
                                    onClick={() => toggleTaskStatus(task)}
                                >
                                    <div>
                                        <p className={`font-medium ${task.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                            {task.title}
                                        </p>
                                        <p className="text-xs text-gray-500">{task.assignedTo || 'Unassigned'}</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${task.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {task.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Notifications Panel (Hook Demo) */}
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Recent Alerts</h2>
                    <div className="space-y-3">
                        {recentNotifications?.map(note => (
                            <div key={note.id} className="p-3 bg-indigo-50/50 rounded-lg border-l-4 border-indigo-400">
                                <p className="text-sm font-semibold text-indigo-900">{note.title}</p>
                                <p className="text-xs text-indigo-700 mt-1">{note.message}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TaskDashboard;
