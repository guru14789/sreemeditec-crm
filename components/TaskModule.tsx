
import React, { useState, useMemo } from 'react';
import { Task, TaskLog } from '../types';
import {
    CheckSquare, Plus, User, Calendar,
    X, AlignLeft, History, Zap, Trash2, Edit, Search, RefreshCw
} from 'lucide-react';
import { useData } from './DataContext';

export const TaskModule: React.FC = () => {
    const {
        tasks,
        addPoints,
        employees,
        addNotification,
        updateTaskRemote,
        addTask,
        removeTask,
        currentUser: authUser,
        fetchMoreData
    } = useData();

    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [completedLimit, setCompletedLimit] = useState(20);

    const isAdmin = authUser?.role === 'SYSTEM_ADMIN';
    console.log('TaskModule Debug:', { tasksCount: tasks.length, authUser: authUser?.name, isAdmin });

    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [showRescheduleRequest, setShowRescheduleRequest] = useState(false);
    const [reqNewDate, setReqNewDate] = useState('');
    const [reqReason, setReqReason] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editPriority, setEditPriority] = useState<Task['priority']>('Medium');
    const [editAssignedTo, setEditAssignedTo] = useState('');
    const [editHandoffChain, setEditHandoffChain] = useState<string[]>([]);
    const [staffHandoffNote, setStaffHandoffNote] = useState('');

    const [newTask, setNewTask] = useState<Partial<Task>>({
        priority: 'Medium',
        dueDate: new Date().toISOString().split('T')[0],
        assignedTo: '',
        status: 'To Do',
        handoffChain: []
    });

    const selectedTask = useMemo(() => tasks.find(t => t.id === selectedTaskId), [tasks, selectedTaskId]);

    const visibleTasks = useMemo(() => {
        let filtered = tasks;
        
        // System admins have permission to view all tasks across all users
        if (!isAdmin && authUser?.name) {
            // Robust 'today' calculation using local time (YYYY-MM-DD)
            const localToday = new Date().toLocaleDateString('en-CA'); 
            const authName = authUser.name.trim().toLowerCase();

            filtered = tasks.filter(t => {
                const assignedName = (t.assignedTo || '').trim().toLowerCase();
                const isAssigned = assignedName === authName;
                const taskDate = t.dueDate || ''; 
                
                const isHistoryDone = taskDate < localToday && t.status === 'Done';
                const isFuture = taskDate > localToday;

                // Employees ONLY see today's or past tasks assigned to them
                return isAssigned && !isHistoryDone && !isFuture;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(q) || 
                t.description.toLowerCase().includes(q) ||
                t.assignedTo.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [tasks, isAdmin, authUser, searchQuery]);

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        try {
            await fetchMoreData('tasks', 'id');
            addNotification('History Loaded', 'Older tasks retrieved from headquarters.', 'info');
        } catch (err) {
            console.error("Load more failed", err);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: Task['status'], note?: string) => {
        const existing = tasks.find(t => t.id === id);
        if (!existing) return;

        const log: TaskLog = {
            id: `LOG-${Date.now()}`,
            user: authUser?.name || 'Unknown',
            action: `Status transitioned: ${existing.status} -> ${newStatus}`,
            timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        };

        const updates: Partial<Task> = {
            status: newStatus,
            logs: [...(existing.logs || []), log]
        };

        // Set 'submittedBy' and optional handoff note when a staff member submits for review
        if (newStatus === 'Review') {
            updates.submittedBy = authUser?.id;
            if (note) updates.handoffNotes = note;
        }

        try {
            // AWARD POINTS AND HANDLE HANDOFF ONLY UPON APPROVAL TO 'DONE'
            if (newStatus === 'Done') {
                // 1. Award Points for current stage
                if (existing.submittedBy && !existing.pointsAwarded) {
                    const targetEmp = employees.find(e => e.id === existing.submittedBy);
                    if (targetEmp) {
                        const localToday = new Date().toLocaleDateString('en-CA');
                        const isOverdue = existing.dueDate < localToday;
                        
                        const basePoints = 10;
                        const priorityBonus = existing.priority === 'High' ? 10 : 0;
                        const overduePenalty = isOverdue ? 5 : 0;
                        
                        const totalAward = Math.max(0, basePoints + priorityBonus - overduePenalty);
                        
                        const reason = isOverdue 
                            ? `Stage Complete (Overdue Penalty Applied): ${existing.title}`
                            : `Stage Complete: ${existing.title}`;

                        addPoints(totalAward, 'Task', reason, targetEmp.id);
                        addNotification(
                            isOverdue ? 'Task Completed Late' : 'Reward Processed', 
                            `${totalAward} points awarded for stage completion${isOverdue ? ' (Overdue)' : ''}.`, 
                            isOverdue ? 'warning' : 'success'
                        );
                    }
                }

                // 2. Check for Handoff Chain
                if (existing.handoffChain && existing.handoffChain.length > 0) {
                    const chain = [...existing.handoffChain];
                    const nextUser = chain.shift();
                    
                    const handoffLog: TaskLog = {
                        id: `LOG-H-${Date.now()}`,
                        user: 'System',
                        action: `Sequential Handoff: Approved by ${authUser?.name}. New Assignee: ${nextUser}`,
                        timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    };

                    await updateTaskRemote(id, {
                        ...updates,
                        assignedTo: nextUser,
                        status: 'To Do',
                        handoffChain: chain,
                        pointsAwarded: false, // Reset for next stage
                        logs: [...updates.logs!, handoffLog]
                    });
                    
                    addNotification('Handoff Complete', `Task moved to ${nextUser}.`, 'success');
                    setStaffHandoffNote('');
                } else {
                    // Final Completion
                    await updateTaskRemote(id, { ...updates, pointsAwarded: true });
                    setSelectedTaskId(null);
                }
            } else {
                // Regular status update (not Done)
                await updateTaskRemote(id, updates);
            }
            
            addNotification('Task Updated', `Task status moved to ${newStatus}.`, 'info');
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
            pointsAwarded: false,
            logs: [{ id: 'L1', user: authUser?.name || 'System', action: 'Task Dispatched', timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }]
        };

        try {
            await addTask({
                ...taskToAdd,
                handoffChain: newTask.handoffChain || [],
            });
            setShowAddTaskModal(false);
            setNewTask({ priority: 'Medium', dueDate: new Date().toISOString().split('T')[0], assignedTo: '', status: 'To Do' });
            addNotification('Task Dispatched', `Task assigned to ${taskToAdd.assignedTo}.`, 'success');
        } catch (err) {
            console.error("Task creation failed", err);
        }
    };

    const handleReschedule = async () => {
        if (!selectedTask || !rescheduleDate) return;
        try {
            const log: TaskLog = {
                id: `LOG-${Date.now()}`,
                user: authUser?.name || 'Admin',
                action: `Task Rescheduled (Override): ${selectedTask.dueDate} -> ${rescheduleDate}`,
                timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            };

            await updateTaskRemote(selectedTask.id, {
                dueDate: rescheduleDate,
                status: 'To Do',
                rescheduleRequest: undefined, // Clear any pending requests
                logs: [...(selectedTask.logs || []), log]
            });
            setIsRescheduling(false);
            addNotification('Task Rescheduled', `New deadline set to ${rescheduleDate}`, 'success');
        } catch (err) {
            console.error("Reschedule failed", err);
        }
    };

    const handleRequestReschedule = async () => {
        if (!selectedTask || !reqNewDate || !reqReason) return;
        try {
            const req = {
                newDate: reqNewDate,
                reason: reqReason,
                status: 'Pending' as const,
                requestedBy: authUser?.name || 'Unknown',
                requestedAt: new Date().toISOString()
            };

            const log: TaskLog = {
                id: `LOG-REQ-${Date.now()}`,
                user: authUser?.name || 'User',
                action: `Reschedule Requested for ${reqNewDate}: "${reqReason}"`,
                timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            };

            await updateTaskRemote(selectedTask.id, {
                rescheduleRequest: req,
                logs: [...(selectedTask.logs || []), log]
            });
            setShowRescheduleRequest(false);
            setReqReason('');
            setReqNewDate('');
            addNotification('Request Submitted', 'Admin will review your reschedule request.', 'info');
        } catch (err) {
            console.error("Request failed", err);
        }
    };

    const handleProcessReschedule = async (approved: boolean, adminNote?: string) => {
        if (!selectedTask || !selectedTask.rescheduleRequest) return;
        try {
            const req = selectedTask.rescheduleRequest;
            const newStatus = approved ? 'Approved' : 'Rejected';
            
            const log: TaskLog = {
                id: `LOG-ADMIN-${Date.now()}`,
                user: authUser?.name || 'Admin',
                action: `Reschedule Request ${newStatus}. ${adminNote ? `Note: ${adminNote}` : ''}`,
                timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            };

            const updates: Partial<Task> = {
                rescheduleRequest: { ...req, status: newStatus as any, responseNote: adminNote },
                logs: [...(selectedTask.logs || []), log]
            };

            if (approved) {
                updates.dueDate = req.newDate;
                updates.status = 'To Do'; // Unfreeze
            }

            await updateTaskRemote(selectedTask.id, updates);
            addNotification(`Request ${newStatus}`, approved ? 'Task date updated.' : 'Task remains frozen.', approved ? 'success' : 'warning');
        } catch (err) {
            console.error("Process failed", err);
        }
    };

    const handleSaveTaskEdit = async () => {
        if (!selectedTask) return;
        if (!editTitle.trim()) {
            alert("Title cannot be empty");
            return;
        }

        try {
            const chainChanged = JSON.stringify(selectedTask.handoffChain || []) !== JSON.stringify(editHandoffChain);
            const log: TaskLog = {
                id: `LOG-${Date.now()}`,
                user: authUser?.name || 'Admin',
                action: `Task Configuration Updated by Admin ${chainChanged ? '(Workflow Chain Modified)' : ''}`,
                timestamp: new Date().toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            };

            await updateTaskRemote(selectedTask.id, {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                assignedTo: editAssignedTo,
                handoffChain: editHandoffChain,
                logs: [...(selectedTask.logs || []), log]
            });
            setIsEditing(false);
            setEditHandoffChain([]);
            addNotification('Task Updated', 'Mission briefing updated successfully.', 'success');
        } catch (err) {
            console.error("Task update failed", err);
            alert("Failed to update task");
        }
    };

    const KanbanColumn = ({ status, title, color }: { status: Task['status'], title: string, color: string }) => {
        const columnTasks = visibleTasks.filter(t => t.status === status);
        const isCompleted = status === 'Done';
        return (
            <div className="flex-1 min-w-[280px] md:min-w-[320px] flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-slate-300/60 dark:border-slate-800 shadow-inner overflow-hidden uppercase">
                <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 shrink-0 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
                        <h4 className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{title}</h4>
                    </div>
                    <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400">{columnTasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-scroll p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {(isCompleted ? columnTasks.slice(0, completedLimit) : columnTasks).map(task => (
                        <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className={`group bg-white dark:bg-slate-900 p-5 rounded-[2rem] border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${task.priority === 'High' && task.status !== 'Done' ? 'border-rose-100 dark:border-rose-900' : 'border-slate-300 dark:border-slate-800'}`}
                        >
                            {/* Frozen Overlay Badge */}
                            {(task.status === 'To Do' || task.status === 'In Progress') && task.dueDate < new Date().toLocaleDateString('en-CA') && (
                                <div className="absolute top-0 right-0 px-3 py-1 bg-rose-600 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-xl z-10 animate-pulse">
                                    Frozen
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${task.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'}`}>
                                    {task.priority}
                                </span>
                                {task.rescheduleRequest?.status === 'Pending' && (
                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100">
                                        Req Pending
                                    </span>
                                )}
                            </div>
                            <h5 className="font-black text-slate-800 dark:text-slate-100 text-[12px] md:text-[13px] uppercase tracking-tight mb-2 leading-tight">{task.title}</h5>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                                <div className="flex items-center gap-2"><User size={12} /> {task.assignedTo.split(' ')[0]}</div>
                                <div className={`flex items-center gap-1 ${task.dueDate < new Date().toLocaleDateString('en-CA') && task.status !== 'Done' ? 'text-rose-500 font-black' : ''}`}>
                                    <Calendar size={12} /> {task.dueDate}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isCompleted && columnTasks.length > completedLimit && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setCompletedLimit(prev => prev + 20); }}
                            className="w-full py-4 rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-medical-600 hover:border-medical-300 transition-all flex flex-col items-center gap-1 group"
                        >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                            Load More Completed ({columnTasks.length - completedLimit} remaining)
                        </button>
                    )}

                    {columnTasks.length === 0 && (
                        <div className="py-10 text-center opacity-20 italic text-xs font-bold text-slate-400">Queue Empty</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden relative">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-300 dark:border-slate-800 shadow-sm shrink-0">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-gradient-to-br from-indigo-600 to-medical-600 rounded-[1.5rem] text-white shadow-xl flex items-center justify-center"><CheckSquare size={24} /></div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none">Fleet Operations</h2>
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live Syncing</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase mt-2 tracking-[0.2em]">{isAdmin ? 'ADMIN COMMAND CENTER' : 'FIELD AGENT TERMINAL'}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <div className="relative group/search flex-1 lg:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-medical-500 transition-colors" size={16} />
                        <input 
                            type="text"
                            placeholder="Search tasks..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-medical-500 focus:ring-4 focus:ring-medical-500/5 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <button onClick={() => setShowAddTaskModal(true)} className="bg-[#022c22] text-white px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Plus size={16} /> Dispatch Job
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-4 md:gap-6 overflow-x-auto pb-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                <KanbanColumn title="Backlog" status="To Do" color="bg-slate-400" />
                <KanbanColumn title="In Progress" status="In Progress" color="bg-amber-500" />
                <KanbanColumn title="Under Review" status="Review" color="bg-indigo-500" />
                <KanbanColumn title="Completed" status="Done" color="bg-emerald-500" />
            </div>

            {/* Load More Footer */}
            <div className="shrink-0 flex justify-center pb-4">
                <button 
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="group bg-white dark:bg-slate-900 px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-3"
                >
                    <RefreshCw size={14} className={`text-medical-500 ${isLoadingMore ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {isLoadingMore ? 'Analyzing Database...' : 'Load More History'}
                    </span>
                </button>
            </div>

            {selectedTaskId && selectedTask && (
                <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedTaskId(null)}></div>
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
                        <div className="p-8 border-b border-slate-300 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">JOB ID: {selectedTask.id}</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Task Title"
                                    />
                                ) : (
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mt-1">{selectedTask.title}</h3>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                {isAdmin && !isEditing && (
                                    <button
                                        onClick={() => {
                                            setEditTitle(selectedTask.title);
                                            setEditDescription(selectedTask.description);
                                            setEditPriority(selectedTask.priority);
                                            setEditAssignedTo(selectedTask.assignedTo);
                                            setEditHandoffChain(selectedTask.handoffChain || []);
                                            setIsEditing(true);
                                        }}
                                        className="p-2 text-indigo-400 hover:text-indigo-600 transition-all"
                                        title="Edit Mission Details"
                                    >
                                        <Edit size={20} />
                                    </button>
                                )}
                                {isAdmin && (
                                    <button onClick={() => handleDeleteTask(selectedTask.id)} className="p-2 text-rose-300 hover:text-rose-600 transition-all"><Trash2 size={20} /></button>
                                )}
                                <button onClick={() => { setSelectedTaskId(null); setIsEditing(false); }} className="p-2 text-slate-400 hover:text-slate-800 transition-all"><X size={28} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10">
                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={14} className="text-medical-600" /> Command Actions</h4>
                                
                                {selectedTask.handoffNotes && (
                                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-2xl">
                                        <h5 className="text-[8px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><AlignLeft size={10} /> Previous Phase Notes</h5>
                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-200 indent-2">{selectedTask.handoffNotes}</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    {isEditing ? (
                                        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Agent</label>
                                                    <select
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold appearance-none"
                                                        value={editAssignedTo}
                                                        onChange={(e) => setEditAssignedTo(e.target.value)}
                                                    >
                                                        {employees.map(emp => (
                                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                                    <select
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold appearance-none"
                                                        value={editPriority}
                                                        onChange={(e) => setEditPriority(e.target.value as any)}
                                                    >
                                                        <option value="Low">Low</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="High">High</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Edit Chain UI */}
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modify Flow Chain</label>
                                                <div className="flex gap-2 mt-1">
                                                    <select 
                                                        className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-bold dark:text-white outline-none"
                                                        id="edit-handoff-select"
                                                    >
                                                        <option value="">Add to chain...</option>
                                                        {employees.map(emp => (
                                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                                        ))}
                                                    </select>
                                                    <button 
                                                        className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase"
                                                        onClick={() => {
                                                            const sel = document.getElementById('edit-handoff-select') as HTMLSelectElement;
                                                            if (sel.value) {
                                                                setEditHandoffChain([...editHandoffChain, sel.value]);
                                                                sel.value = "";
                                                            }
                                                        }}
                                                    >Add</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {editHandoffChain.map((name, i) => (
                                                        <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                                            <span className="text-[9px] font-black text-slate-600 dark:text-slate-300">{name}</span>
                                                            <button onClick={() => setEditHandoffChain(editHandoffChain.filter((_, idx) => idx !== i))} className="text-rose-500"><X size={10} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                {editHandoffChain.length > 0 && (
                                                    <button 
                                                        onClick={() => setEditHandoffChain([])}
                                                        className="mt-3 text-[9px] font-black text-rose-500 uppercase hover:underline flex items-center gap-1"
                                                    >
                                                        <Trash2 size={10} /> Clear Entire Chain (Convert to Single Task)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Visual Progress Chain */}
                                            {(selectedTask.handoffChain && selectedTask.handoffChain.length > 0) && (
                                                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-bg">
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-black">1</div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">{selectedTask.assignedTo}</span>
                                                    </div>
                                                    {selectedTask.handoffChain.map((name, i) => (
                                                        <React.Fragment key={i}>
                                                            <div className="w-4 h-px bg-slate-200"></div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-black">{i + 2}</div>
                                                                <span className="text-[10px] font-black text-slate-300 uppercase">{name}</span>
                                                            </div>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            )}

                                            {selectedTask.assignedTo?.trim().toLowerCase() === authUser?.name?.trim().toLowerCase() ? (
                                                <div className="space-y-4">
                                                    {/* Frozen State Logic */}
                                                    {(selectedTask.dueDate < new Date().toLocaleDateString('en-CA') && (selectedTask.status === 'To Do' || selectedTask.status === 'In Progress')) ? (
                                                        <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-100 dark:border-rose-800 rounded-[2rem] space-y-4">
                                                            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                                                                <XCircle size={24} />
                                                                <h5 className="text-sm font-black uppercase tracking-tight">Task Frozen</h5>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-rose-800/70 dark:text-rose-300/70 leading-relaxed">
                                                                Deadline exceeded. This mission is locked. You must raise a reschedule request to resume operations.
                                                            </p>
                                                            
                                                            {selectedTask.rescheduleRequest ? (
                                                                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Request Status</span>
                                                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                                                                            selectedTask.rescheduleRequest.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                                                                            selectedTask.rescheduleRequest.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                                        }`}>
                                                                            {selectedTask.rescheduleRequest.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Proposed: {selectedTask.rescheduleRequest.newDate}</p>
                                                                    {selectedTask.rescheduleRequest.responseNote && (
                                                                        <p className="text-[9px] mt-2 italic text-rose-500">Admin: {selectedTask.rescheduleRequest.responseNote}</p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => {
                                                                        setReqNewDate(new Date().toISOString().split('T')[0]);
                                                                        setShowRescheduleRequest(true);
                                                                    }}
                                                                    className="w-full bg-rose-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                                                                >
                                                                    Raise Reschedule Request
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {selectedTask.status === 'To Do' && (
                                                                <button onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">Start Mission</button>
                                                            )}
                                                            {selectedTask.status === 'In Progress' && (
                                                                <div className="space-y-3">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Handoff Instructions / Completion Notes</label>
                                                                        <textarea 
                                                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:border-indigo-500 transition-colors"
                                                                            placeholder="Describe what you've done for the next stage..."
                                                                            value={staffHandoffNote}
                                                                            onChange={(e) => setStaffHandoffNote(e.target.value)}
                                                                            rows={3}
                                                                        />
                                                                    </div>
                                                                    <button onClick={() => handleUpdateStatus(selectedTask.id, 'Review', staffHandoffNote)} className="w-full bg-medical-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl ring-4 ring-medical-500/10">Submit for Approval</button>
                                                                </div>
                                                            )}
                                                            {selectedTask.status === 'Review' && (
                                                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl text-center">
                                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center gap-2"><RefreshCw size={12} className="animate-spin" /> Awaiting Admin Review</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">Currently under Operation by: {selectedTask.assignedTo}</p>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {isAdmin && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={12} /> Mission Timeline
                                                </h5>
                                                {!isRescheduling ? (
                                                    <button
                                                        onClick={() => {
                                                            setRescheduleDate(selectedTask.dueDate);
                                                            setIsRescheduling(true);
                                                        }}
                                                        className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
                                                    >
                                                        Reschedule
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsRescheduling(false)}
                                                        className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                                                    >
                                                        Abort
                                                    </button>
                                                )
                                                }
                                            </div>

                                            {isRescheduling ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                                                        value={rescheduleDate}
                                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={handleReschedule}
                                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                                                    >
                                                        Commit
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Deadline: {selectedTask.dueDate}</p>
                                            )}
                                        </div>
                                    )}

                                    {isAdmin && (
                                        <div className="space-y-3 pt-2">
                                            {selectedTask.rescheduleRequest?.status === 'Pending' && (
                                                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-800 rounded-[2rem] space-y-4">
                                                    <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                                                        <Clock size={24} />
                                                        <h5 className="text-sm font-black uppercase tracking-tight">Reschedule Request</h5>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested by {selectedTask.rescheduleRequest.requestedBy}</p>
                                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 leading-relaxed">Reason: "{selectedTask.rescheduleRequest.reason}"</p>
                                                            <p className="text-[10px] font-black text-indigo-600 uppercase">Proposed Date: {selectedTask.rescheduleRequest.newDate}</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button onClick={() => handleProcessReschedule(true)} className="bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Approve</button>
                                                        <button onClick={() => {
                                                            const note = prompt("Reason for rejection:");
                                                            if (note !== null) handleProcessReschedule(false, note);
                                                        }} className="bg-rose-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Reject</button>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTask.status === 'Review' && (
                                                <div className="flex flex-col gap-2">
                                                    <button onClick={() => handleUpdateStatus(selectedTask.id, 'Done')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95">Verify & Proceed to Next Stage</button>
                                                    <button onClick={() => handleUpdateStatus(selectedTask.id, 'In Progress')} className="w-full bg-white dark:bg-slate-800 text-rose-600 border border-rose-100 dark:border-rose-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-colors">Send Back for Revision</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><AlignLeft size={14} /> Mission Briefing</h4>
                                    {isEditing && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveTaskEdit}
                                                className="text-[9px] font-black text-emerald-600 uppercase hover:underline"
                                            >
                                                Apply Changes
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {isEditing ? (
                                    <textarea
                                        className="w-full p-5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-[2rem] text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[150px] resize-none focus:outline-medical-500"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        placeholder="Enter detailed mission instructions..."
                                    />
                                ) : (
                                    <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedTask.description}</div>
                                )}
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History size={14} /> Mission Logs</h4>
                                <div className="space-y-4">
                                    {selectedTask.logs?.map(log => (
                                        <div key={log.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm">
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

            {showAddTaskModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden scale-100 animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Dispatch Job</h3>
                            <button onClick={() => setShowAddTaskModal(false)}><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Job Title *</label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white" placeholder="e.g. Philips MRI Calibration" value={newTask.title || ''} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Agent *</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white appearance-none" value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}>
                                        <option value="">Select Staff...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name} ({emp.department})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white appearance-none" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                                    <input type="date" className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white" placeholder="Client Site / Office" value={newTask.locationName || ''} onChange={e => setNewTask({ ...newTask, locationName: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Briefing Notes</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white resize-none" rows={4} placeholder="Specific instructions for the first agent..." value={newTask.description || ''} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                            </div>

                            {/* Handoff Chain Builder */}
                            <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Strategic Handoff Chain (Next Steps)</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold dark:text-white outline-none focus:border-indigo-500"
                                        id="handoff-select"
                                    >
                                        <option value="">Add next person...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                    <button 
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                                        onClick={() => {
                                            const sel = document.getElementById('handoff-select') as HTMLSelectElement;
                                            if (sel.value) {
                                                setNewTask({ ...newTask, handoffChain: [...(newTask.handoffChain || []), sel.value] });
                                                sel.value = "";
                                            }
                                        }}
                                    >
                                        Append
                                    </button>
                                </div>
                                {newTask.handoffChain && newTask.handoffChain.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {newTask.handoffChain.map((name, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900 shadow-sm">
                                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">{i + 1}. {name}</span>
                                                <button onClick={() => setNewTask({...newTask, handoffChain: newTask.handoffChain?.filter((_, idx) => idx !== i)})} className="text-rose-500 hover:text-rose-700"><X size={12} /></button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => setNewTask({...newTask, handoffChain: []})}
                                            className="w-full text-center mt-2 text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
                                        >
                                            Reset to Single Task
                                        </button>
                                    </div>
                                )}
                                <p className="text-[8px] font-bold text-slate-400 uppercase italic">Once the current agent finishes, work automatically moves to the next person in this list.</p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-300 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <button onClick={() => setShowAddTaskModal(false)} className="flex-1 py-3 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
                            <button onClick={handleCreateTask} className="flex-1 bg-[#022c22] text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Engage Fleet</button>
                        </div>
                    </div>
                </div>
            )}
            {showRescheduleRequest && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Request Reschedule</h3>
                            <button onClick={() => setShowRescheduleRequest(false)}><X size={24} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Mission Date</label>
                                <input 
                                    type="date" 
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white"
                                    value={reqNewDate}
                                    onChange={(e) => setReqNewDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Adjustment</label>
                                <textarea 
                                    className="w-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold dark:text-white resize-none"
                                    rows={4}
                                    placeholder="Explain why the deadline was missed..."
                                    value={reqReason}
                                    onChange={(e) => setReqReason(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleRequestReschedule}
                                className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                            >
                                Dispatch Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
