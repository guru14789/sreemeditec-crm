
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

export const TaskModule: React.FC<TaskModuleProps> = ({ tasks, setTasks, currentUser, isAdmin }) => {
  const { addPoints, employees, addNotification, updateTaskRemote, addTask, removeTask } = useData(); 
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  
  const [newTask, setNewTask] = useState<Partial<Task>>({
      priority: 'Medium',
      dueDate: new Date().toISOString().split('T')[0],
      assignedTo: '',
      status: 'To Do'
  });

  const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);

  const visibleTasks = useMemo(() => {
    if (isAdmin) return tasks; 
    const todayStr = new Date().toISOString().split('T')[0];
    // Employees see tasks assigned to them, high priority alerts, or completed tasks for today
    return tasks.filter(t => t.assignedTo === currentUser || t.priority === 'High' || (t.status === 'Done' && t.dueDate === todayStr));
  }, [tasks, isAdmin, currentUser]);

  const handleUpdateStatus = async (id: string, newStatus: Task['status']) => {
      const existing = tasks.find(t => t.id === id);
      if (!existing) return;

      const log: TaskLog = {
          id: `LOG-${Date.now()}`,
          user: currentUser,
          action: `Status transitioned: ${existing.status} -> ${newStatus}`,
          timestamp: new Date().toLocaleTimeString()
      };

      const updates: Partial<Task> = {
          status: newStatus,
          logs: [...(existing.logs || []), log]
      };

      try {
          await updateTaskRemote(id, updates);
          addNotification('Task Updated', `Task status moved to ${newStatus}.`, 'info');
          
          if (newStatus === 'Done') {
              addPoints(50, 'Task', `Task Completed: ${existing.title}`);
              setSelectedTaskId(null);
          }
      } catch (err) {
          console.error("Task update failed", err);
      }
  };

  const handleDeleteTask = async (id: string) => {
      if (confirm("Permanently delete this task?")) {
          try {
              await removeTask(id);
              setSelectedTaskId(null);
              addNotification('Task Removed', 'The task has been deleted from the registry.', 'warning');
          } catch (err) {
              console.error("Delete failed", err);
          }
      }
  };

  const handleCreateTask = async () => {
      if (!newTask.title || !newTask.assignedTo) {
          alert("Please fill in Title and Assigned Staff member.");
          return;
      }
      const taskToAdd: Task = {
          id: `T-${Date.now()}`,
          title: newTask.title!,
          description: newTask.description || 'No description provided.',
          assignedTo: newTask.assignedTo!,
          priority: (newTask.priority as any) || 'Medium',
          status: 'To Do',
          dueDate: newTask.dueDate || new Date().toISOString().split('T')[0],
          locationName: newTask.locationName || 'Main Office',
          subTasks: [],
          logs: [{ id: 'L1', user: currentUser, action: 'Task Dispatched', timestamp: new Date().toLocaleTimeString() }]
      };

      try {
          await addTask(taskToAdd);
          setShowAddTaskModal(false);
          setNewTask({ priority: 'Medium', dueDate: new Date().toISOString().split('T')[0], assignedTo: '', status: 'To Do' });
          addNotification('Task Dispatched', `Task assigned to ${taskToAdd.assignedTo}.`, 'success');
      } catch (err) {
          console.error("Task creation failed", err);
      }
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
                {columnTasks.length === 0 && (
                    <div className="py-10 text-center opacity-20 italic text-xs font-bold text-slate-400">Queue Empty</div>
                )}
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

        {/* Task Detail Sidebar/Modal */}
        {selectedTaskId && selectedTask && (
            <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}></div>
                <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JOB ID: {selectedTask.id}</span>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mt-1">{selectedTask.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-2 text-rose-300 hover:text-rose-600 transition-all"><Trash2 size={20}/></button>
                            )}
                            <button onClick={() => setSelectedTaskId(null)} className="p-2 text-slate-400 hover:text-slate-800 transition-all"><X size={28} /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                        <section>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} className="text-medical-600" /> Command Actions</h4>
                            <div className="flex flex-col gap-3">
                                {selectedTask.assignedTo === currentUser ? (
                                    <>
                                        {selectedTask.status === 'To Do' && (
                                            <button onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">Start Work</button>
                                        )}
                                        {selectedTask.status === 'In Progress' && (
                                            <button onClick={() => handleUpdateStatus(selectedTask.id, 'Review')} className="w-full bg-medical-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">Submit Review</button>
                                        )}
                                        {selectedTask.status === 'Review' && (
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl text-center">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Under Admin Review</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Assigned to: {selectedTask.assignedTo}</p>
                                    </div>
                                )}
                                
                                {isAdmin && selectedTask.status === 'Review' && (
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => handleUpdateStatus(selectedTask.id, 'Done')} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Approve</button>
                                        <button onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')} className="flex-1 bg-rose-50 text-rose-600 border border-rose-100 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Reject</button>
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

        {/* Add Task Modal */}
        {showAddTaskModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Dispatch Job</h3>
                        <button onClick={() => setShowAddTaskModal(false)}><X size={24} className="text-slate-400"/></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title *</label>
                            <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white" placeholder="e.g. Philips MRI Calibration" value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Agent *</label>
                                <select className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white appearance-none" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                                    <option value="">Select Staff...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.name}>{emp.name} ({emp.department})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                <select className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white appearance-none" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                                <input type="date" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                <input type="text" className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white" placeholder="Client Site / Office" value={newTask.locationName || ''} onChange={e => setNewTask({...newTask, locationName: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Briefing Notes</label>
                            <textarea className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white resize-none" rows={4} placeholder="Specific instructions for the agent..." value={newTask.description || ''} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                        <button onClick={() => setShowAddTaskModal(false)} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Cancel</button>
                        <button onClick={handleCreateTask} className="flex-1 bg-medical-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Confirm Dispatch</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
