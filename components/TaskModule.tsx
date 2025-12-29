import React, { useState, useEffect, useMemo } from 'react';
import { Task, SubTask, TaskLog, TabView } from '../types';
import { 
    CheckSquare, Clock, Plus, User, Calendar, LayoutGrid, List as ListIcon, 
    CheckCircle2, AlertCircle, MapPin, X, MessageSquare, 
    ShieldCheck, LocateFixed, Zap, ChevronRight,
    Timer, UserPlus, AlignLeft, ListChecks, History, 
    ClipboardList, Send, Trash2, CheckCircle, RefreshCw
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
  const { addPoints, employees, addNotification, clients } = useData(); 
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
  
  // Determine if current user is onsite or office based on department
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

  // Master Visibility Logic - Admins see everything, Employees see focused view
  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks; 
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(t => {
        const isOwner = t.assignedTo === currentUser;
        const isHighPriority = t.priority === 'High';
        const isTodayDone = t.status === 'Done' && t.dueDate === todayStr;
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
    if (confirm("Permanently archive and delete this task?")) {
        setTasks(prev => prev.filter(t => t.id !== id));
        setSelectedTaskId(null);
        addNotification('Task Deleted', 'Job removed from registry.', 'warning');
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

  const handleAdminManualFinish = (task: Task) => {
      if (confirm(`ADMIN OVERRIDE: Force complete task "${task.title}"?\n\nProximity checks and checklist completion will be bypassed.`)) {
          updateTask(task.id, { status: 'Done' });
          addPoints(25, 'Task', `Admin Override: ${task.title}`);
          addNotification('Admin Override', `Job ${task.id} was manually closed by Admin.`, 'success');
          setSelectedTaskId(null);
      }
  };

  const handleRequestMove = (task: Task) => {
      const reason = prompt("Enter reason for rescheduling to next date:");
      if (reason) {
          updateTask(task.id, { 
              exceptionRequest: {
                  type: 'Move',
                  reason: reason,
                  status: 'Pending',
                  timestamp: new Date().toISOString()
              }
          });
          // Notify Admin with a high-visibility warning level alert
          addNotification(
              'Urgent: Move Request', 
              `${currentUser} requested to reschedule "${task.title}". Reason: ${reason}`, 
              'warning'
          );
      }
  };

  const handleAdminApproveMove = (task: Task) => {
      const newDate = prompt("Enter new Due Date (YYYY-MM-DD):", new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      if (newDate) {
          updateTask(task.id, { 
              dueDate: newDate,
              status: 'To Do',
              exceptionRequest: undefined
          });
          addNotification('Request Approved', `Task "${task.title}" moved to ${newDate}.`, 'success');
      }
  };

  const KanbanColumn = ({ status, title, color }: { status: Task['status'], title: string, color: string }) => {
    const columnTasks = visibleTasks.filter(t => t.status === status);
    return (
        <div className="flex-1 min-w-[280px] md:min-w-[320px] flex flex-col h-full bg-slate-50/50 rounded-[2.5rem] border border-slate-200/60 shadow-inner overflow-hidden">
            <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-100 bg-white/40 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-lg shadow-current/20`}></div>
                    <h4 className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-slate-800">{title}</h4>
                </div>
                <span className="bg-slate-200/50 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500">{columnTasks.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 custom-scrollbar">
                {columnTasks.map(task => {
                    const distance = (task.coords && userPos) ? getDistanceFromLatLonInKm(userPos.lat, userPos.lng, task.coords.lat, task.coords.lng) : null;
                    const isUrgent = task.priority === 'High';
                    const hasSubtasks = (task.subTasks?.length || 0) > 0;
                    const doneSubs = task.subTasks?.filter(s => s.completed).length || 0;
                    const hasRequest = task.exceptionRequest?.status === 'Pending';

                    return (
                        <div 
                            key={task.id} 
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`group bg-white p-4 md:p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer ${isUrgent && status !== 'Done' ? 'border-rose-100 ring-4 ring-rose-500/5' : 'border-slate-100 shadow-sm'} ${hasRequest ? 'ring-2 ring-amber-400' : ''} hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden`}
                        >
                            {hasRequest && <div className="absolute top-0 right-0 w-8 h-8 bg-amber-400 rotate-45 translate-x-4 -translate-y-4 flex items-center justify-center pt-3 pl-1"><AlertCircle size={10} className="text-white -rotate-45" /></div>}
                            
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${isUrgent ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-500'}`}>
                                    {task.priority}
                                </span>
                                {distance !== null && status !== 'Done' && userWorkMode === 'Field' && (
                                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-lg ${distance <= 2 ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-500 bg-rose-50 border border-rose-100 animate-pulse'}`}>
                                        <LocateFixed size={10} /> {distance.toFixed(1)} km
                                    </div>
                                )}
                            </div>
                            <h5 className="font-black text-slate-800 text-[12px] md:text-[13px] uppercase tracking-tight mb-2 leading-tight">{task.title}</h5>
                            {hasSubtasks && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 mb-1.5">
                                        <span>Progress</span>
                                        <span>{Math.round((doneSubs / (task.subTasks?.length || 1)) * 100)}%</span>
                                    </div>
                                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-medical-500 transition-all duration-500" style={{ width: `${(doneSubs / (task.subTasks?.length || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            )}
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
                                        {task.assignedTo.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase truncate max-w-[80px]">{task.assignedTo.split(' ')[0]}</span>
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${new Date(task.dueDate) < new Date() && status !== 'Done' ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
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

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 p-1 md:p-2 overflow-hidden relative">
        {/* Module Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 md:p-7 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-12 opacity-5 text-slate-900 pointer-events-none -mr-8 -mt-8"><ClipboardList size={140} /></div>
            <div className="flex items-center gap-4 md:gap-5 relative z-10">
                <div className="p-3 md:p-4 bg-gradient-to-br from-indigo-600 to-medical-600 rounded-[1.5rem] text-white shadow-xl rotate-3"><CheckSquare size={24} /></div>
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Fleet Operations</h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-1.5">
                            <ShieldCheck size={10} className="text-indigo-600" />
                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{isAdmin ? 'Master Hub' : 'Personal Terminal'}</span>
                        </div>
                        {userWorkMode === 'Field' && (
                            <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-1.5">
                                <LocateFixed size={10} className="text-emerald-600" />
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">GPS Tracking Active</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto relative z-10">
                {isAdmin && (
                    <button onClick={() => setShowAddTaskModal(true)} className="flex-1 lg:flex-none bg-[#022c22] text-white px-5 md:px-7 py-3.5 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Plus size={16} strokeWidth={3} /> <span>Dispatch Job</span>
                    </button>
                )}
                <div className="flex bg-slate-100/80 p-1 rounded-xl md:rounded-2xl border border-slate-200">
                    <button onClick={() => setViewMode('kanban')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-medical-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}><LayoutGrid size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-medical-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}><ListIcon size={20} /></button>
                </div>
            </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 min-h-0 relative">
            <div className="flex gap-4 md:gap-6 h-full overflow-x-auto pb-4 custom-scrollbar-h">
                <KanbanColumn title="Backlog" status="To Do" color="bg-slate-400" />
                <KanbanColumn title="Active Execution" status="In Progress" color="bg-amber-500" />
                <KanbanColumn title="Review & Audit" status="Review" color="bg-indigo-500" />
                <KanbanColumn title="Registry (Done)" status="Done" color="bg-emerald-500" />
            </div>

            {/* Task Detail Sidebar Panel */}
            {selectedTaskId && selectedTask && (
                <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}></div>
                    <div className="w-full max-w-[95%] sm:max-w-xl bg-white h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${selectedTask.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-500'}`}>{selectedTask.priority} Priority</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Job ID: {selectedTask.id}</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight">{selectedTask.title}</h3>
                            </div>
                            <button onClick={() => setSelectedTaskId(null)} className="p-2 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-800 transition-all active:scale-90"><X size={28} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-8 md:space-y-10">
                            
                            {/* Exception Request Notification (For Admin) */}
                            {isAdmin && selectedTask.exceptionRequest?.status === 'Pending' && (
                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-amber-800">
                                        <AlertCircle size={20} />
                                        <span className="font-black text-xs uppercase tracking-tight">Rescheduling Request</span>
                                    </div>
                                    <p className="text-xs font-bold text-amber-700/80 leading-relaxed italic">"{selectedTask.exceptionRequest.reason}"</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAdminApproveMove(selectedTask)} className="flex-1 bg-amber-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700">Approve & Reschedule</button>
                                        <button onClick={() => updateTask(selectedTask.id, { exceptionRequest: undefined })} className="flex-1 bg-white border border-amber-200 text-amber-700 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Reject Request</button>
                                    </div>
                                </div>
                            )}

                            {/* Workflow Controller Section */}
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} className="text-medical-600" /> Workflow Controller</h4>
                                <div className="flex flex-col gap-3">
                                    {/* Technician Actions */}
                                    {selectedTask.assignedTo === currentUser && selectedTask.status !== 'Done' && (
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
                                            {selectedTask.status !== 'Review' && (
                                                <button onClick={() => handleRequestMove(selectedTask)} className="w-full bg-slate-50 border border-slate-200 text-slate-500 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:text-medical-600 transition-all">
                                                    <MessageSquare size={16} /> Request Date Move
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {/* Admin Specific Actions */}
                                    {isAdmin && (
                                        <div className="space-y-3 pt-2 border-t border-slate-100">
                                            {selectedTask.status === 'Review' && (
                                                <div className="flex gap-3">
                                                    <button onClick={() => { updateTask(selectedTask.id, { status: 'Done' }); addPoints(50, 'Task', `Approved: ${selectedTask.title}`); setSelectedTaskId(null); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">Approve Job</button>
                                                    <button onClick={() => updateTask(selectedTask.id, { status: 'In Progress' })} className="flex-1 bg-rose-50 text-rose-600 border border-rose-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Reject (Redo)</button>
                                                </div>
                                            )}
                                            {selectedTask.status !== 'Done' && (
                                                <button 
                                                    onClick={() => handleAdminManualFinish(selectedTask)} 
                                                    className="w-full bg-[#022c22] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-2xl flex items-center justify-center gap-3 border-2 border-emerald-500/10 hover:bg-black group transition-all active:scale-95"
                                                >
                                                    <ShieldCheck size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                                    <span>Admin Manual Finish</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Job Requirements Checklist */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ListChecks size={14} className="text-medical-600" /> Execution Checklist</h4>
                                    <button onClick={() => { const step = prompt("Enter specific job requirement:"); if (step) { const sub: SubTask = { id: `ST-${Date.now()}`, text: step, completed: false }; updateTask(selectedTask.id, { subTasks: [...(selectedTask.subTasks || []), sub] }); } }} className="text-[9px] font-black text-medical-600 bg-medical-50 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100">+ Add Step</button>
                                </div>
                                <div className="space-y-2 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                                    {selectedTask.subTasks?.map(st => (
                                        <div key={st.id} onClick={() => toggleSubTask(selectedTask.id, st.id)} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-100 cursor-pointer group hover:border-medical-200 transition-all">
                                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${st.completed ? 'bg-medical-500 border-medical-500 text-white' : 'border-slate-200 text-transparent group-hover:border-medical-300'}`}><CheckCircle size={14} strokeWidth={3} /></div>
                                            <span className={`text-[11px] md:text-xs font-bold transition-all ${st.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{st.text}</span>
                                        </div>
                                    ))}
                                    {(!selectedTask.subTasks || selectedTask.subTasks.length === 0) && (
                                        <div className="py-6 flex flex-col items-center justify-center opacity-20">
                                            <ListChecks size={32} className="mb-2" />
                                            <p className="text-[10px] font-black uppercase">No predefined workflow steps</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><AlignLeft size={14} /> Scope of Work</h4>
                                <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap shadow-inner">{selectedTask.description || 'No detailed briefing provided.'}</div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Task Audit Feed</h4>
                                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                    {selectedTask.logs?.map(log => (
                                        <div key={log.id} className="relative pl-10">
                                            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 z-10 shadow-sm"></div>
                                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{log.user}</span>
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase">{log.timestamp}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{log.action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="p-5 md:p-6 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 uppercase shadow-inner">{selectedTask.assignedTo.charAt(0)}</div>
                                <div><p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Fleet Technician</p><p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{selectedTask.assignedTo}</p></div>
                            </div>
                            {isAdmin && (
                                <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90" title="Delete from Registry">
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
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#01261d]/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                    <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-medical-50 text-medical-600 rounded-3xl shadow-inner"><UserPlus size={28} /></div>
                            <div>
                                <h3 className="font-black text-lg md:text-xl text-slate-800 uppercase tracking-tight leading-none">New Mission Dispatch</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Assign work to technician registry</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-slate-800 transition-colors p-2 rounded-full hover:bg-slate-100"><X size={32} /></button>
                    </div>

                    <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Headline *</label>
                            <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/5 transition-all" placeholder="Task summary..." value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Technician *</label>
                                <select className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3.5 text-sm font-black outline-none appearance-none" value={newTask.assignedTo || ''} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                                    <option value="">Select Personnel...</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name} ({emp.department})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Site / Client</label>
                                <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3.5 text-sm font-black outline-none focus:border-medical-500 transition-all" value={newTask.locationName || ''} onChange={e => setNewTask({...newTask, locationName: e.target.value})} placeholder="Clinic/Address Reference" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                <select className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3.5 text-sm font-black outline-none" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                                <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-2xl px-5 py-3.5 text-sm font-black outline-none" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4 shrink-0">
                        <button onClick={() => setShowAddTaskModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Discard</button>
                        <button onClick={handleCreateTask} className="flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-medical-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <Send size={18} /> Confirm Dispatch
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};