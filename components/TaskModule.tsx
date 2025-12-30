
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

// Distance calculator for proximity lock
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
  const { addPoints, employees, addNotification } = useData(); 
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // GPS Tracking for proximity verification
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
    return tasks.filter(t => {
        const isOwner = t.assignedTo === currentUser;
        const isHighPriority = t.priority === 'High';
        const isTodayDone = t.status === 'Done' && t.dueDate === todayStr;
        // Visible if owned, high priority, or recently finished today
        return isOwner || isHighPriority || isTodayDone;
    });
  }, [tasks, isAdmin, currentUser]);

  const updateTask = (id: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => {
          if (t.id === id) {
              const log: TaskLog = {
                  id: `LOG-${Date.now()}`,
                  user: currentUser,
                  action: updates.status ? `Status changed to: ${updates.status}` : 
                          updates.dueDate ? `Rescheduled to: ${updates.dueDate}` : 'Updated details',
                  timestamp: new Date().toLocaleTimeString()
              };
              return { ...t, ...updates, logs: [...(t.logs || []), log] };
          }
          return t;
      }));
  };

  const handleDeleteTask = (id: string) => {
    if (confirm("Permanently archive and delete this task from the registry?")) {
        setTasks(prev => prev.filter(t => t.id !== id));
        setSelectedTaskId(null);
        addNotification('Task Purged', 'Mission successfully removed from terminal.', 'warning');
    }
  };

  const handleCreateTask = () => {
      if (!newTask.title || !newTask.assignedTo) {
          alert("Title and Technician are required.");
          return;
      }
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
      setTasks(prev => [taskToAdd, ...prev]);
      setShowAddTaskModal(false);
      setNewTask({ priority: 'Medium', dueDate: new Date().toISOString().split('T')[0], subTasks: [] });
      addNotification('Assignment Dispatched', `Job assigned to ${taskToAdd.assignedTo}`, 'success');
  };

  const toggleSubTask = (taskId: string, subId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.subTasks) return;
      const newSubs = task.subTasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
      updateTask(taskId, { subTasks: newSubs });
  };

  const handleRequestMove = (task: Task) => {
      const message = prompt("Enter specific reason for requesting a date change:");
      if (message) {
          updateTask(task.id, { 
              exceptionRequest: {
                  type: 'Move',
                  reason: message,
                  status: 'Pending',
                  timestamp: new Date().toISOString()
              }
          });
          addNotification(
              'Date Change Request', 
              `${currentUser} is requesting a rescheduling for "${task.title}". Reason: ${message}`, 
              'warning'
          );
      }
  };

  const handleAdminApproveMove = (task: Task) => {
      const newDate = prompt("APPROVE: Enter the new Due Date (YYYY-MM-DD):", new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      if (newDate) {
          updateTask(task.id, { 
              dueDate: newDate,
              status: 'To Do',
              exceptionRequest: task.exceptionRequest ? { ...task.exceptionRequest, status: 'Approved' } : undefined
          });
          // Clean up the request after processing
          setTimeout(() => {
              updateTask(task.id, { exceptionRequest: undefined });
          }, 200);
          addNotification('Mission Rescheduled', `"${task.title}" has been moved to ${newDate}.`, 'success');
      }
  };

  const KanbanColumn = ({ status, title, color }: { status: Task['status'], title: string, color: string }) => {
    const columnTasks = visibleTasks.filter(t => t.status === status);
    return (
        <div className="flex-1 min-w-[280px] md:min-w-[320px] flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-inner overflow-hidden">
            <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-lg shadow-current/20`}></div>
                    <h4 className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{title}</h4>
                </div>
                <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400">{columnTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 custom-scrollbar">
                {columnTasks.map(task => {
                    const distance = (task.coords && userPos) ? getDistanceFromLatLonInKm(userPos.lat, userPos.lng, task.coords.lat, task.coords.lng) : null;
                    const isUrgent = task.priority === 'High';
                    const hasRequest = task.exceptionRequest?.status === 'Pending';

                    return (
                        <div 
                            key={task.id} 
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`group bg-white dark:bg-slate-900 p-4 md:p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer ${isUrgent && status !== 'Done' ? 'border-rose-100 dark:border-rose-900 ring-4 ring-rose-500/5' : 'border-slate-100 dark:border-slate-800 shadow-sm'} ${hasRequest ? 'ring-2 ring-amber-400 animate-pulse-subtle' : ''} hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden`}
                        >
                            {hasRequest && (
                                <div className="absolute top-0 right-0 w-12 h-12 bg-amber-400 rotate-45 translate-x-6 -translate-y-6 flex items-center justify-center pt-5 pl-2 shadow-sm">
                                    <MessageSquare size={12} className="text-white -rotate-45" />
                                </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${isUrgent ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                                    {task.priority}
                                </span>
                                {distance !== null && status !== 'Done' && userWorkMode === 'Field' && (
                                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-lg ${distance <= 2 ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-rose-500 bg-rose-50 border border-rose-100 animate-pulse dark:bg-rose-900/20'}`}>
                                        <LocateFixed size={10} /> {distance.toFixed(1)} km
                                    </div>
                                )}
                            </div>
                            <h5 className="font-black text-slate-800 dark:text-slate-100 text-[12px] md:text-[13px] uppercase tracking-tight mb-2 leading-tight">{task.title}</h5>
                            
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                        {task.assignedTo.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase truncate max-w-[80px]">{task.assignedTo.split(' ')[0]}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${new Date(task.dueDate) < new Date() && status !== 'Done' ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                    <Calendar size={12} /> {task.dueDate.split('-').slice(1).reverse().join('/')}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const TaskListView = () => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 backdrop-blur-md">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Job Identification</th>
                            <th className="px-6 py-4">Fleet Personnel</th>
                            <th className="px-6 py-4 text-center">Deadline</th>
                            <th className="px-6 py-4 text-right">Priority</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {visibleTasks.map(task => (
                            <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group ${task.exceptionRequest?.status === 'Pending' ? 'bg-amber-50/20' : ''}`}>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border tracking-widest ${
                                            task.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                                            task.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400' :
                                            task.status === 'Review' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400' :
                                            'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                        }`}>{task.status}</span>
                                        {task.exceptionRequest?.status === 'Pending' && <AlertCircle size={14} className="text-amber-500 animate-pulse" />}
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <p className="font-black text-slate-800 dark:text-slate-100 uppercase text-[12px] tracking-tight group-hover:text-medical-600 transition-colors">{task.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <MapPin size={10} className="text-slate-300 dark:text-slate-600" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{task.locationName || 'Unassigned Site'}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-[10px] text-slate-500 uppercase">{task.assignedTo.charAt(0)}</div>
                                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">{task.assignedTo}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-rose-500' : 'text-slate-400 dark:text-slate-600'}`}>
                                        <Calendar size={12} />
                                        <span>{task.dueDate.split('-').slice(1).reverse().join('/')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border tracking-tighter ${
                                        task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
                                    }`}>{task.priority}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 p-1 md:p-2 overflow-hidden relative">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 md:p-7 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-12 opacity-5 text-slate-900 dark:text-white pointer-events-none -mr-8 -mt-8"><ClipboardList size={140} /></div>
            <div className="flex items-center gap-4 md:gap-5 relative z-10 w-full lg:w-auto">
                <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-600 to-medical-600 rounded-[1.5rem] text-white shadow-xl rotate-3 shrink-0"><CheckSquare size={24} /></div>
                <div className="min-w-0 flex-1 lg:flex-none">
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none truncate">Fleet Operations</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-full flex items-center gap-1.5 shrink-0">
                            <ShieldCheck size={10} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{isAdmin ? 'Master Hub' : 'Personal Terminal'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto relative z-10">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto shadow-inner">
                    <button onClick={() => setViewMode('kanban')} className={`flex-1 sm:flex-none p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-medical-600 dark:text-medical-400 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><LayoutGrid size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-none p-2.5 rounded-lg transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-medical-600 dark:text-medical-400 shadow-md ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><ListIcon size={20} /></button>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowAddTaskModal(true)} className="w-full sm:w-auto bg-[#022c22] dark:bg-emerald-900 text-white px-5 md:px-7 py-3.5 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl hover:bg-black dark:hover:bg-emerald-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Plus size={16} strokeWidth={3} /> <span>Dispatch Job</span>
                    </button>
                )}
            </div>
        </div>

        <div className="flex-1 min-h-0 relative">
            {viewMode === 'kanban' ? (
                <div className="flex gap-4 md:gap-6 h-full overflow-x-auto pb-4 custom-scrollbar-h">
                    <KanbanColumn title="Backlog" status="To Do" color="bg-slate-400" />
                    <KanbanColumn title="Active Execution" status="In Progress" color="bg-amber-500" />
                    <KanbanColumn title="Review & Audit" status="Review" color="bg-indigo-500" />
                    <KanbanColumn title="Registry (Done)" status="Done" color="bg-emerald-500" />
                </div>
            ) : (
                <TaskListView />
            )}

            {selectedTaskId && selectedTask && (
                <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}></div>
                    <div className="w-full max-w-[95%] sm:max-w-xl bg-white dark:bg-slate-900 h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${selectedTask.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{selectedTask.priority} Priority</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Job ID: {selectedTask.id}</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-tight">{selectedTask.title}</h3>
                            </div>
                            <button onClick={() => setSelectedTaskId(null)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-90"><X size={28} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8 md:space-y-10">
                            {/* Request Message Section */}
                            {selectedTask.exceptionRequest?.status === 'Pending' && (
                                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[2rem] flex flex-col gap-4 shadow-sm">
                                    <div className="flex items-center gap-3 text-amber-800 dark:text-amber-400">
                                        <MessageSquare size={24} />
                                        <div>
                                            <span className="block font-black text-[11px] uppercase tracking-[0.1em]">Personnel Message</span>
                                            <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">Awaiting Terminal Response</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-relaxed italic">"{selectedTask.exceptionRequest.reason}"</p>
                                    </div>
                                    
                                    {isAdmin ? (
                                        <div className="flex flex-col gap-2 mt-2">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleAdminApproveMove(selectedTask)} 
                                                    className="flex-1 bg-amber-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                                                >
                                                    <CalendarDays size={14} /> Move Mission
                                                </button>
                                                <button 
                                                    onClick={() => updateTask(selectedTask.id, { exceptionRequest: undefined })} 
                                                    className="flex-1 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Reject Msg
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteTask(selectedTask.id)}
                                                className="w-full bg-rose-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                                            >
                                                <Trash2 size={14} /> Delete Job permanently
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center p-2 opacity-60">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 flex items-center justify-center gap-2">
                                                <Clock size={12} className="animate-spin-slow" /> Request synchronized to master hub
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} className="text-medical-600" /> Operational Status</h4>
                                <div className="flex flex-col gap-3">
                                    {selectedTask.assignedTo === currentUser && (
                                        <>
                                            {selectedTask.status === 'To Do' && (
                                                <button onClick={() => updateTask(selectedTask.id, { status: 'In Progress' })} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                    <Timer size={18} /> Start Execution
                                                </button>
                                            )}
                                            {selectedTask.status === 'In Progress' && (
                                                <button onClick={() => {
                                                    const distance = selectedTask.coords && userPos ? getDistanceFromLatLonInKm(userPos.lat, userPos.lng, selectedTask.coords.lat, selectedTask.coords.lng) : null;
                                                    if (userWorkMode === 'Field' && distance && distance > 2) alert("GPS LOCK: You must be within 2km of the service site to finish.");
                                                    else { updateTask(selectedTask.id, { status: 'Review' }); addNotification('Submitted for Review', `Job ${selectedTask.id} moved to Audit column.`, 'info'); }
                                                }} className="w-full bg-medical-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-medical-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                                                    <CheckCircle size={18} /> Submit Review
                                                </button>
                                            )}
                                            {!selectedTask.exceptionRequest && (
                                                <button onClick={() => handleRequestMove(selectedTask)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-slate-700 hover:text-medical-600 transition-all">
                                                    <MessageSquare size={16} /> Request Date Move
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {isAdmin && (
                                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            {selectedTask.status === 'Review' && (
                                                <div className="flex gap-3">
                                                    <button onClick={() => { updateTask(selectedTask.id, { status: 'Done' }); addPoints(50, 'Task', `Approved: ${selectedTask.title}`); setSelectedTaskId(null); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">Approve Job</button>
                                                    <button onClick={() => updateTask(selectedTask.id, { status: 'In Progress' })} className="flex-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Reject (Redo)</button>
                                                </div>
                                            )}
                                            {/* General Admin Mission Control */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <button onClick={() => handleAdminApproveMove(selectedTask)} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                    <Calendar size={14} /> Reschedule
                                                </button>
                                                <button onClick={() => handleDeleteTask(selectedTask.id)} className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                                    <Trash2 size={14} /> Delete Job
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><AlignLeft size={14} /> Scope of Work</h4>
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap shadow-inner">{selectedTask.description || 'No detailed briefing provided.'}</div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Mission Audit Feed</h4>
                                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                                    {selectedTask.logs?.map(log => (
                                        <div key={log.id} className="relative pl-10">
                                            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-400 z-10 shadow-sm"></div>
                                            <div className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{log.user}</span>
                                                    <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase">{log.timestamp}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{log.action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-5 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-slate-400 uppercase shadow-inner">{selectedTask.assignedTo.charAt(0)}</div>
                                <div><p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Fleet Personnel</p><p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{selectedTask.assignedTo}</p></div>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all active:scale-90" title="Purge Job">
                                    <Trash2 size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Add Task Modal */}
        {showAddTaskModal && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#01261d]/90 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                    <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-medical-50 dark:bg-medical-900/30 text-medical-600 dark:text-medical-400 rounded-3xl shadow-inner shrink-0"><UserPlus size={28} /></div>
                            <div className="min-w-0">
                                <h3 className="font-black text-lg md:text-xl text-slate-800 dark:text-slate-100 uppercase tracking-tight leadership-none truncate">Job Dispatch</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Assign work to technician registry</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"><X size={32} /></button>
                    </div>

                    <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Job Headline *</label>
                            <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/5 transition-all dark:text-white" placeholder="Task summary..." value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Assign Technician *</label>
                                <select className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black outline-none appearance-none dark:text-white" value={newTask.assignedTo || ''} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                                    <option value="">Select Personnel...</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name} ({emp.department})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Service Site / Client</label>
                                <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-medical-500 transition-all dark:text-white" value={newTask.locationName || ''} onChange={e => setNewTask({...newTask, locationName: e.target.value})} placeholder="Clinic/Address Reference" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Priority</label>
                                <select className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black outline-none dark:text-white" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Due Date</label>
                                <input type="date" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black outline-none dark:text-white" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 shrink-0">
                        <button onClick={() => setShowAddTaskModal(false)} className="flex-1 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Discard</button>
                        <button onClick={handleCreateTask} className="flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-medical-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <Send size={18} /> Dispatch
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
