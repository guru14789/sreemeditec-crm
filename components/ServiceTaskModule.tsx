import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ServiceTask, ServiceTaskStatus, ServiceTaskComment, ServiceTaskAttachment, ServiceTaskActivity, TabView } from '../types';
import {
  QrCode, User, Clock, Phone, MapPin,
  X, CheckCircle, Play, Search, BarChart3, Package, MessageSquare,
  FileText, Image, Upload, Send, AlertCircle, MoreHorizontal, ChevronDown,
  Eye, Paperclip, Download, Plus, Trash2, ListFilter,
  MessageCircle, CheckCircle2, Copy, Check, ExternalLink, Wrench, Sparkles,
  Pencil, Save
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';

interface ServiceTaskModuleProps {
  userRole?: 'Admin' | 'Employee';
}

const SERVICE_CATEGORIES = [
  'Medical Equipment', 'Pipeline Service', 'Installation', 'Repair', 'Maintenance', 'AMC Service',
  'Calibration', 'Upgrade', 'Demo', 'Training', 'Other'
];

const STATUS_CONFIG: Record<ServiceTaskStatus, { label: string; color: string; dotColor: string }> = {
  'New': { label: 'New', color: 'bg-blue-500', dotColor: 'bg-blue-500' },
  'Claimed': { label: 'Claimed', color: 'bg-indigo-600', dotColor: 'bg-indigo-600' },
  'In Progress': { label: 'In Progress', color: 'bg-indigo-500', dotColor: 'bg-indigo-500' },
  'Completed': { label: 'Completed', color: 'bg-emerald-500', dotColor: 'bg-emerald-500' },
  'On Hold': { label: 'Company Hold', color: 'bg-amber-500', dotColor: 'bg-amber-500' },
  'Waiting for Customer': { label: 'Service Finished Waiting', color: 'bg-purple-500', dotColor: 'bg-purple-500' },
  'Cancelled': { label: 'Cancelled', color: 'bg-rose-500', dotColor: 'bg-rose-500' },
  'Reopened': { label: 'Reopened', color: 'bg-orange-500', dotColor: 'bg-orange-500' },
  'Non Billed': { label: 'Non Billed', color: 'bg-rose-500', dotColor: 'bg-rose-500' },
  'Billed': { label: 'Billed', color: 'bg-slate-500', dotColor: 'bg-slate-500' },
};

const STATUS_FLOW: ServiceTaskStatus[] = [
  'New', 'Claimed', 'In Progress', 'Completed',
  'On Hold', 'Waiting for Customer', 'Cancelled', 'Reopened', 'Non Billed', 'Billed'
];

const getNextStatuses = (current: ServiceTaskStatus, isAdmin: boolean = false): ServiceTaskStatus[] => {
  switch (current) {
    case 'New': return ['Claimed', 'Cancelled'];
    case 'Claimed': return ['In Progress', 'On Hold', 'Waiting for Customer', 'Cancelled'];
    case 'In Progress': return ['Completed', 'On Hold', 'Waiting for Customer', 'Cancelled'];
    case 'Completed': return isAdmin ? ['Non Billed', 'Billed', 'Reopened'] : ['Reopened'];
    case 'On Hold': return ['In Progress', 'Waiting for Customer', 'Cancelled'];
    case 'Waiting for Customer': return ['In Progress', 'On Hold', 'Cancelled'];
    case 'Cancelled': return ['Reopened'];
    case 'Reopened': return ['Claimed', 'In Progress', 'On Hold', 'Cancelled'];
    case 'Non Billed': return isAdmin ? ['Billed', 'Reopened'] : ['Reopened'];
    case 'Billed': return [];
    default: return ['Claimed', 'Cancelled'];
  }
};

export const ServiceTaskModule: React.FC<ServiceTaskModuleProps> = ({ userRole }) => {
  const { serviceTasks, employees, addServiceTask, updateServiceTask, removeServiceTask, currentUser, showConfirm, addNotification, clients, products } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewState, setViewState] = useState<'registry' | 'turnover'>('registry');
  const [selectedEmployeeForTurnover, setSelectedEmployeeForTurnover] = useState<string | null>(null);
  const [selectedStatusForTurnover, setSelectedStatusForTurnover] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'work_photo' | 'completion_proof'>('work_photo');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ServiceTask | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<{
    customerName: string;
    companyName: string;
    customerPhone: string;
    customerEmail: string;
    subject: string;
    equipment: string;
    serialNo: string;
    serviceCategory: string;
    issue: string;
    location: string;
    priority: ServiceTask['priority'];
    status: ServiceTaskStatus;
    assignedToId: string;
  }>({
    customerName: '',
    companyName: '',
    customerPhone: '',
    customerEmail: '',
    subject: '',
    equipment: '',
    serialNo: '',
    serviceCategory: '',
    issue: '',
    location: '',
    priority: 'Medium',
    status: 'New',
    assignedToId: ''
  });
  const [claimedSuccessTask, setClaimedSuccessTask] = useState<ServiceTask | null>(null);
  const [customClientPhone, setCustomClientPhone] = useState<string>('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    customerName: '', companyName: '', customerPhone: '', customerEmail: '',
    subject: '', equipment: '', serialNo: '', serviceCategory: '', issue: '', location: '',
    priority: 'Medium' as ServiceTask['priority']
  });

  const isAdmin = userRole === 'Admin' || currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.email === 'sreekumar.career@gmail.com' || currentUser?.permissions?.[TabView.SERVICE_TASK] === 'Admin';

  const formUrl = 'https://sreemeditec-crm.vercel.app/?form=service';

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
      'On Hold': [], 'Waiting for Customer': [], 'Cancelled': [], 'Reopened': [], 'Non Billed': [], 'Billed': []
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

  const employeeSummary = useMemo(() => {
    const summary: Record<string, { employeeName: string; total: number; attended: number; completed: number; billed: number; notBilled: number; pending: number }> = {};
    employees.forEach(emp => {
      summary[emp.id] = { employeeName: emp.name, total: 0, attended: 0, completed: 0, billed: 0, notBilled: 0, pending: 0 };
    });
    serviceTasks.forEach(t => {
      if (t.assignedToId && summary[t.assignedToId]) {
        const empStat = summary[t.assignedToId];
        empStat.total++;
        if (t.status !== 'New' && t.status !== 'Cancelled') empStat.attended++;
        if (['Completed', 'Non Billed', 'Billed'].includes(t.status)) empStat.completed++;
        if (t.status === 'Non Billed') empStat.notBilled++;
        if (t.status === 'Billed') empStat.billed++;
        if (['New', 'Claimed', 'In Progress', 'On Hold', 'Waiting for Customer', 'Reopened'].includes(t.status)) empStat.pending++;
      } else if (t.assignedTo) {
        // Fallback if ID is missing but name matches
        const emp = employees.find(e => e.name === t.assignedTo);
        if (emp && summary[emp.id]) {
          const empStat = summary[emp.id];
          empStat.total++;
          if (t.status !== 'New' && t.status !== 'Cancelled') empStat.attended++;
          if (['Completed', 'Non Billed', 'Billed'].includes(t.status)) empStat.completed++;
          if (t.status === 'Non Billed') empStat.notBilled++;
          if (t.status === 'Billed') empStat.billed++;
          if (['New', 'Claimed', 'In Progress', 'On Hold', 'Waiting for Customer', 'Reopened'].includes(t.status)) empStat.pending++;
        }
      }
    });
    return Object.values(summary).filter(s => s.total > 0).sort((a,b) => b.total - a.total);
  }, [serviceTasks, employees]);

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

  const generateWhatsAppMessage = (task: ServiceTask) => {
    const engineer = employees.find(e => e.id === task.assignedToId || e.name === task.assignedTo) || currentUser;
    const engineerName = task.assignedTo || currentUser?.name || 'Assigned Engineer';
    const engineerPhone = engineer?.phone || engineer?.directPhone || engineer?.personalPhone || currentUser?.phone || '';
    const hospitalOrClient = task.companyName 
      ? `${task.customerName} - ${task.companyName}` 
      : task.customerName;

    let text = `*SERVICE REQUEST UPDATE | SREEMEDITEC*\n\n`;
    text += `Dear *${task.customerName}*,\n\n`;
    text += `This is to inform you that your service request (*Ticket ID: ${task.taskNumber}*) has been successfully assigned to our service engineer.\n\n`;
    text += `*Service Request Details*\n`;
    text += `• *Ticket ID:* ${task.taskNumber}\n`;
    text += `• *Client / Facility:* ${hospitalOrClient}\n`;
    text += `• *Equipment:* ${task.equipment}\n`;
    text += `• *Serial Number:* ${task.serialNo || 'N/A'}\n`;
    text += `• *Reported Issue:* ${task.issue}\n`;
    text += `• *Service Location:* ${task.location || 'On-site'}\n\n`;
    text += `*Assigned Service Engineer*\n`;
    text += `• *Name:* ${engineerName}\n`;
    text += `• *Contact Number:* ${engineerPhone || 'Support Desk'}\n\n`;
    text += `Our service engineer will contact you shortly to coordinate the visit and discuss the next steps.\n\n`;
    text += `Thank you for choosing *Sreemeditec*. We appreciate your trust in our service and support.\n\n`;
    text += `For any queries or further assistance, please reply to this message.\n\n`;
    text += `*Regards,*\n`;
    text += `*Service Team | Sreemeditec*`;

    return text;
  };

  const handleShareInfoToClient = async () => {
    if (!claimedSuccessTask) return;
    const rawPhone = (customClientPhone || claimedSuccessTask.customerPhone || '').trim();
    if (!rawPhone) {
      addNotification('Phone Number Required', 'Please enter a valid client phone number to send WhatsApp.', 'error');
      return;
    }
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = '91' + cleanPhone.substring(1);
    }

    if (cleanPhone.length < 10) {
      addNotification('Invalid Phone', 'Please provide a valid 10-digit or international mobile number.', 'error');
      return;
    }

    const message = generateWhatsAppMessage(claimedSuccessTask);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');

    await addActivity(
      claimedSuccessTask.id,
      'Shared Info to Client',
      `Sent service claim details via WhatsApp to ${rawPhone} (${currentUser?.name || 'Engineer'})`
    );
    addNotification('WhatsApp Opened', `Service claim details ready for ${rawPhone}.`, 'success');
    setClaimedSuccessTask(null);
  };

  const handleCopyWhatsAppMessage = async () => {
    if (!claimedSuccessTask) return;
    const message = generateWhatsAppMessage(claimedSuccessTask);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      addNotification('Copied', 'Predefined WhatsApp message copied to clipboard.', 'success');
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      addNotification('Copy Failed', 'Unable to copy to clipboard.', 'error');
    }
  };

  const handleClaim = async (id: string) => {
    if (!currentUser) return;
    const task = serviceTasks.find(t => t.id === id);
    if (!task) return;
    const confirmed = await showConfirm(`Claim this service request as ${currentUser.name}?`);
    if (!confirmed) return;
    const now = new Date().toISOString();
    const claimedTask: ServiceTask = {
      ...task,
      status: 'Claimed',
      assignedTo: currentUser.name,
      assignedToId: currentUser.id,
      claimedAt: now
    };
    await updateServiceTask(id, {
      status: 'Claimed',
      assignedTo: currentUser.name,
      assignedToId: currentUser.id,
      claimedAt: now
    });
    await addActivity(id, 'Task Claimed', `Claimed by ${currentUser.name}`);
    addNotification('Task Claimed', 'You are now the owner of this request.', 'success');

    // Trigger popup card
    setClaimedSuccessTask(claimedTask);
    setCustomClientPhone(claimedTask.customerPhone || '');
  };

  const handleStatusChange = async (id: string, newStatus: ServiceTaskStatus) => {
    const task = serviceTasks.find(t => t.id === id);
    if (!task) return;
    const isFromNewToClaimed = (task.status === 'New' || !task.status) && newStatus === 'Claimed';
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
    if (isFromNewToClaimed) {
      updates.claimedAt = new Date().toISOString();
      if (!task.assignedTo && currentUser) {
        updates.assignedTo = currentUser.name;
        updates.assignedToId = currentUser.id;
      }
    }
    await updateServiceTask(id, updates);
    await addActivity(id, `Status changed to ${newStatus}`, `From ${task.status} to ${newStatus} by ${currentUser?.name}`);
    addNotification('Status Updated', `Task moved to ${newStatus}.`, 'info');

    if (isFromNewToClaimed) {
      const claimedTask: ServiceTask = {
        ...task,
        ...updates
      };
      setClaimedSuccessTask(claimedTask);
      setCustomClientPhone(claimedTask.customerPhone || '');
    }
  };

  const handleCreateTask = async () => {
    const f = newTaskForm;
    if (!f.customerName.trim() || !f.customerPhone.trim() || !f.equipment.trim() || !f.serialNo.trim() || !f.issue.trim()) {
      addNotification('Validation', 'Please fill in all required fields (including Serial No).', 'error');
      return;
    }
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const taskId = `SRV-${timestamp}-${rand}`;
    const taskNumber = `SRV-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const task: ServiceTask = {
      id: taskId, taskNumber,
      customerName: f.customerName.trim(), companyName: f.companyName.trim() || undefined,
      customerPhone: f.customerPhone.trim(), customerEmail: f.customerEmail.trim() || undefined,
      subject: f.subject.trim() || undefined, equipment: f.equipment.trim(),
      serialNo: f.serialNo.trim(),
      serviceCategory: f.serviceCategory || undefined, issue: f.issue.trim(),
      priority: f.priority, status: 'New', createdAt: new Date().toISOString(),
      location: f.location.trim() || undefined, source: 'manual',
      assignedTo: currentUser?.name, assignedToId: currentUser?.id,
      comments: [], attachments: [], activityLog: [{
        id: `ACT-${timestamp}`,
        action: 'Task Created',
        detail: `Created manually by ${currentUser?.name || 'Admin'}`,
        user: currentUser?.name || 'Admin',
        timestamp: new Date().toISOString()
      }]
    };
    await addServiceTask(task);
    addNotification('Task Created', `Service task ${taskNumber} created for ${f.customerName}.`, 'success');
    setShowCreateModal(false);
    setNewTaskForm({ customerName: '', companyName: '', customerPhone: '', customerEmail: '', subject: '', equipment: '', serialNo: '', serviceCategory: '', issue: '', location: '', priority: 'Medium' });
  };

  const handleOpenEditModal = (task: ServiceTask) => {
    setEditingTask(task);
    setEditTaskForm({
      customerName: task.customerName || '',
      companyName: task.companyName || '',
      customerPhone: task.customerPhone || '',
      customerEmail: task.customerEmail || '',
      subject: task.subject || '',
      equipment: task.equipment || '',
      serialNo: task.serialNo || '',
      serviceCategory: task.serviceCategory || '',
      issue: task.issue || '',
      location: task.location || '',
      priority: task.priority || 'Medium',
      status: task.status || 'New',
      assignedToId: task.assignedToId || (employees.find(e => e.name === task.assignedTo)?.id || '')
    });
    setShowEditModal(true);
  };

  const handleSaveEditTask = async () => {
    if (!editingTask) return;
    const f = editTaskForm;
    if (!f.customerName.trim() || !f.customerPhone.trim() || !f.equipment.trim() || !f.issue.trim()) {
      addNotification('Validation', 'Please fill in all required fields (Customer, Phone, Equipment, Issue).', 'error');
      return;
    }

    const assignedEmployee = employees.find(e => e.id === f.assignedToId);
    const assignedToName = assignedEmployee ? assignedEmployee.name : (f.assignedToId === '' ? '' : editingTask.assignedTo);

    const updates: Partial<ServiceTask> = {
      customerName: f.customerName.trim(),
      companyName: f.companyName.trim() || undefined,
      customerPhone: f.customerPhone.trim(),
      customerEmail: f.customerEmail.trim() || undefined,
      subject: f.subject.trim() || undefined,
      equipment: f.equipment.trim(),
      serialNo: f.serialNo.trim() || undefined,
      serviceCategory: f.serviceCategory || undefined,
      issue: f.issue.trim(),
      location: f.location.trim() || undefined,
      priority: f.priority,
      status: f.status,
      assignedTo: assignedToName || undefined,
      assignedToId: f.assignedToId || undefined
    };

    if (f.status === 'Completed' && editingTask.status !== 'Completed') {
      updates.completedAt = new Date().toISOString();
    }
    if (f.status === 'Claimed' && editingTask.status !== 'Claimed') {
      updates.claimedAt = new Date().toISOString();
    }

    await updateServiceTask(editingTask.id, updates);
    await addActivity(editingTask.id, 'Task Edited', `Task details edited by ${currentUser?.name || 'Admin'}`);
    addNotification('Task Updated', `Service task ${editingTask.taskNumber} has been updated.`, 'success');
    setShowEditModal(false);
    setEditingTask(null);
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

  const MetricCard = ({ label, value, icon, color }: { label: string; value: number; icon: any; color: string }) => (
    <div className="bg-white dark:bg-slate-900 p-2.5 md:p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2.5 min-w-[90px] shrink-0 snap-start">
      <div className={`p-1.5 rounded-lg ${color} text-white shadow shrink-0`}>{icon}</div>
      <div className="min-w-0 flex items-baseline gap-1.5">
        <p className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">{value}</p>
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  );

  const SectionCard = ({ task }: { task: ServiceTask }) => {
    const cfg = STATUS_CONFIG[task.status];
    const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', task.id);
      e.dataTransfer.effectAllowed = 'move';
    };
    return (
      <div
        draggable
        onDragStart={handleDragStart}
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
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEditModal(task);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all"
                title="Edit Task Details"
              >
                <Pencil size={12} />
              </button>
            )}
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                <Clock size={10} />
                {new Date(task.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-[8px] font-semibold text-slate-400">
                {new Date(task.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 mb-1">
          <span className="text-[8px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 mt-0.5">{task.taskNumber}</span>
          <h5 className="font-black text-slate-800 dark:text-slate-100 text-[11px] uppercase tracking-tight leading-tight">{task.customerName}</h5>
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
    const [dropOver, setDropOver] = useState(false);
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropOver(true); };
    const handleDragLeave = (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false);
    };
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDropOver(false);
      const taskId = e.dataTransfer.getData('text/plain');
      if (taskId) handleStatusChange(taskId, status);
    };
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 min-w-[280px] md:min-w-[320px] flex flex-col min-h-0 rounded-[2.5rem] border shadow-inner overflow-hidden transition-all ${
          dropOver ? 'border-teal-400 bg-teal-50/40 dark:bg-teal-900/10 shadow-lg' : 'border-slate-300/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20'
        }`}
      >
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`}></div>
            <h4 className="font-black text-[9px] uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">{cfg.label}</h4>
          </div>
          <span className="bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400">{tasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-scroll p-4 space-y-4">
          {tasks.map(task => (
            <div key={task.id}>
              <SectionCard task={task} />
              {status === 'New' && (
                <button onClick={(e) => { e.stopPropagation(); handleClaim(task.id); }} className="mt-2 w-full bg-emerald-600 text-white py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
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
    <>
    <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden relative p-0 md:p-1">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 md:p-5 pt-6 rounded-none rounded-b-[1.5rem] md:rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative overflow-hidden group m-0 md:m-3 lg:m-4">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="hidden sm:flex items-center gap-5 relative z-10 w-full lg:w-auto">
          <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
            <QrCode size={20} className="hidden xl:block" />
            <QrCode size={16} className="xl:hidden" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Service Task</h2>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-emerald-400/20 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <span className="text-[7.5px] font-black text-emerald-300 uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="flex bg-emerald-900/40 border border-emerald-700/50 p-1 rounded-full w-fit">
              <button 
                onClick={() => setViewState('registry')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewState === 'registry' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-100/70 hover:text-white'}`}
              >
                Registry
              </button>
              <button 
                onClick={() => setViewState('turnover')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewState === 'turnover' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-100/70 hover:text-white'}`}
              >
                Turnover
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto relative z-10">
          <div className="relative group/search flex-1 lg:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-100/50 group-focus-within/search:text-white transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search requests..."
              className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-3 pl-11 pr-4 text-[11px] font-bold uppercase tracking-wider outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowQR(!showQR)}
              className={`flex-1 px-4 py-3 rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5 md:gap-2 ${showQR ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-600 text-white shadow-lg'}`}
            >
              <QrCode size={14} className="md:w-[16px] md:h-[16px]" /> {showQR ? 'Hide QR' : 'Show QR'}
            </button>
            {isAdmin && (
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="flex-1 bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-4 py-3 rounded-[2rem] text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] shadow-[0_15px_30px_-5px_rgba(197,160,89,0.4)] hover:scale-[1.02] hover:shadow-[0_20px_40px_-5px_rgba(197,160,89,0.6)] transition-all active:scale-95 flex items-center justify-center gap-1.5 md:gap-2"
              >
                <Plus size={14} className="md:w-[16px] md:h-[16px]" /> Create
              </button>
            )}
          </div>
        </div>
      </div>

      {viewState === 'registry' ? (
        <>
          {/* Dashboard Metrics */}
          <div className="flex overflow-x-auto lg:grid lg:grid-cols-7 gap-1.5 shrink-0 px-2 md:px-0 [&::-webkit-scrollbar]:hidden snap-x">
        <MetricCard label="Total" value={metrics.total} icon={<BarChart3 size={14} />} color="bg-slate-600" />
        <MetricCard label="New" value={metrics.newTasks} icon={<AlertCircle size={14} />} color="bg-blue-600" />
        <MetricCard label="Unassigned" value={metrics.unassigned} icon={<User size={14} />} color="bg-amber-600" />
        <MetricCard label="Claimed" value={metrics.claimed} icon={<Play size={14} />} color="bg-indigo-600" />
        <MetricCard label="In Progress" value={metrics.inProgress} icon={<Package size={14} />} color="bg-teal-600" />
        <MetricCard label="Completed" value={metrics.completed} icon={<CheckCircle size={14} />} color="bg-emerald-600" />
        <MetricCard label="Overdue" value={metrics.overdue} icon={<Clock size={14} />} color={metrics.overdue > 0 ? 'bg-rose-600' : 'bg-slate-400'} />
      </div>

      {/* QR Code Section */}
      {showQR && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-300 dark:border-slate-800 shadow-sm shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="bg-white p-4 rounded-[2rem] shadow-lg border border-slate-200">
              <QRCodeSVG value={formUrl} size={160} level="M" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-2">Public QR Code</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                Share this QR code anywhere — print on brochures, invoices, or share via WhatsApp. Anyone can scan to submit a service request without login.
              </p>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <input
                  readOnly
                  value={formUrl}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-3 py-1.5 text-[10px] font-bold text-slate-500 w-full max-w-md outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(formUrl); addNotification('Copied', 'URL copied to clipboard.', 'success'); }}
                  className="bg-teal-600 text-white px-4 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 transition-all shrink-0"
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
        {isAdmin && <KanbanColumn status="Non Billed" />}
        {isAdmin && <KanbanColumn status="Billed" />}
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
 <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight mt-1 truncate">{selectedTask.customerName}</h3>
                {selectedTask.companyName && <p className="text-[11px] font-bold text-slate-500 mt-1">{selectedTask.companyName}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => handleOpenEditModal(selectedTask)}
                    className="p-2 text-teal-600 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/30 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
                    title="Edit Task Details"
                  >
                    <Pencil size={18} />
                    <span className="hidden sm:inline">Edit Task</span>
                  </button>
                )}
                {isAdmin && (
                  <button 
                    onClick={async () => {
                      const confirmed = await showConfirm(`Are you sure you want to PERMANENTLY delete Service Task ${selectedTask.taskNumber}? This action cannot be undone.`);
                      if (confirmed) {
                        try {
                          await removeServiceTask(selectedTask.id);
                          addNotification('Task Deleted', `${selectedTask.taskNumber} has been removed.`, 'success');
                          setSelectedTaskId(null);
                          setShowStatusMenu(false);
                        } catch (err) {
                          addNotification('Error', 'Failed to delete task.', 'alert');
                        }
                      }
                    }} 
                    className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                    title="Delete Task"
                  >
                    <Trash2 size={22} />
                  </button>
                )}
                <button onClick={() => { setSelectedTaskId(null); setShowStatusMenu(false); }} className="p-2 text-slate-400 hover:text-slate-800 transition-all shrink-0"><X size={28} /></button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 md:p-8 space-y-5">

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
                          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-2xl py-2 z-50 min-w-[200px]">
                            {getNextStatuses(selectedTask.status, isAdmin).map(s => (
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
                    {(() => {
                      const visibleFlow = STATUS_FLOW.filter(s => isAdmin || s !== 'Billed');
                      return visibleFlow.map((s, i) => {
                        const isCurrent = s === selectedTask.status;
                        const isPast = visibleFlow.indexOf(selectedTask.status) >= i;
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
                    })})()}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={14} className="text-teal-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.customerName}</p>
                    {selectedTask.companyName && <p className="text-[10px] text-slate-500 mt-0.5">{selectedTask.companyName}</p>}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={14} className="text-teal-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipment</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.equipment}</p>
                    {selectedTask.serviceCategory && <p className="text-[10px] text-slate-500 mt-0.5">{selectedTask.serviceCategory}</p>}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
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
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTask.subject}</div>
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
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none focus:border-teal-500 resize-none"
                      value={visitNotes}
                      onChange={(e) => setVisitNotes(e.target.value)}
                    />
                    {visitNotes !== (selectedTask.visitNotes || '') && (
                      <button onClick={handleSaveVisitNotes} className="mt-2 bg-teal-600 text-white px-5 py-2 rounded-[2rem] text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 transition-all">
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
                      <select className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-3 py-2 text-[10px] font-bold outline-none appearance-none"
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
                        className="bg-teal-600 text-white px-5 py-2.5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-teal-700 transition-all disabled:opacity-50 flex items-center gap-2"
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
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-[2rem] text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedTask.completionNotes}</div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageSquare size={14} className="text-teal-600" /> Comments ({selectedTask.comments?.length || 0})</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                    {(selectedTask.comments || []).slice().reverse().map(c => (
                      <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
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
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none focus:border-teal-500"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                      />
                      <button onClick={handleAddComment} className="bg-teal-600 text-white px-3 py-1.5 rounded-[2rem] hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50" disabled={!newComment.trim()}>
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
                      <div key={a.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned To</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedTask.assignedTo || 'Unassigned'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority</span>
                    <p className={`text-xs font-bold mt-1 ${
                      selectedTask.priority === 'Urgent' ? 'text-rose-600' :
                      selectedTask.priority === 'High' ? 'text-orange-600' :
                      'text-slate-600 dark:text-slate-300'
                    }`}>{selectedTask.priority}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                    <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTask.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {selectedTask.claimedAt && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Claimed by {selectedTask.assignedTo}</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTask.claimedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {selectedTask.completedAt && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-[2rem]">
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
                <button onClick={() => { handleClaim(selectedTask.id); setSelectedTaskId(null); }} className="w-full bg-emerald-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Play size={16} /> Claim This Request
                </button>
              )}
              {(selectedTask.assignedTo === currentUser?.name || isAdmin) && selectedTask.status !== 'Completed' && selectedTask.status !== 'Cancelled' && selectedTask.status !== 'New' && (
                <div className="flex gap-3">
                  {getNextStatuses(selectedTask.status).filter(s => s === 'Completed').map(s => (
                    <button key={s} onClick={async () => { await handleStatusChange(selectedTask.id, s); setSelectedTaskId(null); }} className="flex-1 bg-emerald-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Mark Completed
                    </button>
                  ))}
                  <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all relative">
                    <MoreHorizontal size={18} />
                    {showStatusMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-2xl py-2 z-50 min-w-[180px]">
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
      </>
      ) : (
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {employeeSummary.map(emp => (
              <div 
                key={emp.employeeName}
                onClick={() => setSelectedEmployeeForTurnover(selectedEmployeeForTurnover === emp.employeeName ? null : emp.employeeName)}
                className={`bg-white dark:bg-slate-900 rounded-[2rem] p-5 border cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-3 ${selectedEmployeeForTurnover === emp.employeeName ? 'border-emerald-500 shadow-md' : 'border-slate-200 dark:border-slate-800 shadow-sm'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User size={18} className="text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-tight">{emp.employeeName}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tasks: {emp.total}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attended</p>
                    <p className="text-sm font-bold text-indigo-600">{emp.attended}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed</p>
                    <p className="text-sm font-bold text-emerald-600">{emp.completed}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed</p>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{emp.billed}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Not Billed</p>
                    <p className="text-sm font-bold text-rose-600">{emp.notBilled}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                    <p className="text-sm font-bold text-amber-600">{emp.pending}</p>
                  </div>
                </div>
              </div>
            ))}
            {employeeSummary.length === 0 && (
              <div className="col-span-full py-10 text-center opacity-30 italic font-bold text-slate-400 text-sm">No tasks assigned yet.</div>
            )}
          </div>
          
          {selectedEmployeeForTurnover && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden shrink-0">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase leading-none">{selectedEmployeeForTurnover}</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Performance Analytics</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedStatusForTurnover('Attended')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatusForTurnover === 'Attended' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>Attended</button>
                  <button onClick={() => setSelectedStatusForTurnover('Completed')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatusForTurnover === 'Completed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>Completed</button>
                  <button onClick={() => setSelectedStatusForTurnover('Pending')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatusForTurnover === 'Pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>Pending</button>
                  <button onClick={() => setSelectedStatusForTurnover('Billed')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatusForTurnover === 'Billed' ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>Billed</button>
                  <button onClick={() => setSelectedStatusForTurnover('Not Billed')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatusForTurnover === 'Not Billed' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>Not Billed</button>
                  {selectedStatusForTurnover && <button onClick={() => setSelectedStatusForTurnover(null)} className="px-3 py-2 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 transition-all"><X size={14} /></button>}
                </div>
              </div>
              
              <div className="p-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeSummary.filter(e => e.employeeName === selectedEmployeeForTurnover)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="employeeName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                    <Bar dataKey="attended" name="Attended" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="billed" name="Billed" fill="#475569" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="notBilled" name="Not Billed" fill="#e11d48" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="pending" name="Pending" fill="#d97706" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Drill-down list */}
              {selectedStatusForTurnover && (
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <ListFilter size={12} /> {selectedStatusForTurnover} Tasks
                    </h4>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {serviceTasks.filter(t => {
                      const assignedMatch = t.assignedTo === selectedEmployeeForTurnover || (employees.find(e => e.id === t.assignedToId)?.name === selectedEmployeeForTurnover);
                      if (!assignedMatch) return false;
                      if (selectedStatusForTurnover === 'Attended') return t.status !== 'New' && t.status !== 'Cancelled';
                      if (selectedStatusForTurnover === 'Completed') return ['Completed', 'Non Billed', 'Billed'].includes(t.status);
                      if (selectedStatusForTurnover === 'Billed') return t.status === 'Billed';
                      if (selectedStatusForTurnover === 'Not Billed') return t.status === 'Non Billed';
                      if (selectedStatusForTurnover === 'Pending') return ['New', 'Claimed', 'In Progress', 'On Hold', 'Waiting for Customer', 'Reopened'].includes(t.status);
                      return false;
                    }).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 px-4 hover:bg-white dark:hover:bg-slate-800 rounded-[1rem] transition-colors group cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded uppercase tracking-wider">{task.taskNumber}</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{task.customerName}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate max-w-sm">{task.issue}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${STATUS_CONFIG[task.status].color} text-white`}>{STATUS_CONFIG[task.status].label}</span>
                          <span className="text-[9px] font-bold text-slate-400">{new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Create Service Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-800 transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Customer Name <span className="text-rose-400">*</span></label>
                  <AutoSuggest
                    value={newTaskForm.customerName}
                    onChange={val => setNewTaskForm(p => ({ ...p, customerName: val }))}
                    onSelect={client => setNewTaskForm(p => ({
                      ...p,
                      customerName: client.name || client.hospital || '',
                      companyName: client.hospital || client.name || p.companyName,
                      customerPhone: client.phone || client.contactPhone || p.customerPhone,
                      customerEmail: client.email || p.customerEmail,
                      location: client.address || p.location
                    }))}
                    suggestions={clients}
                    filterKey="name"
                    placeholder="Rajesh Kumar (auto-suggest on type)"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Company / Hospital</label>
                  <AutoSuggest
                    value={newTaskForm.companyName}
                    onChange={val => setNewTaskForm(p => ({ ...p, companyName: val }))}
                    onSelect={client => setNewTaskForm(p => ({
                      ...p,
                      companyName: client.hospital || client.name || '',
                      customerName: p.customerName || client.name || client.hospital || '',
                      customerPhone: client.phone || client.contactPhone || p.customerPhone,
                      customerEmail: client.email || p.customerEmail,
                      location: client.address || p.location
                    }))}
                    suggestions={clients}
                    filterKey="hospital"
                    placeholder="Sree Meditech / Hospital (auto-suggest on type)"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Phone <span className="text-rose-400">*</span></label>
                  <input type="tel" className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100" placeholder="9876543210" value={newTaskForm.customerPhone} onChange={e => setNewTaskForm(p => ({ ...p, customerPhone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Email <span className="text-[9px] text-slate-400 font-normal">(Optional)</span></label>
                  <input type="email" className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100" placeholder="rajesh@hospital.com (optional)" value={newTaskForm.customerEmail} onChange={e => setNewTaskForm(p => ({ ...p, customerEmail: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Subject</label>
                  <input className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100" placeholder="Service request title" value={newTaskForm.subject} onChange={e => setNewTaskForm(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Equipment <span className="text-rose-400">*</span></label>
                  <AutoSuggest
                    value={newTaskForm.equipment}
                    onChange={val => setNewTaskForm(p => ({ ...p, equipment: val }))}
                    onSelect={prod => setNewTaskForm(p => ({
                      ...p,
                      equipment: prod.name,
                      serviceCategory: prod.category && SERVICE_CATEGORIES.includes(prod.category) ? prod.category : (p.serviceCategory || 'Medical Equipment')
                    }))}
                    suggestions={products}
                    filterKey="name"
                    placeholder="X-Ray Machine (auto-suggest on type)"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Serial No <span className="text-rose-400">*</span></label>
                  <input className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all uppercase" placeholder="SN12345678" value={newTaskForm.serialNo} onChange={e => setNewTaskForm(p => ({ ...p, serialNo: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Category</label>
                  <select className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none" value={newTaskForm.serviceCategory} onChange={e => setNewTaskForm(p => ({ ...p, serviceCategory: e.target.value }))}>
                    <option value="">Select category</option>
                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Priority</label>
                  <select className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none" value={newTaskForm.priority} onChange={e => setNewTaskForm(p => ({ ...p, priority: e.target.value as ServiceTask['priority'] }))}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Location</label>
                <input className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all" placeholder="Full address or landmark" value={newTaskForm.location} onChange={e => setNewTaskForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Issue Description <span className="text-rose-400">*</span></label>
                <textarea rows={4} className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3 py-1.5 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none" placeholder="Describe the problem in detail..." value={newTaskForm.issue} onChange={e => setNewTaskForm(p => ({ ...p, issue: e.target.value }))} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 md:p-8 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-wider border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
              <button onClick={handleCreateTask} className="px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-all active:scale-95">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Task Modal (Admin) */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => { setShowEditModal(false); setEditingTask(null); }}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded uppercase tracking-wider">{editingTask.taskNumber}</span>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Admin Edit Mode</span>
                </div>
                <h3 className="text-lg font-playfair font-bold tracking-tight text-slate-800 dark:text-slate-100 uppercase tracking-tight">Edit Service Task</h3>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingTask(null); }} className="p-2 text-slate-400 hover:text-slate-800 transition-all"><X size={20} /></button>
            </div>

            {/* Modal Form */}
            <div className="p-6 md:p-8 space-y-5">
              {/* Task Subject / Title */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Task Title / Subject</label>
                <input
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all"
                  placeholder="E.g., Medical Equipment Calibration / Repair"
                  value={editTaskForm.subject}
                  onChange={e => setEditTaskForm(p => ({ ...p, subject: e.target.value }))}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Customer / Client Name <span className="text-rose-400">*</span></label>
                  <AutoSuggest
                    value={editTaskForm.customerName}
                    onChange={val => setEditTaskForm(p => ({ ...p, customerName: val }))}
                    onSelect={client => setEditTaskForm(p => ({
                      ...p,
                      customerName: client.name || client.hospital || '',
                      companyName: client.hospital || client.name || p.companyName,
                      customerPhone: client.phone || client.contactPhone || p.customerPhone,
                      customerEmail: client.email || p.customerEmail,
                      location: client.address || p.location
                    }))}
                    suggestions={clients}
                    filterKey="name"
                    placeholder="Customer Name (auto-suggest on type)"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Hospital / Company Name</label>
                  <AutoSuggest
                    value={editTaskForm.companyName}
                    onChange={val => setEditTaskForm(p => ({ ...p, companyName: val }))}
                    onSelect={client => setEditTaskForm(p => ({
                      ...p,
                      companyName: client.hospital || client.name || '',
                      customerName: p.customerName || client.name || client.hospital || '',
                      customerPhone: client.phone || client.contactPhone || p.customerPhone,
                      customerEmail: client.email || p.customerEmail,
                      location: client.address || p.location
                    }))}
                    suggestions={clients}
                    filterKey="hospital"
                    placeholder="Hospital / Facility Name (auto-suggest on type)"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Contact Phone <span className="text-rose-400">*</span></label>
                  <input
                    type="tel"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Mobile / Phone number"
                    value={editTaskForm.customerPhone}
                    onChange={e => setEditTaskForm(p => ({ ...p, customerPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Contact Email</label>
                  <input
                    type="email"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Email address (optional)"
                    value={editTaskForm.customerEmail}
                    onChange={e => setEditTaskForm(p => ({ ...p, customerEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Equipment Name <span className="text-rose-400">*</span></label>
                  <AutoSuggest
                    value={editTaskForm.equipment}
                    onChange={val => setEditTaskForm(p => ({ ...p, equipment: val }))}
                    onSelect={prod => setEditTaskForm(p => ({
                      ...p,
                      equipment: prod.name,
                      serviceCategory: prod.category && SERVICE_CATEGORIES.includes(prod.category) ? prod.category : (p.serviceCategory || 'Medical Equipment')
                    }))}
                    suggestions={products}
                    filterKey="name"
                    placeholder="Equipment Name (auto-suggest on type)"
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Serial Number</label>
                  <input
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all uppercase"
                    placeholder="Serial Number"
                    value={editTaskForm.serialNo}
                    onChange={e => setEditTaskForm(p => ({ ...p, serialNo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Service Category</label>
                  <select
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none"
                    value={editTaskForm.serviceCategory}
                    onChange={e => setEditTaskForm(p => ({ ...p, serviceCategory: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {SERVICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Priority</label>
                  <select
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none"
                    value={editTaskForm.priority}
                    onChange={e => setEditTaskForm(p => ({ ...p, priority: e.target.value as ServiceTask['priority'] }))}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Task Status</label>
                  <select
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none"
                    value={editTaskForm.status}
                    onChange={e => setEditTaskForm(p => ({ ...p, status: e.target.value as ServiceTaskStatus }))}
                  >
                    {STATUS_FLOW.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Assigned Engineer</label>
                  <select
                    className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all appearance-none"
                    value={editTaskForm.assignedToId}
                    onChange={e => setEditTaskForm(p => ({ ...p, assignedToId: e.target.value }))}
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.filter(e => e.status !== 'Resigned').map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || 'Staff'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Service Location / Address</label>
                <input
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all"
                  placeholder="Full hospital address or location"
                  value={editTaskForm.location}
                  onChange={e => setEditTaskForm(p => ({ ...p, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 ml-0.5 mb-1.5 block">Issue Description <span className="text-rose-400">*</span></label>
                <textarea
                  rows={4}
                  className="w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-[2rem] px-3.5 py-2 text-sm font-medium outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none"
                  placeholder="Describe the problem in detail..."
                  value={editTaskForm.issue}
                  onChange={e => setEditTaskForm(p => ({ ...p, issue: e.target.value }))}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 md:p-8 flex justify-end gap-3">
              <button
                onClick={() => { setShowEditModal(false); setEditingTask(null); }}
                className="px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-wider border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditTask}
                className="px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-wider bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claimed Successfully & Share Info to Client Popup Card */}
      {claimedSuccessTask && (
        <div className="fixed inset-0 z-[140] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] border border-emerald-500/30 dark:border-emerald-500/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-green-950 p-6 sm:p-7 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 bg-teal-400/20 rounded-full blur-2xl pointer-events-none"></div>

              <button
                onClick={() => setClaimedSuccessTask(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all z-10"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
                  <CheckCircle2 size={32} className="text-emerald-400 animate-pulse" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Sparkles size={11} className="text-emerald-400" /> Claimed Successfully
                    </span>
                    <span className="text-[10px] font-bold text-emerald-200/80">
                      {claimedSuccessTask.taskNumber}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                    Task Assigned to You
                  </h3>
                  <p className="text-xs text-emerald-100/80 mt-1">
                    You are now the owner of this request. Share the update directly with the client on WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Task Details Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Client / Hospital</span>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {claimedSuccessTask.customerName}
                    </h4>
                    {claimedSuccessTask.companyName && (
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 size={12} className="text-slate-400" />
                        {claimedSuccessTask.companyName}
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    {claimedSuccessTask.priority}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Equipment</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Wrench size={12} className="text-teal-500 shrink-0" />
                      <span className="truncate">{claimedSuccessTask.equipment}</span>
                    </p>
                    {claimedSuccessTask.serialNo && (
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        S/N: {claimedSuccessTask.serialNo}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assigned Engineer</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <User size={12} className="text-indigo-500 shrink-0" />
                      <span className="truncate">{claimedSuccessTask.assignedTo || currentUser?.name || 'Assigned'}</span>
                    </p>
                    {claimedSuccessTask.location && (
                      <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-slate-400 shrink-0" />
                        <span className="truncate">{claimedSuccessTask.location}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Reported Issue</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 line-clamp-3">
                    {claimedSuccessTask.issue}
                  </p>
                </div>
              </div>

              {/* Client WhatsApp Number Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-500" />
                    Client WhatsApp Number
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">Pre-filled from request</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customClientPhone}
                    onChange={(e) => setCustomClientPhone(e.target.value)}
                    placeholder="Enter phone number (e.g. 9840012345)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all pl-10"
                  />
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Standard 10-digit Indian numbers will automatically be prefixed with +91.
                </p>
              </div>

              {/* Predefined WhatsApp Message Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageCircle size={13} className="text-emerald-500" />
                    Predefined WhatsApp Message Preview
                  </label>
                  <button
                    onClick={handleCopyWhatsAppMessage}
                    type="button"
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95"
                  >
                    {copiedMessage ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedMessage ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                  {generateWhatsAppMessage(claimedSuccessTask)}
                </div>
              </div>
            </div>

            {/* Footer with "Share info to Client" button */}
            <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleShareInfoToClient}
                className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:via-teal-500 hover:to-green-500 text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-900/25 hover:shadow-emerald-900/40 active:scale-95 transition-all text-xs uppercase tracking-wider group"
              >
                <MessageCircle size={18} className="fill-current text-white group-hover:scale-110 transition-transform" />
                <span>Share info to Client</span>
                <ExternalLink size={14} className="opacity-80" />
              </button>
              <button
                onClick={() => setClaimedSuccessTask(null)}
                className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
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
        className={`relative group bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden ${isImage ? 'cursor-pointer' : ''}`}
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
          <img src={att.data} alt={att.name} className="max-w-full max-h-full object-contain rounded-[2rem]" />
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
