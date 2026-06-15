import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ServiceTask, ServiceTaskStatus, ServiceTaskComment, ServiceTaskAttachment, ServiceTaskActivity } from '../types';
import {
  QrCode, User, Clock, Phone, MapPin,
  X, CheckCircle, Play, Search, BarChart3, Package, MessageSquare,
  FileText, Image, Upload, Send, AlertCircle, MoreHorizontal, ChevronDown,
  Eye, Paperclip, Download
} from 'lucide-react';
import { useData } from './DataContext';

interface ServiceTaskModuleProps {
  userRole?: 'Admin' | 'Employee';
}

const STATUS_CONFIG: Record<ServiceTaskStatus, { label: string; color: string; dotColor: string }> = {
  'New': { label: 'New', color: 'bg-blue-500', dotColor: 'bg-blue-500' },
  'Claimed': { label: 'Claimed', color: 'bg-indigo-600', dotColor: 'bg-indigo-600' },
  'In Progress': { label: 'In Progress', color: 'bg-indigo-500', dotColor: 'bg-indigo-500' },
  'Completed': { label: 'Completed', color: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
  'On Hold': { label: 'On Hold', color: 'bg-amber-500', dotColor: 'bg-amber-500' },
  'Waiting for Customer': { label: 'Waiting', color: 'bg-purple-500', dotColor: 'bg-purple-500' },
  'Cancelled': { label: 'Cancelled', color: 'bg-rose-500', dotColor: 'bg-rose-500' },
  'Reopened': { label: 'Reopened', color: 'bg-orange-500', dotColor: 'bg-orange-500' },
};

const STATUS_FLOW: ServiceTaskStatus[] = [
  'New', 'Claimed', 'In Progress', 'Completed',
  'On Hold', 'Waiting for Customer', 'Cancelled', 'Reopened'
];

const getNextStatuses = (current: ServiceTaskStatus): ServiceTaskStatus[] => {
  switch (current) {
    case 'New': return ['Claimed', 'Cancelled'];
    case 'Claimed': return ['In Progress', 'On Hold', 'Waiting for Customer', 'Cancelled'];
    case 'In Progress': return ['Completed', 'On Hold', 'Waiting for Customer', 'Cancelled'];
    case 'Completed': return ['Reopened'];
    case 'On Hold': return ['In Progress', 'Waiting for Customer', 'Cancelled'];
    case 'Waiting for Customer': return ['In Progress', 'On Hold', 'Cancelled'];
    case 'Cancelled': return ['Reopened'];
    case 'Reopened': return ['Claimed', 'In Progress', 'On Hold', 'Cancelled'];
    default: return ['Claimed', 'Cancelled'];
  }
};

export const ServiceTaskModule: React.FC<ServiceTaskModuleProps> = ({ userRole }) => {
  const { serviceTasks, updateServiceTask, currentUser, showConfirm, addNotification } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'work_photo' | 'completion_proof'>('work_photo');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const isAdmin = userRole === 'Admin';

  const formUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?form=service`
    : 'https://sreemeditec.com/?form=service';

  const selectedTask = useMemo(() => serviceTasks.find(t => t.id === selectedTaskId), [serviceTasks, selectedTaskId]);

  const filteredTasks = useMemo(() => {
    let filtered = serviceTasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.customerName.toLowerCase().includes(q) ||
        (t.companyName || '').toLowerCase().includes(q) ||
        t.equipment.toLowerCase().includes(q) ||
        t.issue.toLowerCase().includes(q) ||
        t.taskNumber.toLowerCase().includes(q) ||
        (t.assignedTo || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [serviceTasks, searchQuery]);

  const groupedTasks = useMemo(() => {
    const groups: Record<ServiceTaskStatus, ServiceTask[]> = {
      'New': [], 'Claimed': [], 'In Progress': [], 'Completed': [],
      'On Hold': [], 'Waiting for Customer': [], 'Cancelled': [], 'Reopened': []
    };
    filteredTasks.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [filteredTasks]);

  // Dashboard metrics
  const metrics = useMemo(() => {
    const total = serviceTasks.length;
    const newTasks = serviceTasks.filter(t => t.status === 'New').length;
    const unassigned = serviceTasks.filter(t => !t.assignedTo && t.status !== 'Completed' && t.status !== 'Cancelled').length;
    const claimed = serviceTasks.filter(t => t.status === 'Claimed').length;
    const inProgress = serviceTasks.filter(t => t.status === 'In Progress').length;
    const completed = serviceTasks.filter(t => t.status === 'Completed').length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const overdue = serviceTasks.filter(t =>
      t.createdAt < sevenDaysAgo &&
      t.status !== 'Completed' && t.status !== 'Cancelled'
    ).length;
    return { total, newTasks, unassigned, claimed, inProgress, completed, overdue };
  }, [serviceTasks]);

  const addActivity = async (taskId: string, action: string, details?: string) => {
    const task = serviceTasks.find(t => t.id === taskId);
    if (!task) return;
    const activity: ServiceTaskActivity = {
      id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      user: currentUser?.name || 'System',
      timestamp: new Date().toISOString(),
      details
    };
    await updateServiceTask(taskId, {
      activityLog: [...(task.activityLog || []), activity]
    });
  };

  const handleClaim = async (id: string) => {
    if (!currentUser) return;
    const confirmed = await showConfirm(`Claim this service request as ${currentUser.name}?`);
    if (!confirmed) return;
    const now = new Date().toISOString();
    await updateServiceTask(id, {
      status: 'Claimed',
      assignedTo: currentUser.name,
      assignedToId: currentUser.id,
      claimedAt: now
    });
    await addActivity(id, 'Task Claimed', `Claimed by ${currentUser.name}`);
    addNotification('Task Claimed', 'You are now the owner of this request.', 'success');
  };

  const handleStatusChange = async (id: string, newStatus: ServiceTaskStatus) => {
    const task = serviceTasks.find(t => t.id === id);
    if (!task) return;
    const updates: Partial<ServiceTask> = { status: newStatus };
    if (newStatus === 'Completed') {
      updates.completedAt = new Date().toISOString();
    }
    if (newStatus === 'Reopened') {
      updates.reopenedAt = new Date().toISOString();
    }
    if (newStatus === 'In Progress' && task.status === 'Claimed') {
      updates.claimedAt = task.claimedAt || new Date().toISOString();
    }
    await updateServiceTask(id, updates);
    await addActivity(id, `Status changed to ${newStatus}`, `From ${task.status} to ${newStatus} by ${currentUser?.name}`);
    addNotification('Status Updated', `Task moved to ${newStatus}.`, 'info');
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTask) return;
    const comment: ServiceTaskComment = {
      id: `CMT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: newComment.trim(),
      author: currentUser?.name || 'Unknown',
      authorId: currentUser?.id,
      createdAt: new Date().toISOString()
    };
    await updateServiceTask(selectedTask.id, {
      comments: [...(selectedTask.comments || []), comment]
    });
    await addActivity(selectedTask.id, 'Comment added', `${currentUser?.name} added a comment`);
    setNewComment('');
    addNotification('Comment Added', 'Your comment has been recorded.', 'success');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length || !selectedTask) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          addNotification('File Too Large', `${file.name} exceeds 5MB limit.`, 'warning');
          continue;
        }
        const data = await fileToBase64(file);
        const attachment: ServiceTaskAttachment = {
          name: file.name,
          type: file.type,
          size: file.size,
          data,
          uploadedBy: currentUser?.name || 'Unknown',
          uploadedAt: new Date().toISOString(),
          category: uploadCategory
        };
        if (uploadCategory === 'completion_proof') {
          const existing = selectedTask.completionAttachments || [];
          await updateServiceTask(selectedTask.id, {
            completionAttachments: [...existing, attachment]
          });
        } else {
          const existing = selectedTask.attachments || [];
          await updateServiceTask(selectedTask.id, {
            attachments: [...existing, attachment]
          });
        }
        await addActivity(selectedTask.id, 'File uploaded', `${file.name} (${uploadCategory})`);
      }
      addNotification('Upload Complete', `${files.length} file(s) uploaded.`, 'success');
    } catch (err) {
      addNotification('Upload Failed', 'Could not process file.', 'alert');
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveVisitNotes = async () => {
    if (!selectedTask || !visitNotes.trim()) return;
    await updateServiceTask(selectedTask.id, { visitNotes: visitNotes.trim() });
    await addActivity(selectedTask.id, 'Visit notes updated', `${currentUser?.name} added visit notes`);
    addNotification('Notes Saved', 'Visit notes recorded.', 'success');
  };

  const MetricCard = ({ label, value, icon, color, sub }: { label: string; value: number; icon: any; color: string; sub?: string }) => (
    <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 min-w-0">
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
        <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mt-1">{value}</p>
        {sub && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">{sub}</p>}
      </div>
    </div>
  );

  const SectionCard = ({ task }: { task: ServiceTask }) => {
    const cfg = STATUS_CONFIG[task.status];
    return (
      <div
        onClick={() => { setSelectedTaskId(task.id); setVisitNotes(task.visitNotes || ''); }}
        className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-300 dark:border-slate-800 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
              task.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              task.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              'bg-slate-50 text-slate-500 border-slate-200'
            }`}>{task.priority}</span>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${cfg.color} text-white`}>{cfg.label}</span>
          </div>
          <span className="text-[8px] font-bold text-slate-400">{new Date(task.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-start gap-2 mb-1">
          <span className="text-[8px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 mt-0.5">{task.taskNumber}</span>
          <h5 className="font-black text-slate-800 dark:text-slate-100 text-[12px] md:text-[13px] uppercase tracking-tight leading-tight">{task.customerName}</h5>
        </div>
        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight mb-2">{task.equipment}</p>
        {task.subject && <p className="text-[10px] text-slate-500 font-medium mb-2 line-clamp-1">{task.subject}</p>}
        <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mb-4">{task.issue}</p>
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
          <div className="flex items-center gap-1.5"><Phone size={12} />{task.customerPhone}</div>
          {task.assignedTo && <div className="flex items-center gap-1.5"><User size={12} />{task.assignedTo.split(' ')[0]}</div>}
          {task.location && <div className="flex items-center gap-1.5"><MapPin size={12} />{task.location}</div>}
          <div className="flex items-center gap-1.5"><MessageSquare size={12} />{(task.comments || []).length}</div>
        </div>
      </div>
    );
  };

  const KanbanColumn = ({ status }: { status: ServiceTaskStatus }) => {
    const cfg = STATUS_CONFIG[status];
    const tasks = groupedTasks[status];
    return (
      <div className="flex-1 min-w-[280px] md:min-w-[320px] flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-slate-300/60 dark:border-slate-800 shadow-inner overflow-hidden">
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`}></div>
            <h4 className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{cfg.label}</h4>
          </div>
          <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400">{tasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-scroll p-4 space-y-4">
          {tasks.map(task => (
            <div key={task.id}>
              <SectionCard task={task} />
              {status === 'New' && (
                <button onClick={(e) => { e.stopPropagation(); handleClaim(task.id); }} className="mt-2 w-full bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Play size={14} /> Claim Task
                </button>
              )}
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="py-10 text-center opacity-20 italic text-xs font-bold text-slate-400">Empty</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-300 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-[1.5rem] text-white shadow-xl flex items-center justify-center"><QrCode size={24} /></div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none">Service Task</h2>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
              </div>
            </div>
            <p className="text-[10px] font-black text-teal-600 uppercase mt-2 tracking-[0.2em]">SERVICE DESK</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="relative group/search flex-1 lg:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-teal-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search requests..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/5 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowQR(!showQR)}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 ${showQR ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' : 'bg-teal-600 text-white shadow-lg'}`}
          >
            <QrCode size={16} /> {showQR ? 'Hide QR' : 'Show QR'}
          </button>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 shrink-0">
        <MetricCard label="Total" value={metrics.total} icon={<BarChart3 size={18} />} color="bg-slate-600" />
        <MetricCard label="New" value={metrics.newTasks} icon={<AlertCircle size={18} />} color="bg-blue-600" />
        <MetricCard label="Unassigned" value={metrics.unassigned} icon={<User size={18} />} color="bg-amber-600" />
        <MetricCard label="Claimed" value={metrics.claimed} icon={<Play size={18} />} color="bg-indigo-600" />
        <MetricCard label="In Progress" value={metrics.inProgress} icon={<Package size={18} />} color="bg-teal-600" />
        <MetricCard label="Completed" value={metrics.completed} icon={<CheckCircle size={18} />} color="bg-emerald-600" />
        <MetricCard label="Overdue" value={metrics.overdue} icon={<Clock size={18} />} color={metrics.overdue > 0 ? 'bg-rose-600' : 'bg-slate-400'} />
      </div>

      {/* QR Code Section */}
      {showQR && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-300 dark:border-slate-800 shadow-sm shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200">
              <QRCodeSVG value={formUrl} size={160} level="M" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Public QR Code</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                Share this QR code anywhere — print on brochures, invoices, or share via WhatsApp. Anyone can scan to submit a service request without login.
              </p>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <input
                  readOnly
                  value={formUrl}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-500 w-full max-w-md outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(formUrl); addNotification('Copied', 'URL copied to clipboard.', 'success'); }}
                  className="bg-teal-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 transition-all shrink-0"
                >
                  Copy
                </button>
              </div>
              <p className="text-[8px] font-bold text-slate-400 mt-3 uppercase tracking-wider">Permanent URL — remains unchanged unless manually updated.</p>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 md:gap-6 overflow-x-auto pb-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <KanbanColumn status="New" />
        <KanbanColumn status="Claimed" />
        <KanbanColumn status="In Progress" />
        <KanbanColumn status="Completed" />
        <KanbanColumn status="On Hold" />
        <KanbanColumn status="Waiting for Customer" />
        <KanbanColumn status="Cancelled" />
        <KanbanColumn status="Reopened" />
      </div>

      {/* Detail Side Panel */}
      {selectedTaskId && selectedTask && (
        <div className="fixed inset-0 z-[120] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => { setSelectedTaskId(null); setShowStatusMenu(false); }}></div>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full relative z-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            {/* Panel Header */}
            <div className="p-6 md:p-8 border-b border-slate-300 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded uppercase tracking-wider">{selectedTask.taskNumber}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${STATUS_CONFIG[selectedTask.status].color} text-white`}>{STATUS_CONFIG[selectedTask.status].label}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mt-1 truncate">{selectedTask.customerName}</h3>
                {selectedTask.companyName && <p className="text-[11px] font-bold text-slate-500 mt-1">{selectedTask.companyName}</p>}
              </div>
              <button onClick={() => { setSelectedTaskId(null); setShowStatusMenu(false); }} className="p-2 text-slate-400 hover:text-slate-800 transition-all shrink-0"><X size={28} /></button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 md:p-8 space-y-8">

                {/* Status Controls */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ChevronDown size={14} className="text-teal-600" /> Status
                    </h4>
                    {selectedTask.assignedTo === currentUser?.name || isAdmin ? (
                      <div className="relative">
                        <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="text-[9px] font-black text-teal-600 uppercase hover:underline flex items-center gap-1">
                          <MoreHorizontal size={12} /> Change Status
                        </button>
                        {showStatusMenu && (
                          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-50 min-w-[200px]">
                            {getNextStatuses(selectedTask.status).map(s => (
                              <button
                                key={s}
                                onClick={async () => {
                                  await handleStatusChange(selectedTask.id, s);
                                  setShowStatusMenu(false);
                                }}
                                className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                              >
                                <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dotColor}`}></div>
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {STATUS_FLOW.map((s, i) => {
                      const isCurrent = s === selectedTask.status;
                      const isPast = STATUS_FLOW.indexOf(selectedTask.status) >= i;
                      return (
                        <React.Fragment key={s}>
                          {i > 0 && <div className={`w-3 h-px shrink-0 ${isPast ? 'bg-teal-400' : 'bg-slate-200'}`}></div>}
                          <div className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                            isCurrent ? `${STATUS_CONFIG[s].color} text-white shadow-sm` : isPast ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-300'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-white' : isPast ? 'bg-slate-400' : 'bg-slate-300'}`}></div>
                            {STATUS_CONFIG[s].label}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} className="text-teal-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.customerName}</p>
                    {selectedTask.companyName && <p className="text-[10px] text-slate-500 mt-0.5">{selectedTask.companyName}</p>}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone size={14} className="text-teal-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.customerPhone}</p>
                    {selectedTask.customerEmail && <p className="text-[10px] text-slate-500 mt-0.5">{selectedTask.customerEmail}</p>}
                  </div>
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={14} className="text-teal-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipment</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.equipment}</p>
                    {selectedTask.serviceCategory && <p className="text-[10px] text-slate-500 mt-0.5">{selectedTask.serviceCategory}</p>}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-teal-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.location || 'Not specified'}</p>
                  </div>
                </div>

                {/* Subject & Issue */}
                {selectedTask.subject && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject</h4>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.subject}</div>
                  </div>
                )}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle size={14} className="text-teal-600" /> Issue Description</h4>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{selectedTask.issue}</div>
                </div>

                {/* Attachments from Customer */}
                {selectedTask.attachments && selectedTask.attachments.filter(a => a.category === 'customer_submission').length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Paperclip size={14} className="text-teal-600" /> Customer Attachments</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTask.attachments.filter(a => a.category === 'customer_submission').map((att, i) => (
                        <AttachmentPreview key={i} att={att} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Visit Notes */}
                {(selectedTask.assignedTo === currentUser?.name || isAdmin) && selectedTask.status !== 'Completed' && selectedTask.status !== 'Cancelled' && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={14} className="text-teal-600" /> Visit Notes</h4>
                    <textarea
                      rows={3}
                      placeholder="Add visit notes, observations, or instructions..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 resize-none"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                    />
                    {visitNotes !== (selectedTask.visitNotes || '') && (
                      <button onClick={handleSaveVisitNotes} className="mt-2 bg-teal-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 transition-all">
                        Save Notes
                      </button>
                    )}
                  </div>
                )}

                {/* Work Photos Upload */}
                {(selectedTask.assignedTo === currentUser?.name || isAdmin) && selectedTask.status !== 'Completed' && selectedTask.status !== 'Cancelled' && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Image size={14} className="text-teal-600" /> Work Photos</h4>
                    <div className="flex items-center gap-3">
                      <select
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] font-bold outline-none"
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value as any)}
                      >
                        <option value="work_photo">Work Photo</option>
                        <option value="completion_proof">Completion Proof</option>
                      </select>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload Files'}
                      </button>
                    </div>
                    {/* Show uploaded work photos */}
                    {selectedTask.attachments && selectedTask.attachments.filter(a => a.category === 'work_photo').length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-3">
                        {selectedTask.attachments.filter(a => a.category === 'work_photo').map((att, i) => (
                          <AttachmentPreview key={i} att={att} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Completion Section */}
                {selectedTask.completionAttachments && selectedTask.completionAttachments.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-600" /> Completion Proof</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTask.completionAttachments.map((att, i) => (
                        <AttachmentPreview key={i} att={att} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.completionNotes && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completion Notes</h4>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedTask.completionNotes}</div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageSquare size={14} className="text-teal-600" /> Comments ({selectedTask.comments?.length || 0})</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                    {(selectedTask.comments || []).slice().reverse().map(c => (
                      <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase">{c.author}</span>
                          <span className="text-[8px] font-bold text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                        {c.attachments && c.attachments.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {c.attachments.map((att, i) => (
                              <AttachmentPreview key={i} att={att} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(selectedTask.assignedTo === currentUser?.name || isAdmin) && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-teal-500"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                      />
                      <button onClick={handleAddComment} className="bg-teal-600 text-white px-4 py-3 rounded-xl hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50" disabled={!newComment.trim()}>
                        <Send size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Activity Log */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock size={14} className="text-teal-600" /> Activity Log</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(selectedTask.activityLog || []).slice().reverse().map(a => (
                      <div key={a.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{a.action}</p>
                            <span className="text-[8px] font-bold text-slate-400 shrink-0">{new Date(a.timestamp).toLocaleString()}</span>
                          </div>
                          {a.details && <p className="text-[9px] text-slate-500 mt-0.5">{a.details}</p>}
                          <p className="text-[8px] font-bold text-slate-400 mt-0.5">by {a.user}</p>
                        </div>
                      </div>
                    ))}
                    {(selectedTask.activityLog || []).length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No activity recorded yet.</p>
                    )}
                  </div>
                </div>

                {/* Assigned & Timeline */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned To</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedTask.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority</span>
                    <p className={`text-xs font-bold mt-1 ${
                      selectedTask.priority === 'Urgent' ? 'text-rose-600' :
                      selectedTask.priority === 'High' ? 'text-orange-600' :
                      'text-slate-600 dark:text-slate-300'
                    }`}>{selectedTask.priority}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTask.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedTask.claimedAt && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Claimed by {selectedTask.assignedTo}</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTask.claimedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {selectedTask.completedAt && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completed</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTask.completedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 md:p-6 border-t border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              {selectedTask.status === 'New' && (
                <button onClick={() => { handleClaim(selectedTask.id); setSelectedTaskId(null); }} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Play size={16} /> Claim This Request
                </button>
              )}
              {(selectedTask.assignedTo === currentUser?.name || isAdmin) && selectedTask.status !== 'Completed' && selectedTask.status !== 'Cancelled' && selectedTask.status !== 'New' && (
                <div className="flex gap-3">
                  {getNextStatuses(selectedTask.status).filter(s => s === 'Completed').map(s => (
                    <button key={s} onClick={async () => { await handleStatusChange(selectedTask.id, s); setSelectedTaskId(null); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Mark Completed
                    </button>
                  ))}
                  <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="px-6 py-4 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all relative">
                    <MoreHorizontal size={18} />
                    {showStatusMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-2 z-50 min-w-[180px]">
                        {getNextStatuses(selectedTask.status).filter(s => s !== 'Completed').map(s => (
                          <button
                            key={s}
                            onClick={async () => { await handleStatusChange(selectedTask.id, s); setShowStatusMenu(false); setSelectedTaskId(null); }}
                            className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                          >
                            <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dotColor}`}></div>
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AttachmentPreview = ({ att }: { att: ServiceTaskAttachment }) => {
  const [preview, setPreview] = useState(false);
  const isImage = att.type?.startsWith('image/');
  const fileName = att.name.length > 25 ? att.name.slice(0, 22) + '...' : att.name;

  return (
    <>
      <div
        onClick={() => isImage && setPreview(true)}
        className={`relative group bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden ${isImage ? 'cursor-pointer' : ''}`}
      >
        {isImage ? (
          <img src={att.data} alt={att.name} className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 flex flex-col items-center justify-center gap-1">
            <FileText size={24} className="text-slate-400" />
            <span className="text-[8px] font-bold text-slate-400 uppercase">{att.type?.split('/').pop() || 'file'}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
          {isImage && (
            <button onClick={() => setPreview(true)} className="opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-white/90 rounded-lg"><Eye size={14} /></button>
          )}
          <a href={att.data} download={att.name} className="opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-white/90 rounded-lg"><Download size={14} /></a>
        </div>
        <div className="p-2">
          <p className="text-[8px] font-bold text-slate-500 truncate">{fileName}</p>
          <p className="text-[7px] text-slate-400">{(att.size / 1024).toFixed(1)} KB</p>
        </div>
      </div>
      {preview && isImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-8" onClick={() => setPreview(false)}>
          <img src={att.data} alt={att.name} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </>
  );
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
