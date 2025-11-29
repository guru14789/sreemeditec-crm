
import React, { useState } from 'react';
import { Task } from '../types';
import { CheckSquare, Clock, Plus, Filter, User, Calendar, MoreHorizontal, LayoutGrid, List as ListIcon, CheckCircle2, Circle, AlertCircle, ArrowRight } from 'lucide-react';

const MOCK_TASKS: Task[] = [
  { id: 'T-1', title: 'Prepare Quote for Apollo', description: 'Include 3 years AMC pricing for MRI machine.', assignedTo: 'Rahul Sharma', priority: 'High', status: 'To Do', dueDate: '2023-10-28', relatedTo: 'Apollo Clinic' },
  { id: 'T-2', title: 'Service Visit Report', description: 'Upload the signed service report for Westview Clinic.', assignedTo: 'Mike Ross', priority: 'Medium', status: 'In Progress', dueDate: '2023-10-27', relatedTo: 'T-101' },
  { id: 'T-3', title: 'Inventory Audit', description: 'Count physical stock of consumables in Warehouse B.', assignedTo: 'David Kim', priority: 'Low', status: 'Done', dueDate: '2023-10-25' },
  { id: 'T-4', title: 'Client Follow-up', description: 'Call Dr. Smith regarding the new X-Ray inquiry.', assignedTo: 'Rahul Sharma', priority: 'High', status: 'To Do', dueDate: '2023-10-29', relatedTo: 'Dr. Sarah Smith' },
];

export const TaskModule: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ priority: 'Medium', status: 'To Do', assignedTo: 'Unassigned' });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-50 text-red-600 border-red-100';
      case 'Medium': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'Low': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return <CheckCircle2 size={16} className="text-medical-600" />;
      case 'In Progress': return <Clock size={16} className="text-orange-600" />;
      default: return <Circle size={16} className="text-slate-400" />;
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
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  // Kanban Column Component
  const KanbanColumn = ({ status, title }: { status: Task['status'], title: string }) => {
    const columnTasks = tasks.filter(t => t.status === status);
    
    return (
        <div className="flex-1 min-w-[280px] bg-slate-50 rounded-xl border border-slate-200 flex flex-col max-h-full">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-100/50 rounded-t-xl">
                <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    {getStatusIcon(status)} {title}
                </h4>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 border border-slate-200">
                    {columnTasks.length}
                </span>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {columnTasks.map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                            <button className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                        <h5 className="font-medium text-slate-800 text-sm mb-1">{task.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{task.description}</p>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignedTo}`}>
                                <div className="w-5 h-5 rounded-full bg-medical-100 text-medical-700 flex items-center justify-center text-[10px] font-bold">
                                    {task.assignedTo.charAt(0)}
                                </div>
                                <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{task.assignedTo}</span>
                            </div>
                            <div className={`text-[10px] flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                <Calendar size={12} /> {task.dueDate}
                            </div>
                        </div>

                        {/* Quick Actions (Move) */}
                        <div className="grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-all duration-200">
                             {status !== 'To Do' && <button onClick={() => updateTaskStatus(task.id, 'To Do')} className="text-[10px] bg-slate-50 hover:bg-slate-100 py-1 rounded text-slate-600">To Do</button>}
                             {status !== 'In Progress' && <button onClick={() => updateTaskStatus(task.id, 'In Progress')} className="text-[10px] bg-slate-50 hover:bg-slate-100 py-1 rounded text-slate-600">In Prog</button>}
                             {status !== 'Done' && <button onClick={() => updateTaskStatus(task.id, 'Done')} className="text-[10px] bg-slate-50 hover:bg-slate-100 py-1 rounded text-slate-600">Done</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-1">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <CheckSquare size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Task Manager</h2>
                    <p className="text-xs text-slate-500">Track team assignments and deadlines</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                     <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <LayoutGrid size={18} />
                     </button>
                     <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <ListIcon size={18} />
                     </button>
                </div>
                <button 
                    onClick={() => setShowAddTaskModal(true)}
                    className="bg-medical-600 hover:bg-medical-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all">
                    <Plus size={18} /> New Task
                </button>
            </div>
        </div>

        {/* Stats Strip */}
        <div className="flex gap-4 overflow-x-auto pb-2 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 min-w-[140px] flex flex-col justify-center">
                <span className="text-xs text-slate-500">Total Tasks</span>
                <span className="text-xl font-bold text-slate-800">{tasks.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 min-w-[140px] flex flex-col justify-center">
                <span className="text-xs text-slate-500">Completed</span>
                <span className="text-xl font-bold text-green-600">{tasks.filter(t => t.status === 'Done').length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 min-w-[140px] flex flex-col justify-center">
                <span className="text-xs text-slate-500">High Priority</span>
                <span className="text-xl font-bold text-red-600">{tasks.filter(t => t.priority === 'High' && t.status !== 'Done').length}</span>
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl p-4 overflow-hidden">
            {viewMode === 'kanban' ? (
                <div className="flex gap-4 h-full overflow-x-auto pb-2">
                    <KanbanColumn title="To Do" status="To Do" />
                    <KanbanColumn title="In Progress" status="In Progress" />
                    <KanbanColumn title="Under Review" status="Review" />
                    <KanbanColumn title="Done" status="Done" />
                </div>
            ) : (
                <div className="h-full overflow-y-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 sticky top-0 z-10 text-xs uppercase font-medium text-slate-500">
                            <tr>
                                <th className="px-6 py-3 border-b border-slate-100">Task Details</th>
                                <th className="px-6 py-3 border-b border-slate-100">Assignee</th>
                                <th className="px-6 py-3 border-b border-slate-100">Priority</th>
                                <th className="px-6 py-3 border-b border-slate-100">Status</th>
                                <th className="px-6 py-3 border-b border-slate-100">Due Date</th>
                                <th className="px-6 py-3 border-b border-slate-100 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50 group">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{task.title}</div>
                                        {task.relatedTo && <div className="text-xs text-slate-400 mt-0.5">Ref: {task.relatedTo}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {task.assignedTo.charAt(0)}
                                            </div>
                                            <span>{task.assignedTo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(task.status)}
                                            <span>{task.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`${new Date(task.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}`}>
                                            {task.dueDate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600">
                                            <MoreHorizontal size={16} />
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <h3 className="font-bold text-slate-800">Create New Task</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
                            <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-medical-500 outline-none" 
                                value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-medical-500 outline-none" rows={3}
                                value={newTask.description || ''} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
                                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                                    value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                                    <option>Rahul Sharma</option>
                                    <option>Mike Ross</option>
                                    <option>Sarah Jenkins</option>
                                    <option>David Kim</option>
                                    <option>Unassigned</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                                    value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                            <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                                value={newTask.dueDate || ''} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                        </div>
                    </div>
                    <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                        <button onClick={() => setShowAddTaskModal(false)} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
                        <button onClick={handleAddTask} className="px-4 py-2 bg-medical-600 text-white text-sm font-medium rounded-lg hover:bg-medical-700">Create Task</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
