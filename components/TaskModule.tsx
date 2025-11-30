import React, { useState } from 'react';
import { Task } from '../types';
import { CheckSquare, Clock, Plus, Filter, User, Calendar, MoreHorizontal, LayoutGrid, List as ListIcon, CheckCircle2, Circle, AlertCircle, ArrowRight, TrendingUp } from 'lucide-react';

interface TaskModuleProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    currentUser: string;
    isAdmin: boolean;
}

export const TaskModule: React.FC<TaskModuleProps> = ({ tasks, setTasks, currentUser, isAdmin }) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ priority: 'Medium', status: 'To Do', assignedTo: 'Unassigned' });

  // Filter tasks based on role: Admin sees all, Employee sees only theirs
  const visibleTasks = isAdmin ? tasks : tasks.filter(t => t.assignedTo === currentUser);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-rose-50 text-rose-700 border-rose-100 ring-1 ring-rose-100';
      case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-100 ring-1 ring-amber-100';
      case 'Low': return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-1 ring-emerald-100';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'In Progress': return <Clock size={18} className="text-amber-500" />;
      case 'Review': return <AlertCircle size={18} className="text-indigo-500" />;
      default: return <Circle size={18} className="text-slate-400" />;
    }
  };

  const getColumnGradient = (status: string) => {
      switch(status) {
          case 'To Do': return 'from-slate-50 to-white border-slate-200/60';
          case 'In Progress': return 'from-amber-50/80 to-orange-50/50 border-orange-100';
          case 'Review': return 'from-indigo-50/80 to-purple-50/50 border-indigo-100';
          case 'Done': return 'from-emerald-50/80 to-teal-50/50 border-emerald-100';
          default: return 'from-slate-50 to-white';
      }
  };

  const getHeaderStyle = (status: string) => {
    switch(status) {
        case 'To Do': return 'text-slate-700 bg-slate-100/50';
        case 'In Progress': return 'text-amber-700 bg-amber-100/50';
        case 'Review': return 'text-indigo-700 bg-indigo-100/50';
        case 'Done': return 'text-emerald-700 bg-emerald-100/50';
        default: return 'text-slate-700';
    }
  };

  const handleAddTask = () => {
    if (!newTask.title || !newTask.dueDate) return;
    const task: Task = {
        id: `T-${Date.now()}`,
        title: newTask.title,
        description: newTask.description || '',
        assignedTo: newTask.assignedTo || 'Unassigned',
        priority: newTask.priority as any,
        status: newTask.status as any,
        dueDate: newTask.dueDate,
        relatedTo: newTask.relatedTo
    };
    setTasks([...tasks, task]);
    setShowAddTaskModal(false);
    setNewTask({ priority: 'Medium', status: 'To Do', assignedTo: 'Unassigned' });
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  // Kanban Column Component
  const KanbanColumn = ({ status, title }: { status: Task['status'], title: string }) => {
    const columnTasks = visibleTasks.filter(t => t.status === status);
    
    return (
        <div className={`flex-1 min-w-[300px] flex flex-col max-h-full rounded-3xl bg-gradient-to-b ${getColumnGradient(status)} border shadow-sm`}>
            <div className="p-4 flex justify-between items-center">
                <h4 className={`font-bold text-sm flex items-center gap-2 px-3 py-1.5 rounded-full ${getHeaderStyle(status)}`}>
                    {getStatusIcon(status)} {title}
                </h4>
                <span className="bg-white/80 px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                    {columnTasks.length}
                </span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {columnTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group relative">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                            <button className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                        <h5 className="font-semibold text-slate-800 text-sm mb-1">{task.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-600" title={`Assigned to ${task.assignedTo}`}>
                                    {task.assignedTo.charAt(0)}
                                </div>
                                <span className="text-xs text-slate-500 font-medium">{task.assignedTo.split(' ')[0]}</span>
                            </div>
                            <div className={`text-[10px] font-medium flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-full ${new Date(task.dueDate) < new Date() ? 'text-rose-500 bg-rose-50' : 'text-slate-400'}`}>
                                <Calendar size={12} /> {task.dueDate}
                            </div>
                        </div>
                        
                        {/* Hover Actions - Only allow moving forward if it's the user's task or Admin */}
                        {(status !== 'Done') && (isAdmin || task.assignedTo === currentUser) && (
                            <button 
                                onClick={() => updateTaskStatus(task.id, status === 'To Do' ? 'In Progress' : status === 'In Progress' ? 'Review' : 'Done')}
                                className="absolute -right-2 top-1/2 -translate-y-1/2 bg-white text-medical-600 p-2 rounded-full shadow-lg border border-medical-50 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all hover:bg-medical-50 z-10"
                                title="Move to Next Stage">
                                <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                ))}
                
                {/* Add Button in Column - Only for Admin */}
                {isAdmin && (
                    <button 
                        onClick={() => {
                            setNewTask({...newTask, status: status});
                            setShowAddTaskModal(true);
                        }}
                        className="w-full py-2 border-2 border-dashed border-slate-200/60 rounded-xl text-slate-400 text-xs font-medium hover:text-medical-600 hover:border-medical-200 hover:bg-white/50 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> Add Task
                    </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 shrink-0 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                    <CheckSquare size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Task Board</h2>
                    <p className="text-xs text-slate-500 font-medium">{isAdmin ? 'Assign and track team workflows' : 'My assigned tasks'}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-slate-100/80 p-1 rounded-xl">
                     <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LayoutGrid size={18} />
                     </button>
                     <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <ListIcon size={18} />
                     </button>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => setShowAddTaskModal(true)}
                        className="bg-gradient-to-r from-medical-600 to-teal-500 hover:from-medical-700 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-medical-500/20 flex items-center gap-2 transition-all active:scale-95">
                        <Plus size={18} /> New Task
                    </button>
                )}
            </div>
        </div>

        {/* Stats Strip - Updated to Match Dashboard Dark Theme */}
        <div className="flex gap-4 overflow-x-auto pb-2 shrink-0">
            {/* Total Tasks - Slate/Dark Theme */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-lg shadow-slate-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden min-w-[240px] flex-1">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CheckSquare size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-slate-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <CheckSquare size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                        Total
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">All Tasks</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{visibleTasks.length}</h3>
                </div>
            </div>

            {/* Completed - Emerald Theme */}
            <div className="bg-gradient-to-br from-[#022c22] to-emerald-900 p-6 rounded-3xl shadow-lg shadow-emerald-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden min-w-[240px] flex-1">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <CheckCircle2 size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-emerald-300 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                         <TrendingUp size={12} /> Rate
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider">Completed</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{visibleTasks.filter(t => t.status === 'Done').length}</h3>
                </div>
            </div>

            {/* High Priority - Rose Theme */}
            <div className="bg-gradient-to-br from-rose-800 to-red-900 p-6 rounded-3xl shadow-lg shadow-rose-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden min-w-[240px] flex-1">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertCircle size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-rose-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <AlertCircle size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm uppercase">
                        Urgent
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-rose-200/80 uppercase tracking-wider">High Priority</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{visibleTasks.filter(t => t.priority === 'High' && t.status !== 'Done').length}</h3>
                </div>
            </div>

            {/* Pending - Blue Theme */}
            <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-6 rounded-3xl shadow-lg shadow-blue-900/20 text-white hover:shadow-xl transition-all group relative overflow-hidden min-w-[240px] flex-1">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock size={100} />
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="bg-white/10 p-3 rounded-2xl text-blue-200 backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Clock size={24} />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold text-white/90 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm">
                        Action
                    </span>
                </div>
                <div className="relative z-10">
                    <p className="text-xs font-bold text-blue-200/80 uppercase tracking-wider">Pending</p>
                    <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{visibleTasks.filter(t => t.status === 'To Do').length}</h3>
                </div>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 bg-white/50 rounded-3xl overflow-hidden">
            {viewMode === 'kanban' ? (
                <div className="flex gap-4 h-full overflow-x-auto pb-2 pr-2">
                    <KanbanColumn title="To Do" status="To Do" />
                    <KanbanColumn title="In Progress" status="In Progress" />
                    <KanbanColumn title="Under Review" status="Review" />
                    <KanbanColumn title="Done" status="Done" />
                </div>
            ) : (
                <div className="h-full overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4 border-b border-slate-100">Task Details</th>
                                <th className="px-6 py-4 border-b border-slate-100">Assignee</th>
                                <th className="px-6 py-4 border-b border-slate-100">Priority</th>
                                <th className="px-6 py-4 border-b border-slate-100">Status</th>
                                <th className="px-6 py-4 border-b border-slate-100">Due Date</th>
                                <th className="px-6 py-4 border-b border-slate-100 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleTasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50 group transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900">{task.title}</div>
                                        {task.relatedTo && <div className="text-xs text-slate-400 mt-1 font-medium bg-slate-100 inline-block px-1.5 py-0.5 rounded">Ref: {task.relatedTo}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {task.assignedTo.charAt(0)}
                                            </div>
                                            <span className="font-medium">{task.assignedTo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(task.status)}
                                            <span className="font-medium">{task.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-medium ${new Date(task.dueDate) < new Date() ? 'text-rose-600' : 'text-slate-600'}`}>
                                            {task.dueDate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* Add Task Modal */}
        {showAddTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <div className="p-1.5 bg-medical-100 rounded-lg text-medical-600"><Plus size={18}/></div>
                            Create New Task
                        </h3>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Task Title *</label>
                            <input type="text" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all" 
                                value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="e.g. Weekly Report" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                            <textarea className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all resize-none" rows={3}
                                value={newTask.description || ''} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="Add details..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Assigned To</label>
                                <div className="relative">
                                    <select className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none appearance-none"
                                        value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                                        <option>Rahul Sharma</option>
                                        <option>Mike Ross</option>
                                        <option>Sarah Jenkins</option>
                                        <option>David Kim</option>
                                        <option>Unassigned</option>
                                    </select>
                                    <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Priority</label>
                                <div className="relative">
                                    <select className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium outline-none appearance-none"
                                        value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <div className={`w-2 h-2 rounded-full ${newTask.priority === 'High' ? 'bg-rose-500' : newTask.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Due Date *</label>
                            <div className="relative">
                                <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
                                    value={newTask.dueDate || ''} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                                <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80 rounded-b-3xl">
                        <button onClick={() => setShowAddTaskModal(false)} className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-200/80 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleAddTask} className="px-6 py-2.5 bg-medical-600 text-white text-sm font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/20 transition-all transform active:scale-95">Create Task</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};