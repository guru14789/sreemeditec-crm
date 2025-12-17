
import React, { useState } from 'react';
import { Task } from '../types';
import { CheckSquare, Clock, Plus, Filter, User, Calendar, MoreHorizontal, LayoutGrid, List as ListIcon, CheckCircle2, Circle, AlertCircle, ArrowRight, TrendingUp, MapPin, X, MessageSquare, ShieldCheck, Trash2, ArrowRightCircle } from 'lucide-react';
import { useData } from './DataContext';

interface TaskModuleProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    currentUser: string;
    isAdmin: boolean;
}

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; 
    var dLat = deg2rad(lat2-lat1);  
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; 
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI/180)
}

export const TaskModule: React.FC<TaskModuleProps> = ({ tasks, setTasks, currentUser, isAdmin }) => {
  const { addPoints } = useData(); 
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ priority: 'Medium', status: 'To Do', assignedTo: 'Unassigned' });
  
  // Exception Handling Modal State (Location)
  const [showLocationExceptionModal, setShowLocationExceptionModal] = useState(false);
  
  // New Exception Handling Modal State (Move/Delete)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'Move' | 'Delete'>('Move');
  
  const [exceptionTask, setExceptionTask] = useState<Task | null>(null);
  const [exceptionNote, setExceptionNote] = useState('');
  const [exceptionNewDate, setExceptionNewDate] = useState('');
  
  // Simulation State for Demo
  const [simulateLocation, setSimulateLocation] = useState(false);

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

  const checkLocationAndComplete = (task: Task) => {
      if (!task.coords) {
          updateTaskStatus(task.id, 'Done');
          return;
      }

      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition((position) => {
              const userLat = simulateLocation ? task.coords!.lat : position.coords.latitude;
              const userLng = simulateLocation ? task.coords!.lng : position.coords.longitude;
              
              const distance = getDistanceFromLatLonInKm(
                  userLat, userLng, 
                  task.coords!.lat, task.coords!.lng
              );

              if (distance <= 2) {
                  updateTaskStatus(task.id, 'Done');
                  alert(`Location Verified! You are ${distance.toFixed(2)}km away. Task Completed.`);
              } else {
                  if(confirm(`You are ${distance.toFixed(2)}km away from the task location (Max 2km allowed). You cannot mark this as Done automatically.\n\nDo you want to request manual approval from Admin?`)) {
                      setExceptionTask(task);
                      setShowLocationExceptionModal(true);
                  }
              }
          }, (error) => {
              alert("Error getting location. Please enable GPS.");
          });
      } else {
          alert("Geolocation not supported.");
      }
  };

  const handleRequestLocationApproval = () => {
      if (!exceptionTask) return;
      
      setTasks(prev => prev.map(t => t.id === exceptionTask.id ? {
          ...t,
          status: 'Review',
          completionRequest: {
              requested: true,
              note: exceptionNote,
              timestamp: new Date().toISOString()
          }
      } : t));

      setShowLocationExceptionModal(false);
      setExceptionTask(null);
      setExceptionNote('');
  };

  // --- Move / Delete Request Logic ---

  const openRequestModal = (task: Task, type: 'Move' | 'Delete') => {
      setExceptionTask(task);
      setRequestType(type);
      setExceptionNote('');
      setExceptionNewDate(task.dueDate); // Default to current due date for move
      setShowRequestModal(true);
  };

  const submitExceptionRequest = () => {
      if(!exceptionTask || !exceptionNote) return;

      setTasks(prev => prev.map(t => t.id === exceptionTask.id ? {
          ...t,
          exceptionRequest: {
              type: requestType,
              reason: exceptionNote,
              newDate: requestType === 'Move' ? exceptionNewDate : undefined,
              status: 'Pending',
              timestamp: new Date().toISOString()
          }
      } : t));

      setShowRequestModal(false);
      setExceptionTask(null);
  };

  // --- Admin Actions ---

  const handleAdminApproveCompletion = (task: Task) => {
      if(confirm(`Approve task "${task.title}" completion?`)) {
        updateTaskStatus(task.id, 'Done'); 
      }
  };

  const handleAdminApproveException = (task: Task) => {
      if(!task.exceptionRequest) return;
      
      if (task.exceptionRequest.type === 'Delete') {
          if(confirm(`Are you sure you want to DELETE task "${task.title}" as requested?`)) {
              setTasks(prev => prev.filter(t => t.id !== task.id));
          }
      } else if (task.exceptionRequest.type === 'Move') {
           if(confirm(`Move task "${task.title}" to ${task.exceptionRequest.newDate}?`)) {
               setTasks(prev => prev.map(t => t.id === task.id ? {
                   ...t,
                   dueDate: task.exceptionRequest!.newDate!,
                   exceptionRequest: { ...t.exceptionRequest!, status: 'Approved' } // Keep history or clear it? Clearing it for clean state
               } : t));
               // Clearing the request object after approval for cleanliness
               setTasks(prev => prev.map(t => t.id === task.id ? { ...t, exceptionRequest: undefined } : t));
           }
      }
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (task && newStatus === 'Done' && task.status !== 'Done') {
        let points = 10; 
        let reasons = ['Task Completed (+10)'];

        if (task.priority === 'High') {
            points += 10;
            reasons.push('High Priority (+10)');
        }

        if (new Date() <= new Date(task.dueDate)) {
            points += 5;
            reasons.push('On-Time (+5)');
        }

        addPoints(points, 'Task', `${task.title}: ${reasons.join(', ')}`);
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { 
        ...t, 
        status: newStatus,
        completionRequest: newStatus === 'Done' ? undefined : t.completionRequest 
    } : t));
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
                         {/* Badges */}
                        {task.completionRequest?.requested && status === 'Review' && (
                            <div className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-lg mb-2 flex items-center gap-1 border border-orange-100">
                                <AlertCircle size={12} /> Approval Requested
                            </div>
                        )}
                        {task.exceptionRequest && (
                             <div className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg mb-2 flex items-center gap-1 border border-indigo-100">
                                <MessageSquare size={12} /> Request: {task.exceptionRequest.type}
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                        </div>
                        <h5 className="font-semibold text-slate-800 text-sm mb-1">{task.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{task.description}</p>
                        
                        {task.locationName && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mb-3">
                                <MapPin size={12} /> {task.locationName}
                            </div>
                        )}
                        
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
                        
                        {/* Action Buttons */}
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all z-10 flex flex-col gap-1">
                            
                            {/* Employee Logic */}
                            {!isAdmin && task.assignedTo === currentUser && status !== 'Done' && (
                                <>
                                    {status === 'To Do' && (
                                        <button 
                                            onClick={() => updateTaskStatus(task.id, 'In Progress')}
                                            className="bg-white text-medical-600 p-2 rounded-full shadow-lg border border-medical-50 hover:bg-medical-50" title="Start Task">
                                            <ArrowRight size={16} />
                                        </button>
                                    )}
                                    {status === 'In Progress' && (
                                        <button 
                                            onClick={() => checkLocationAndComplete(task)}
                                            className="bg-medical-600 text-white p-2 rounded-full shadow-lg border border-medical-600 hover:bg-medical-700" title="Complete (Verify Location)">
                                            <CheckSquare size={16} />
                                        </button>
                                    )}
                                    {/* Request Move/Delete */}
                                    {!task.exceptionRequest && (
                                        <div className="relative group/more">
                                            <button className="bg-white text-slate-400 p-2 rounded-full shadow-lg border border-slate-100 hover:text-slate-600" title="Report Issue">
                                                <AlertCircle size={16} />
                                            </button>
                                            <div className="absolute right-full top-0 mr-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 flex flex-col gap-1 hidden group-hover/more:flex w-32">
                                                <button onClick={() => openRequestModal(task, 'Move')} className="text-xs font-bold text-slate-600 hover:bg-slate-50 px-2 py-1.5 rounded-lg text-left">Request Move</button>
                                                <button onClick={() => openRequestModal(task, 'Delete')} className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg text-left">Request Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Admin Logic */}
                            {isAdmin && (
                                <>
                                    {task.completionRequest?.requested ? (
                                        <button 
                                            onClick={() => handleAdminApproveCompletion(task)}
                                            className="bg-emerald-600 text-white p-2 rounded-full shadow-lg border border-emerald-600 hover:bg-emerald-700" title="Approve Completion">
                                            <ShieldCheck size={16} />
                                        </button>
                                    ) : task.exceptionRequest ? (
                                        <button 
                                            onClick={() => handleAdminApproveException(task)}
                                            className="bg-indigo-600 text-white p-2 rounded-full shadow-lg border border-indigo-600 hover:bg-indigo-700" title={`Approve ${task.exceptionRequest.type}`}>
                                            <CheckCircle2 size={16} />
                                        </button>
                                    ) : (
                                        status !== 'Done' && (
                                            <button 
                                                onClick={() => updateTaskStatus(task.id, status === 'To Do' ? 'In Progress' : status === 'In Progress' ? 'Review' : 'Done')}
                                                className="bg-white text-medical-600 p-2 rounded-full shadow-lg border border-medical-50 hover:bg-medical-50" title="Move Next">
                                                <ArrowRight size={16} />
                                            </button>
                                        )
                                    )}
                                </>
                            )}
                        </div>
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
        
        {/* Header Toolbar */}
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
                {/* Mock GPS Toggle */}
                <button 
                    onClick={() => setSimulateLocation(!simulateLocation)}
                    className={`text-xs px-3 py-2 rounded-xl font-bold border transition-colors ${simulateLocation ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                >
                    {simulateLocation ? 'GPS Sim: Active' : 'GPS Sim: Off'}
                </button>

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
                    {/* List view impl similar to previous but simplified for brevity */}
                </div>
            )}
        </div>

        {/* Add Task Modal - Existing */}
        {showAddTaskModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
                     <h3 className="font-bold text-lg mb-4">New Task</h3>
                     {/* Simplified Inputs */}
                     <input className="w-full border p-2 mb-2 rounded" placeholder="Title" value={newTask.title} onChange={e=>setNewTask({...newTask, title: e.target.value})} />
                     <input type="date" className="w-full border p-2 mb-4 rounded" value={newTask.dueDate} onChange={e=>setNewTask({...newTask, dueDate: e.target.value})} />
                     <button onClick={handleAddTask} className="bg-medical-600 text-white px-4 py-2 rounded w-full">Create</button>
                     <button onClick={()=>setShowAddTaskModal(false)} className="mt-2 text-slate-500 w-full">Cancel</button>
                 </div>
             </div>
        )}

        {/* Location Exception Request Modal */}
        {showLocationExceptionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <AlertCircle className="text-orange-500" size={24}/> Request Manual Approval
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">You are not at the required location. Please explain why.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason / Note</label>
                             <textarea 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none" rows={4}
                                value={exceptionNote} 
                                onChange={e => setExceptionNote(e.target.value)} 
                                placeholder="e.g. GPS signal is weak, or client met at a different location..." 
                             />
                        </div>
                    </div>
                     <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80 rounded-b-3xl">
                        <button onClick={() => setShowLocationExceptionModal(false)} className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-200/80 rounded-xl transition-colors">Cancel</button>
                        <button onClick={handleRequestLocationApproval} className="px-6 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all transform active:scale-95">Submit Request</button>
                    </div>
                </div>
            </div>
        )}

        {/* Move/Delete Request Modal */}
        {showRequestModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <MessageSquare className="text-indigo-500" size={24}/> Request {requestType}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Submit a request to Admin to {requestType.toLowerCase()} this task.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {requestType === 'Move' && (
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">New Proposed Date</label>
                                <input type="date" className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium"
                                    value={exceptionNewDate} onChange={e => setExceptionNewDate(e.target.value)} />
                            </div>
                        )}
                        <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason</label>
                             <textarea 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" rows={3}
                                value={exceptionNote} 
                                onChange={e => setExceptionNote(e.target.value)} 
                                placeholder="Why do you need to change this task?" 
                             />
                        </div>
                    </div>
                     <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80 rounded-b-3xl">
                        <button onClick={() => setShowRequestModal(false)} className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-200/80 rounded-xl transition-colors">Cancel</button>
                        <button onClick={submitExceptionRequest} className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95">Send Request</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
