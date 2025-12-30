
import React, { useState, useEffect, useMemo } from 'react';
import { Task, SubTask, TaskLog } from '../types';
import { 
    CheckSquare, Clock, Plus, User, Calendar, LayoutGrid, List as ListIcon, 
    CheckCircle2, AlertCircle, MapPin, X, MessageSquare, 
    ShieldCheck, LocateFixed, Zap, ChevronRight,
    Timer, UserPlus, AlignLeft, ListChecks, History, 
    ClipboardList, Send, Trash2, CheckCircle, RefreshCw, CalendarDays
} from 'lucide-react';
import { useData } from './DataContext';

interface TaskModuleProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    currentUser: string;
    isAdmin: boolean;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);  
    const dLon = (lon2 - lon1) * (Math.PI / 180); 
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; 
}

export const TaskModule: React.FC<TaskModuleProps> = ({ tasks, setTasks, currentUser, isAdmin }) => {
  const { addPoints, employees, addNotification, updateTaskRemote } = useData(); 
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [userPos, setUserPos] = useState<{lat: number, lng: number} | null>(null);
  useEffect(() => {
    if ("geolocation" in navigator) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn("GPS Access Denied"),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);
  
  const userWorkMode = useMemo(() => {
      const me = employees.find(e => e.name === currentUser);
      if (me?.department === 'Service' || me?.department === 'Sales') return 'Field';
      return 'Office';
  }, [currentUser, employees]);

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
      priority: 'Medium',
      dueDate: new Date().toISOString().split('T')[0],
      subTasks: []
  });

  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks; 
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.assignedTo === currentUser || t.priority === 'High' || (t.status === 'Done' && t.dueDate === todayStr));
  }, [tasks, isAdmin, currentUser]);

  const updateTaskLocal = (id: string, updates: Partial<Task>) => {
      const existing = tasks.find(t => t.id === id);
      if (!existing) return;

      const log: TaskLog = {
          id: `LOG-${Date.now()}`,
          user: currentUser,
          action: updates.status ? `Status changed to: ${updates.status}` : 
                  updates.dueDate ? `Rescheduled to: ${updates.dueDate}` : 'Updated details',
          timestamp: new Date().toLocaleTimeString()
      };

      const finalUpdates = {
          ...updates,
          logs: [...(existing.logs || []), log]
      };

      updateTaskRemote(id, finalUpdates);
  };

  const handleCreateTask = () => {
      if (!newTask.title || !newTask.assignedTo) return;
      const taskToAdd: Task = {
          id: `T-${Date.now()}`,
          title: newTask.title!,
          description: newTask.description || '',
          assignedTo: newTask.assignedTo!,
          priority: (newTask.priority as any) || 'Medium',
          status: 'To Do',
          dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
          locationName: newTask.locationName,
          coords: { lat: 12.9716, lng: 77.5946 }, 
          subTasks: [],
          logs: [{ id: 'L1', user: currentUser, action: 'Task Dispatched', timestamp: new Date().toLocaleTimeString() }]
      };
      updateTaskRemote(taskToAdd.id, taskToAdd);
      setShowAddTaskModal(false);
      setNewTask({ priority: 'Medium', dueDate: new Date().toISOString().split('T')[0], subTasks: [] });
  };

  const KanbanColumn = ({ status, title, color }: { status: Task['status'], title: string, color: string }) => {
    const columnTasks = visibleTasks.filter(t => t.status === status);
    return (
        <div className="flex-1 min-w-[280px] md:min-w-[320px] flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-inner overflow-hidden">
            <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
                    <h4 className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{title}</h4>
                </div>
                <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400">{columnTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {columnTasks.map(task => (
                    <div 
                        key={task.id} 
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${task.priority === 'High' && task.status !== 'Done' ? 'border-rose-100 dark:border-rose-900' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                        {task.exceptionRequest?.status === 'Pending' && (
                            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-400 rotate-45 translate-x-6 -translate-y-6 flex items-center justify-center pt-5 pl-2 shadow-sm">
                                <MessageSquare size={12} className="text-white -rotate-45" />
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${task.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>
                                {task.priority}
                            </span>
                        </div>
                        <h5 className="font-black text-slate-800 dark:text-slate-100 text-[12px] md:text-[13px] uppercase tracking-tight mb-2 leading-tight">{task.title}</h5>
                        <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                             <div className="flex items-center gap-2"><User size={12}/> {task.assignedTo.split(' ')[0]}</div>
                             <div className="flex items-center gap-1"><Calendar size={12}/> {task.dueDate}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden relative">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
            <div className="flex items-center gap-5">
                <div className="p-4 bg-gradient-to-br from-indigo-600 to-medical-600 rounded-[1.5rem] text-white shadow-xl"><CheckSquare size={24} /></div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none">Fleet Operations</h2>
                    <p className="text-[10px] font-black text-indigo-600 uppercase mt-2 tracking-[0.2em]">{isAdmin ? 'ADMIN COMMAND CENTER' : 'FIELD AGENT TERMINAL'}</p>
                </div>
            </div>
            {isAdmin && (
                <button onClick={() => setShowAddTaskModal(true)} className="bg-[#022c22] text-white px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2">
                    <Plus size={16} /> Dispatch Job
                </button>
            )}
        </div>

        <div className="flex-1 flex gap-4 md:gap-6 overflow-x-auto pb-4 custom-scrollbar-h">
            <KanbanColumn title="Backlog" status="To Do" color="bg-slate-400" />
            <KanbanColumn title="In Progress" status="In Progress" color="bg-amber-500" />
            <KanbanColumn title="Under Review" status="Review" color="bg-indigo-500" />
            <KanbanColumn title="Completed" status="Done" color="bg-emerald-500" />
        </div>

        {selectedTaskId && selectedTask && (
            <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}></div>
                <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JOB ID: {selectedTask.id}</span>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mt-1">{selectedTask.title}</h3>
                        </div>
                        <button onClick={() => setSelectedTaskId(null)} className="p-2 text-slate-400 hover:text-slate-800 transition-all"><X size={28} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} className="text-medical-600" /> Command Actions</h4>
                            <div className="flex flex-col gap-3">
                                {selectedTask.assignedTo === currentUser && (
                                    <>
                                        {selectedTask.status === 'To Do' && (
                                            <button onClick={() => updateTaskLocal(selectedTask.id, { status: 'In Progress' })} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">Start Work</button>
                                        )}
                                        {selectedTask.status === 'In Progress' && (
                                            <button onClick={() => updateTaskLocal(selectedTask.id, { status: 'Review' })} className="w-full bg-medical-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">Submit Review</button>
                                        )}
                                    </>
                                )}
                                {isAdmin && selectedTask.status === 'Review' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => { updateTaskLocal(selectedTask.id, { status: 'Done' }); addPoints(50, 'Task', `Task: ${selectedTask.title}`); setSelectedTaskId(null); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Approve</button>
                                        <button onClick={() => updateTaskLocal(selectedTask.id, { status: 'In Progress' })} className="flex-1 bg-rose-50 text-rose-600 border border-rose-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Reject</button>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><AlignLeft size={14} /> Mission Briefing</h4>
                            <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</div>
                        </section>

                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Mission Logs</h4>
                            <div className="space-y-4">
                                {selectedTask.logs?.map(log => (
                                    <div key={log.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm">
                                        <div className="flex justify-between items-start mb-1 text-[10px] font-black uppercase">
                                            <span className="text-slate-800 dark:text-slate-200">{log.user}</span>
                                            <span className="text-slate-300">{log.timestamp}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium">{log.action}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
