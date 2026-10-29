import React, { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ServiceTask, ServiceTaskStatus, ServiceTaskComment, ServiceTaskAttachment, ServiceTaskActivity, TabView, ServiceReport, ServiceReportItem } from '../types';
import {
  QrCode, User, Clock, Phone, MapPin,
  X, CheckCircle, Play, Search, BarChart3, Package, MessageSquare,
  FileText, Image, Upload, Send, AlertCircle, MoreHorizontal, ChevronDown,
  Eye, Paperclip, Download, Plus, Trash2, ListFilter,
  MessageCircle, CheckCircle2, Copy, Check, ExternalLink, Wrench, Sparkles,
  Pencil, Save, Printer, FileCheck, UserCheck, Building2, ArrowRight, Filter, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';
import { PDFService } from '../services/PDFService';

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

const getNextStatuses = (current: ServiceTaskStatus, isAdmin: boolean = false, hasServiceReport: boolean = false): ServiceTaskStatus[] => {
  switch (current) {
    case 'New': return ['Claimed', 'Cancelled'];
    case 'Claimed': return ['In Progress', 'On Hold', 'Waiting for Customer', 'Cancelled'];
    case 'In Progress': return ['Completed', 'On Hold', 'Waiting for Customer', 'Cancelled'];
    case 'Completed': return isAdmin ? (hasServiceReport ? ['Billed', 'Non Billed', 'Reopened'] : ['Reopened']) : ['Reopened'];
    case 'On Hold': return ['In Progress', 'Waiting for Customer', 'Cancelled'];
    case 'Waiting for Customer': return ['In Progress', 'On Hold', 'Cancelled'];
    case 'Cancelled': return ['Reopened'];
    case 'Reopened': return ['Claimed', 'In Progress', 'On Hold', 'Cancelled'];
    case 'Non Billed': return isAdmin ? (hasServiceReport ? ['Billed', 'Reopened'] : ['Reopened']) : ['Reopened'];
    case 'Billed': return [];
    default: return ['Claimed', 'Cancelled'];
  }
};

export const ServiceTaskModule: React.FC<ServiceTaskModuleProps> = ({ userRole }) => {
  const { serviceTasks, employees, addServiceTask, updateServiceTask, removeServiceTask, currentUser, showConfirm, addNotification, clients, products, serviceReports, addServiceReport, updateServiceReport, financialYear, setActiveTab, setPendingServiceReportData, previewPDF } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewState, setViewState] = useState<'registry' | 'turnover' | 'pendingReports'>('registry');
  const [pendingReportFilterEmp, setPendingReportFilterEmp] = useState<string>('all');
  const [pendingReportSort, setPendingReportSort] = useState<'oldest' | 'newest'>('oldest');
  const [pendingReportViewMode, setPendingReportViewMode] = useState<'cards' | 'table'>('cards');
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

  // State for Service Task -> Service Report popup connection
  const [completedTaskForReport, setCompletedTaskForReport] = useState<ServiceTask | null>(null);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [reportSuccessData, setReportSuccessData] = useState<{ report: ServiceReport; task: ServiceTask } | null>(null);
  const [reportForm, setReportForm] = useState<{
    serialNumber: string;
    actionTaken: string;
    engineerObservations: string;
    machineStatus: 'Warranty' | 'Out Of Warranty' | 'AMC';
    visitType: string;
    department: string;
    model: string;
    poWoNumber: string;
    softwareVersion: string;
    serviceCategory: 'Medical Equipment' | 'Pipeline';
    itemsUsed: ServiceReportItem[];
    visitCharges: number;
    sparesCharges: number;
    amountReceived: number;
    memoNumber: string;
    queriesRemarks: string;
  }>({
    serialNumber: '',
    actionTaken: '',
    engineerObservations: '',
    machineStatus: 'Warranty',
    visitType: 'Breakdown',
    department: '',
    model: '',
    poWoNumber: '',
    softwareVersion: '',
    serviceCategory: 'Medical Equipment',
    itemsUsed: [],
    visitCharges: 0,
    sparesCharges: 0,
    amountReceived: 0,
    memoNumber: '',
    queriesRemarks: ''
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

  const pendingReportTasks = useMemo(() => {
    return serviceTasks.filter(t => {
      if (t.status !== 'Completed') return false;
      const isAssigned = isAdmin || t.assignedTo === currentUser?.name || t.assignedToId === currentUser?.id;
      if (!isAssigned) return false;
      const hasReport = t.serviceReportId || serviceReports.some(r => r.referenceTaskId === t.id || r.referenceOrderId === t.id);
      return !hasReport;
    });
  }, [serviceTasks, serviceReports, currentUser, isAdmin]);

  const pendingReportStats = useMemo(() => {
    const total = pendingReportTasks.length;
    const now = Date.now();
    let overdueCount = 0;
    let todayCount = 0;
    pendingReportTasks.forEach(t => {
      const completionTime = new Date(t.completedAt || t.createdAt).getTime();
      const diffHours = (now - completionTime) / (1000 * 60 * 60);
      if (diffHours > 24) overdueCount++;
      else todayCount++;
    });
    return { total, overdueCount, todayCount };
  }, [pendingReportTasks]);

  const engineersWithPending = useMemo(() => {
    const set = new Set<string>();
    pendingReportTasks.forEach(t => {
      if (t.assignedTo) set.add(t.assignedTo);
    });
    return Array.from(set);
  }, [pendingReportTasks]);

  const displayedPendingTasks = useMemo(() => {
    return pendingReportTasks.filter(t => {
      if (pendingReportFilterEmp !== 'all') {
        const matchesEmp = t.assignedTo === pendingReportFilterEmp || t.assignedToId === pendingReportFilterEmp;
        if (!matchesEmp) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = 
          t.taskNumber?.toLowerCase().includes(q) ||
          t.customerName?.toLowerCase().includes(q) ||
          t.companyName?.toLowerCase().includes(q) ||
          t.equipment?.toLowerCase().includes(q) ||
          t.serialNo?.toLowerCase().includes(q) ||
          t.assignedTo?.toLowerCase().includes(q) ||
          t.issue?.toLowerCase().includes(q) ||
          t.customerPhone?.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.completedAt || a.createdAt).getTime();
      const timeB = new Date(b.completedAt || b.createdAt).getTime();
      return pendingReportSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [pendingReportTasks, pendingReportFilterEmp, searchQuery, pendingReportSort]);

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

  const openServiceReportModalForTask = (task: ServiceTask) => {
    // Check if report already exists for this task
    const existing = serviceReports.find(
      r => r.referenceTaskId === task.id || r.referenceOrderId === task.id || (task.serviceReportId && r.id === task.serviceReportId)
    );

    const defaultCategory: 'Medical Equipment' | 'Pipeline' = (task.serviceCategory === 'Pipeline Service' || task.serviceCategory === 'Pipeline') ? 'Pipeline' : 'Medical Equipment';

    setReportForm({
      serialNumber: existing?.serialNumber || task.serialNo || '',
      actionTaken: existing?.actionTaken || task.completionNotes || '',
      engineerObservations: existing?.engineerObservations || task.visitNotes || '',
      machineStatus: (existing?.machineStatus as any) || 'Warranty',
      visitType: existing?.visitType || (task.serviceCategory === 'Installation' ? 'Installation' : 'Breakdown'),
      department: existing?.department || '',
      model: existing?.model || '',
      poWoNumber: existing?.poWoNumber || task.taskNumber,
      softwareVersion: existing?.softwareVersion || '',
      serviceCategory: (existing?.serviceCategory as any) || defaultCategory,
      itemsUsed: existing?.itemsUsed ? existing.itemsUsed.map(it => ({ ...it })) : [],
      visitCharges: existing?.visitCharges || 0,
      sparesCharges: existing?.sparesCharges || 0,
      amountReceived: existing?.amountReceived || 0,
      memoNumber: existing?.memoNumber || '',
      queriesRemarks: existing?.queriesRemarks || ''
    });
    setCompletedTaskForReport(task);
  };

  const handleAddReportItem = (prod?: any) => {
    const newItem: ServiceReportItem = {
      id: `PART-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: prod?.name || '',
      quantity: 1,
      unitPrice: prod?.sellingPrice || 0,
      amount: prod?.sellingPrice || 0
    };
    setReportForm(prev => ({
      ...prev,
      itemsUsed: [...prev.itemsUsed, newItem]
    }));
  };

  const handleUpdateReportItem = (id: string, field: keyof ServiceReportItem, value: any) => {
    setReportForm(prev => ({
      ...prev,
      itemsUsed: prev.itemsUsed.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'description') {
            const masterProd = products.find(p => p.name === value);
            if (masterProd) updated.unitPrice = masterProd.sellingPrice;
          }
          updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
          return updated;
        }
        return item;
      })
    }));
  };

  const handleRemoveReportItem = (id: string) => {
    setReportForm(prev => ({
      ...prev,
      itemsUsed: prev.itemsUsed.filter(item => item.id !== id)
    }));
  };

  const handleSaveServiceReport = async () => {
    if (!completedTaskForReport) return;
    if (!reportForm.actionTaken.trim()) {
      addNotification('Required Field', 'Please enter Action Taken / Work Done to complete the service report.', 'alert');
      return;
    }

    setIsSavingReport(true);
    try {
      const task = completedTaskForReport;
      const engineerName = task.assignedTo || currentUser?.name || 'Engineer';

      // Check existing report
      const existing = serviceReports.find(
        r => r.referenceTaskId === task.id || r.referenceOrderId === task.id || (task.serviceReportId && r.id === task.serviceReportId)
      );

      let reportNumber = existing?.reportNumber;
      if (!reportNumber) {
        const currentYearReports = serviceReports.filter(r => r.reportNumber && r.reportNumber.includes(`/${financialYear}/`));
        const nextNum = currentYearReports.length + 1;
        reportNumber = `SMSR/${financialYear}/${nextNum}`;
      }

      const reportId = existing?.id || `SR-${Date.now()}`;
      const sparesTotal = (reportForm.itemsUsed || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);

      const reportData: ServiceReport = {
        id: reportId,
        reportNumber,
        date: existing?.date || new Date().toISOString().split('T')[0],
        time: existing?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        customerName: task.customerName,
        customerHospital: task.companyName || task.customerName,
        customerAddress: task.location || '',
        phone: task.customerPhone,
        equipmentName: task.equipment,
        serialNumber: reportForm.serialNumber.trim() || task.serialNo || '',
        model: reportForm.model.trim() || undefined,
        department: reportForm.department.trim() || undefined,
        serviceCategory: reportForm.serviceCategory,
        problemReported: task.issue,
        engineerName,
        actionTaken: reportForm.actionTaken.trim(),
        engineerObservations: reportForm.engineerObservations.trim() || undefined,
        machineStatus: reportForm.machineStatus,
        visitType: reportForm.visitType,
        poWoNumber: reportForm.poWoNumber.trim() || task.taskNumber,
        softwareVersion: reportForm.softwareVersion.trim() || undefined,
        status: 'Completed',
        documentType: 'ServiceReport',
        itemsUsed: reportForm.itemsUsed,
        visitCharges: Number(reportForm.visitCharges) || 0,
        sparesCharges: sparesTotal || Number(reportForm.sparesCharges) || 0,
        amountReceived: Number(reportForm.amountReceived) || 0,
        memoNumber: reportForm.memoNumber.trim() || undefined,
        queriesRemarks: reportForm.queriesRemarks.trim() || undefined,
        referenceOrderId: task.id,
        referenceOrderNumber: task.taskNumber,
        referenceTaskId: task.id,
        referenceTaskNumber: task.taskNumber,
        office: 'Chennai'
      };

      if (existing) {
        await updateServiceReport(reportId, reportData);
      } else {
        await addServiceReport(reportData);
      }

      await updateServiceTask(task.id, {
        serviceReportId: reportId,
        serviceReportNumber: reportNumber,
        serialNo: reportForm.serialNumber.trim() || task.serialNo,
        completionNotes: reportForm.actionTaken.trim()
      });

      await addActivity(task.id, 'Service Report Created', `Service Report ${reportNumber} finalized by ${engineerName}`);

      addNotification('Report Created', `Service Report ${reportNumber} created and linked to task ${task.taskNumber}.`, 'success');

      setReportSuccessData({ report: reportData, task });
      setCompletedTaskForReport(null);
    } catch (err) {
      console.error('Failed to save service report:', err);
      addNotification('Save Error', 'Could not create service report.', 'alert');
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleOpenInFullBuilder = (task: ServiceTask) => {
    const sparesTotal = (reportForm.itemsUsed || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0);
    setPendingServiceReportData({
      customerName: task.customerName,
      customerHospital: task.companyName || task.customerName,
      customerAddress: task.location || '',
      phone: task.customerPhone,
      equipmentName: task.equipment,
      model: reportForm.model,
      serialNumber: reportForm.serialNumber.trim() || task.serialNo || '',
      department: reportForm.department,
      engineerName: task.assignedTo || currentUser?.name || 'Engineer',
      problemReported: task.issue,
      actionTaken: reportForm.actionTaken,
      engineerObservations: reportForm.engineerObservations,
      machineStatus: reportForm.machineStatus,
      visitType: reportForm.visitType,
      serviceCategory: reportForm.serviceCategory,
      poWoNumber: reportForm.poWoNumber || task.taskNumber,
      referenceOrderId: task.id,
      referenceOrderNumber: task.taskNumber,
      referenceTaskId: task.id,
      referenceTaskNumber: task.taskNumber,
      itemsUsed: reportForm.itemsUsed,
      visitCharges: Number(reportForm.visitCharges) || 0,
      sparesCharges: sparesTotal || Number(reportForm.sparesCharges) || 0,
      amountReceived: Number(reportForm.amountReceived) || 0,
      memoNumber: reportForm.memoNumber,
      queriesRemarks: reportForm.queriesRemarks,
    });
    setCompletedTaskForReport(null);
    setActiveTab(TabView.SERVICE_REPORTS);
  };

  const handleStatusChange = async (id: string, newStatus: ServiceTaskStatus) => {
    const task = serviceTasks.find(t => t.id === id);
    if (!task) return;

    const hasServiceReport = Boolean(
      task.serviceReportId || serviceReports.some(r => r.referenceTaskId === task.id || r.referenceOrderId === task.id)
    );
    if ((newStatus === 'Billed' || newStatus === 'Non Billed') && !hasServiceReport) {
      addNotification('Service Report Required', 'A completed Service Report must be filed before moving to Billed or Non Billed.', 'error');
      return;
    }

    const isFromNewToClaimed = (task.status === 'New' || !task.status) && newStatus === 'Claimed';
    const isBecomingCompleted = newStatus === 'Completed' && task.status !== 'Completed';
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

    if (isBecomingCompleted) {
      const completedTask: ServiceTask = {
        ...task,
        ...updates
      };
      openServiceReportModalForTask(completedTask);
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
        details: `Created manually by ${currentUser?.name || 'Admin'}`,
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

    const hasReport = Boolean(
      editingTask.serviceReportId ||
      serviceReports.some(r => r.referenceTaskId === editingTask.id || r.referenceOrderId === editingTask.id)
    );
    if ((f.status === 'Billed' || f.status === 'Non Billed') && !hasReport) {
      addNotification('Service Report Required', 'A completed Service Report must be created before setting status to Billed or Non Billed.', 'error');
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

    const isBecomingCompleted = f.status === 'Completed' && editingTask.status !== 'Completed';

    if (isBecomingCompleted) {
      updates.completedAt = new Date().toISOString();
    }
    if (f.status === 'Claimed' && editingTask.status !== 'Claimed') {
      updates.claimedAt = new Date().toISOString();
    }

    await updateServiceTask(editingTask.id, updates);
    await addActivity(editingTask.id, 'Task Edited', `Task details edited by ${currentUser?.name || 'Admin'}`);
    addNotification('Task Updated', `Service task ${editingTask.taskNumber} has been updated.`, 'success');
    setShowEditModal(false);
    if (isBecomingCompleted) {
      openServiceReportModalForTask({ ...editingTask, ...updates });
    }
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

        {task.status === 'Completed' && (() => {
          const linkedReport = serviceReports.find(
            r => r.referenceTaskId === task.id || r.referenceOrderId === task.id || (task.serviceReportId && r.id === task.serviceReportId)
          );
          return (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              {linkedReport ? (
                <button
                  onClick={async () => {
                    try {
                      const blob = await PDFService.generateServiceReportPDF(linkedReport);
                      previewPDF(blob, `${linkedReport.reportNumber}.pdf`);
                    } catch (err) {
                      addNotification('Error', 'Could not open PDF.', 'alert');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full transition-all"
                  title="View/Print Service Report PDF"
                >
                  <FileCheck size={11} className="text-emerald-600" />
                  <span className="font-inter tracking-wide">{linkedReport.reportNumber}</span>
                </button>
              ) : (
                <button
                  onClick={() => openServiceReportModalForTask(task)}
                  className="inline-flex items-center gap-1.5 text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full transition-all shadow-xs"
                  title="Create Service Report for this completed task"
                >
                  <Sparkles size={11} className="text-amber-600 animate-pulse" />
                  <span>Create Report</span>
                </button>
              )}
              {linkedReport && (
                <button
                  onClick={() => openServiceReportModalForTask(task)}
                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Edit Service Report"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          );
        })()}
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
            
            <div className="flex items-center bg-emerald-900/40 border border-emerald-700/50 p-1 rounded-full w-fit">
              <button 
                onClick={() => setViewState('registry')}
                className={`px-3 xl:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${viewState === 'registry' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-100/70 hover:text-white'}`}
              >
                Registry
              </button>
              <button 
                onClick={() => setViewState('turnover')}
                className={`px-3 xl:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${viewState === 'turnover' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-100/70 hover:text-white'}`}
              >
                Turnover
              </button>
              <button 
                onClick={() => setViewState('pendingReports')}
                className={`px-3 xl:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-1.5 ${viewState === 'pendingReports' ? 'bg-white text-emerald-900 shadow-md' : 'text-emerald-100/70 hover:text-white'}`}
              >
                <span>Pending Service Report</span>
                {pendingReportTasks.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none ${
                    viewState === 'pendingReports' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-400 text-amber-950'
                  }`}>
                    {pendingReportTasks.length}
                  </span>
                )}
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
                        {showStatusMenu && (() => {
                          const hasReport = Boolean(
                            selectedTask.serviceReportId ||
                            serviceReports.some(r => r.referenceTaskId === selectedTask.id || r.referenceOrderId === selectedTask.id)
                          );
                          const nextStatuses = getNextStatuses(selectedTask.status, isAdmin, hasReport);
                          return (
                            <div className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-2xl py-2 z-50 min-w-[200px] overflow-hidden">
                              {nextStatuses.length === 0 ? (
                                <div className="px-5 py-3 text-[10px] text-slate-400 italic">No status transitions available</div>
                              ) : (
                                nextStatuses.map(s => (
                                  <button
                                    key={s}
                                    onClick={async () => {
                                      await handleStatusChange(selectedTask.id, s);
                                      setShowStatusMenu(false);
                                    }}
                                    className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                                  >
                                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dotColor}`}></div>
                                    {STATUS_CONFIG[s].label}
                                  </button>
                                ))
                              )}
                              {!hasReport && selectedTask.status === 'Completed' && isAdmin && (
                                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200/50 dark:border-amber-800/50 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                  Create Service Report to unlock Billed & Non Billed
                                </div>
                              )}
                            </div>
                          );
                        })()}
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

                  {/* Connected Service Report Section */}
                  {selectedTask.status === 'Completed' && (() => {
                    const linkedReport = serviceReports.find(
                      r => r.referenceTaskId === selectedTask.id || r.referenceOrderId === selectedTask.id || (selectedTask.serviceReportId && r.id === selectedTask.serviceReportId)
                    );
                    return (
                      <div className="mt-3 p-4 rounded-[2rem] border bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                              <FileText size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Official Service Report</h4>
                              <p className="text-[10px] font-medium text-slate-500">Sign-off & Work Documentation</p>
                            </div>
                          </div>
                          {linkedReport ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Generated
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              Pending
                            </span>
                          )}
                        </div>

                        {linkedReport ? (
                          <div className="space-y-2 pt-1 text-[11px]">
                            <div className="grid grid-cols-2 gap-2 bg-white/70 dark:bg-slate-800/70 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Report Number:</span>
                                <p className="font-black text-emerald-700 dark:text-emerald-400 font-inter">{linkedReport.reportNumber}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Date & Time:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{linkedReport.date} {linkedReport.time || ''}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Service Engineer:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{linkedReport.engineerName}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Machine Status:</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{linkedReport.machineStatus || 'Standard'}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Serial Number (S/N):</span>
                                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{linkedReport.serialNumber || selectedTask.serialNo || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Equipment Model:</span>
                                <p className="font-bold text-indigo-600 dark:text-indigo-400 truncate">{linkedReport.equipmentName} {linkedReport.model ? `(${linkedReport.model})` : ''}</p>
                              </div>
                              {linkedReport.actionTaken && (
                                <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Action Taken:</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-2">{linkedReport.actionTaken}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={async () => {
                                  try {
                                    const blob = await PDFService.generateServiceReportPDF(linkedReport);
                                    previewPDF(blob, `${linkedReport.reportNumber}.pdf`);
                                  } catch (err) {
                                    addNotification('Error', 'Could not open PDF.', 'alert');
                                  }
                                }}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                              >
                                <Printer size={13} /> View / Print PDF
                              </button>
                              <button
                                onClick={() => openServiceReportModalForTask(selectedTask)}
                                className="px-4 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                              >
                                Edit Details
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 pt-1">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                              This task was completed by <strong className="text-slate-800 dark:text-slate-200">{selectedTask.assignedTo || 'Engineer'}</strong>. Create the official Service Report to record work done, replaced spares, and customer sign-off.
                            </p>
                            <button
                              onClick={() => openServiceReportModalForTask(selectedTask)}
                              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                            >
                              <Sparkles size={14} /> Create Service Report Now
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
              {selectedTask.status === 'Completed' && (() => {
                const hasReport = Boolean(
                  selectedTask.serviceReportId ||
                  serviceReports.some(r => r.referenceTaskId === selectedTask.id || r.referenceOrderId === selectedTask.id)
                );
                return (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => openServiceReportModalForTask(selectedTask)}
                        className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <FileText size={16} />
                        {hasReport ? 'View / Edit Service Report' : 'Create Service Report'}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={async () => {
                            await handleStatusChange(selectedTask.id, 'Reopened');
                            setSelectedTaskId(null);
                          }}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all"
                          title="Reopen Task"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                    {hasReport && isAdmin && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Billing Status:</span>
                        <button
                          onClick={async () => {
                            await handleStatusChange(selectedTask.id, 'Billed');
                            setSelectedTaskId(null);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          <span>Mark Billed</span>
                        </button>
                        <button
                          onClick={async () => {
                            await handleStatusChange(selectedTask.id, 'Non Billed');
                            setSelectedTaskId(null);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <X size={13} />
                          <span>Mark Non Billed</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                        {getNextStatuses(selectedTask.status, isAdmin, false).filter(s => s !== 'Completed').map(s => (
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
      ) : viewState === 'turnover' ? (
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
      ) : (
        <div className="flex-1 flex flex-col p-3 md:p-6 overflow-y-auto space-y-5 min-h-0">
          {/* KPI & Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 shrink-0">
            <div className="bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/60 rounded-[2rem] p-5 flex items-center gap-4 shadow-xs bg-white dark:bg-slate-900">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <FileText size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Pending Documentation</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{pendingReportStats.total}</h3>
                <p className="text-[10px] font-bold text-slate-400">Tasks awaiting official report</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent border border-rose-200 dark:border-rose-800/60 rounded-[2rem] p-5 flex items-center gap-4 shadow-xs bg-white dark:bg-slate-900">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Action Needed (&gt;24h)</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{pendingReportStats.overdueCount}</h3>
                <p className="text-[10px] font-bold text-slate-400">Delayed report creation</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-200 dark:border-emerald-800/60 rounded-[2rem] p-5 flex items-center gap-4 shadow-xs bg-white dark:bg-slate-900">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Sparkles size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Completed Recently</span>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{pendingReportStats.todayCount}</h3>
                <p className="text-[10px] font-bold text-slate-400">Completed within 24h</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent border border-indigo-200 dark:border-indigo-800/60 rounded-[2rem] p-5 flex items-center justify-between shadow-xs bg-white dark:bg-slate-900">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Service Reports</span>
                <h3 className="text-lg font-playfair font-bold text-slate-800 dark:text-slate-100 mt-0.5">Archive</h3>
                <p className="text-[10px] font-bold text-slate-400">{serviceReports.length} reports generated</p>
              </div>
              <button
                onClick={() => setActiveTab(TabView.SERVICE_REPORTS)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <span>Archive</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>

          {/* Filter & Controls Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                <Filter size={13} className="text-slate-400" />
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Engineer:</span>
                <select
                  value={pendingReportFilterEmp}
                  onChange={(e) => setPendingReportFilterEmp(e.target.value)}
                  className="bg-transparent font-bold text-[11px] text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all">All Engineers ({pendingReportTasks.length})</option>
                  {engineersWithPending.map(emp => (
                    <option key={emp} value={emp}>
                      {emp} ({pendingReportTasks.filter(t => t.assignedTo === emp || t.assignedToId === emp).length})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                <Clock size={13} className="text-slate-400" />
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Sort:</span>
                <select
                  value={pendingReportSort}
                  onChange={(e) => setPendingReportSort(e.target.value as 'oldest' | 'newest')}
                  className="bg-transparent font-bold text-[11px] text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="oldest">Oldest First (Most Urgent)</option>
                  <option value="newest">Newest Completed First</option>
                </select>
              </div>

              {searchQuery && (
                <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-bold">
                  <span>Filter: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-amber-950 ml-1"><X size={12} /></button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Showing {displayedPendingTasks.length} of {pendingReportTasks.length}
              </span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setPendingReportViewMode('cards')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    pendingReportViewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setPendingReportViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    pendingReportViewMode === 'table' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* Pending Tasks List */}
          {displayedPendingTasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-4 shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-playfair font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                {pendingReportTasks.length === 0 ? 'All Service Reports Up to Date!' : 'No Matching Pending Reports'}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-md mt-2">
                {pendingReportTasks.length === 0
                  ? 'Every completed service task currently has an official Service Report generated and linked. Outstanding work is 100% documented.'
                  : 'Try adjusting your search query or engineer filter to see more results.'}
              </p>
              {pendingReportTasks.length === 0 ? (
                <button
                  onClick={() => setViewState('registry')}
                  className="mt-6 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                >
                  View Service Registry
                </button>
              ) : (
                <button
                  onClick={() => { setSearchQuery(''); setPendingReportFilterEmp('all'); }}
                  className="mt-6 px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase tracking-wider transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : pendingReportViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedPendingTasks.map(task => {
                const completionDate = task.completedAt ? new Date(task.completedAt) : new Date(task.createdAt);
                const diffHours = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60);
                const isOverdue = diffHours > 24;

                return (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {task.taskNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            task.priority === 'Urgent' ? 'bg-rose-500 text-white' :
                            task.priority === 'High' ? 'bg-orange-500 text-white' :
                            task.priority === 'Medium' ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isOverdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {isOverdue ? `${Math.floor(diffHours / 24)}d ago` : `${Math.max(1, Math.floor(diffHours))}h ago`}
                        </span>
                      </div>

                      {/* Customer / Hospital */}
                      <div className="mb-3">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {task.customerName}
                        </h4>
                        {task.companyName && (
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{task.companyName}</span>
                          </p>
                        )}
                        {task.customerPhone && (
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone size={11} className="text-slate-400 shrink-0" />
                            <span>{task.customerPhone}</span>
                          </p>
                        )}
                      </div>

                      {/* Equipment & Serial */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-3 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Equipment</span>
                          {task.serialNo && (
                            <span className="text-[9px] font-mono font-bold text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              SN: {task.serialNo}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-xs text-indigo-700 dark:text-indigo-400 mt-0.5 truncate">
                          {task.equipment || 'Standard Service'}
                        </p>
                        {task.issue && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-snug">
                            <span className="font-semibold text-slate-400 text-[10px] uppercase">Issue: </span>
                            {task.issue}
                          </p>
                        )}
                      </div>

                      {/* Assigned Engineer & Completed Time */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-black">
                            {task.assignedTo ? task.assignedTo.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                            {task.assignedTo || 'Unassigned'}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          {completionDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => openServiceReportModalForTask(task)}
                        className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-[10px] uppercase tracking-wider py-2.5 px-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Sparkles size={13} className="text-amber-300" />
                        <span>Create Service Report</span>
                      </button>
                      <button
                        onClick={() => { setSelectedTaskId(task.id); setViewState('registry'); }}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                        title="View Task in Registry"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Ticket</th>
                      <th className="py-3.5 px-4">Customer & Facility</th>
                      <th className="py-3.5 px-4">Equipment / S/N</th>
                      <th className="py-3.5 px-4">Issue Summary</th>
                      <th className="py-3.5 px-4">Engineer</th>
                      <th className="py-3.5 px-4">Completed Date</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                    {displayedPendingTasks.map(task => {
                      const completionDate = task.completedAt ? new Date(task.completedAt) : new Date(task.createdAt);
                      const diffHours = (Date.now() - completionDate.getTime()) / (1000 * 60 * 60);
                      const isOverdue = diffHours > 24;

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                                {task.taskNumber}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                task.priority === 'Urgent' ? 'bg-rose-500 text-white' :
                                task.priority === 'High' ? 'bg-orange-500 text-white' :
                                task.priority === 'Medium' ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{task.customerName}</div>
                            {task.companyName && <div className="text-[10px] text-slate-400 truncate max-w-xs">{task.companyName}</div>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-indigo-700 dark:text-indigo-400 truncate max-w-xs">{task.equipment || 'Service'}</div>
                            {task.serialNo && <div className="text-[10px] font-mono text-slate-400">SN: {task.serialNo}</div>}
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                            {task.issue}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-700 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[9px] font-black">
                                {task.assignedTo ? task.assignedTo.charAt(0).toUpperCase() : '?'}
                              </div>
                              <span>{task.assignedTo || 'Unassigned'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                              {completionDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className={`text-[9px] font-bold ${isOverdue ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {isOverdue ? `${Math.floor(diffHours / 24)}d overdue` : `${Math.max(1, Math.floor(diffHours))}h ago`}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openServiceReportModalForTask(task)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider shadow-xs transition-all flex items-center gap-1 active:scale-95"
                              >
                                <Sparkles size={11} className="text-amber-300" />
                                <span>Create Report</span>
                              </button>
                              <button
                                onClick={() => { setSelectedTaskId(task.id); setViewState('registry'); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                title="View Task in Registry"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                    {STATUS_FLOW.filter(s => {
                      if (s === 'Billed' || s === 'Non Billed') {
                        const hasReport = editingTask && (
                          editingTask.serviceReportId ||
                          serviceReports.some(r => r.referenceTaskId === editingTask.id || r.referenceOrderId === editingTask.id)
                        );
                        return Boolean(hasReport);
                      }
                      return true;
                    }).map(s => (
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

      {/* Service Report Creation Modal for Completed Task */}
      {completedTaskForReport && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setCompletedTaskForReport(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-green-900 to-teal-950 p-6 sm:p-7 text-white relative shrink-0">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
              <button
                onClick={() => setCompletedTaskForReport(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all z-10"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-4 relative z-10">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
                  <FileText size={28} className="text-emerald-400" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Sparkles size={11} className="text-emerald-400" /> Task Completed
                    </span>
                    <span className="text-[10px] font-bold text-emerald-200/80">
                      #{completedTaskForReport.taskNumber}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                    Create Service Report
                  </h3>
                  <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-900/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-100">
                    <UserCheck size={16} className="text-emerald-300 shrink-0" />
                    <span>
                      Engineer: <strong className="text-white font-bold">{completedTaskForReport.assignedTo || currentUser?.name || 'Engineer'}</strong> — please complete the service findings & resolution below.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Section 1: Prefilled Ticket Data */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileCheck size={14} className="text-emerald-500" /> Prefilled from Task #{completedTaskForReport.taskNumber}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Customer / Hospital</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{completedTaskForReport.customerName}</p>
                    {completedTaskForReport.companyName && (
                      <p className="text-[10px] text-slate-500 truncate">{completedTaskForReport.companyName}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Contact & Site</span>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{completedTaskForReport.customerPhone}</p>
                    <p className="text-[10px] text-slate-500 truncate">{completedTaskForReport.location || 'Location not specified'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Equipment & Serial</span>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 uppercase truncate">{completedTaskForReport.equipment}</p>
                    <p className="text-[10px] text-slate-500">S/N: {completedTaskForReport.serialNo || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Issue Reported</span>
                    <p className="font-medium text-slate-600 dark:text-slate-300 line-clamp-2">{completedTaskForReport.issue}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Action Taken (Required) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <span>Action Taken / Work Done</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">Click chips to quickly append</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    'Cleaned & Calibrated',
                    'Component Replaced',
                    'Pressure Tested OK',
                    'Circuit Board Repaired',
                    'Power Supply Restored',
                    'Parameter Checks Passed',
                    'Software Updated',
                    'Staff Training Given',
                    'Delivered & Tested OK'
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setReportForm(prev => ({
                          ...prev,
                          actionTaken: prev.actionTaken ? `${prev.actionTaken}. ${chip}` : chip
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 hover:text-emerald-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={reportForm.actionTaken}
                  onChange={(e) => setReportForm(prev => ({ ...prev, actionTaken: e.target.value }))}
                  placeholder="Describe in detail the repairs, calibration, adjustments, or testing performed during the visit..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none"
                />
              </div>

              {/* Section 3: Engineer Observations */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Engineer Observations / Root Cause Analysis
                </label>
                <textarea
                  rows={2}
                  value={reportForm.engineerObservations}
                  onChange={(e) => setReportForm(prev => ({ ...prev, engineerObservations: e.target.value }))}
                  placeholder="Root cause, operating conditions, machine wear, voltage fluctuations, or preventive tips..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none"
                />
              </div>

              {/* Section 4: Classification & Machine Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Machine Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Machine Status</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {(['Warranty', 'Out Of Warranty', 'AMC'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReportForm(prev => ({ ...prev, machineStatus: st }))}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                          reportForm.machineStatus === st
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        {st === 'Out Of Warranty' ? 'Out Warr' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visit Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Visit Type</label>
                  <select
                    value={reportForm.visitType}
                    onChange={(e) => setReportForm(prev => ({ ...prev, visitType: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  >
                    <option value="Breakdown">Breakdown</option>
                    <option value="Routine">Routine</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Installation">Installation</option>
                    <option value="Inspection">Inspection</option>
                  </select>
                </div>

                {/* Service Category */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Service Category</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                    {(['Medical Equipment', 'Pipeline'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setReportForm(prev => ({ ...prev, serviceCategory: cat }))}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all truncate px-1 ${
                          reportForm.serviceCategory === cat
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Department / Ward</label>
                  </div>
                  <input
                    type="text"
                    value={reportForm.department}
                    onChange={(e) => setReportForm(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. ICU, OT, Radiology, Bio-Med"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {['ICU', 'OT', 'Radiology', 'Biomedical', 'OPD', 'Emergency'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setReportForm(prev => ({ ...prev, department: d }))}
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Equipment Model</label>
                  <input
                    type="text"
                    value={reportForm.model}
                    onChange={(e) => setReportForm(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. BPL 9108, Mindray DP-50"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Product Serial Number (S/N)</label>
                    <span className="text-[9px] font-bold text-emerald-600">Serviced Unit</span>
                  </div>
                  <input
                    type="text"
                    value={reportForm.serialNumber}
                    onChange={(e) => setReportForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    placeholder="e.g. SN-948201"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500 font-mono uppercase"
                  />
                </div>

                {/* PO / WO Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">PO / WO Reference</label>
                  <input
                    type="text"
                    value={reportForm.poWoNumber}
                    onChange={(e) => setReportForm(prev => ({ ...prev, poWoNumber: e.target.value }))}
                    placeholder="PO or Work Order No."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section 5: Spares & Parts Replaced */}
              <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Package size={14} className="text-teal-600" />
                    <span>Spares & Parts Replaced (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddReportItem()}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all active:scale-95"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                {reportForm.itemsUsed.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2 text-center">
                    No spare parts recorded. Click "Add Item" if any components or consumables were replaced.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400 px-2">
                      <span className="col-span-6">Description</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-2 text-right">Rate (₹)</span>
                      <span className="col-span-2 text-right">Amount (₹)</span>
                    </div>
                    {reportForm.itemsUsed.map(item => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="col-span-6">
                          <AutoSuggest
                            value={item.description}
                            onChange={(val) => handleUpdateReportItem(item.id, 'description', val)}
                            suggestions={products.map(p => ({ name: p.name, sellingPrice: p.sellingPrice }))}
                            filterKey="name"
                            onSelect={(selected) => {
                              handleUpdateReportItem(item.id, 'description', selected.name);
                              if (selected.sellingPrice) {
                                handleUpdateReportItem(item.id, 'unitPrice', selected.sellingPrice);
                              }
                            }}
                            placeholder="Part / item description..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateReportItem(item.id, 'quantity', Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateReportItem(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-right"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-100 font-inter text-xs">
                            ₹{(item.amount || 0).toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReportItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-1 pr-2">
                      <span className="text-[11px] font-bold text-slate-500">
                        Spares Total: <strong className="text-slate-800 dark:text-slate-100 font-inter">₹{(reportForm.itemsUsed.reduce((sum, it) => sum + (it.amount || 0), 0)).toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 6: Commercials & Payments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Visit Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={reportForm.visitCharges || ''}
                    onChange={(e) => setReportForm(prev => ({ ...prev, visitCharges: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Spares Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={
                      reportForm.itemsUsed.length > 0
                        ? reportForm.itemsUsed.reduce((sum, it) => sum + (it.amount || 0), 0)
                        : (reportForm.sparesCharges || '')
                    }
                    onChange={(e) => setReportForm(prev => ({ ...prev, sparesCharges: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={reportForm.amountReceived || ''}
                    onChange={(e) => setReportForm(prev => ({ ...prev, amountReceived: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Cash Memo / Receipt No.</label>
                  <input
                    type="text"
                    value={reportForm.memoNumber}
                    onChange={(e) => setReportForm(prev => ({ ...prev, memoNumber: e.target.value }))}
                    placeholder="e.g. REC-102"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section 7: Remarks */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Follow-up Notes / Customer Remarks
                </label>
                <textarea
                  rows={2}
                  value={reportForm.queriesRemarks}
                  onChange={(e) => setReportForm(prev => ({ ...prev, queriesRemarks: e.target.value }))}
                  placeholder="Recommendations given to customer, next follow-up date, or customer feedback..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenInFullBuilder(completedTaskForReport)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 hover:brightness-105 active:scale-95 shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Pencil size={14} /> Open in Full Builder
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setCompletedTaskForReport(null)}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center"
                >
                  Fill Later
                </button>
                <button
                  type="button"
                  disabled={isSavingReport}
                  onClick={handleSaveServiceReport}
                  className="flex-1 sm:flex-none px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:via-teal-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  <span>{isSavingReport ? 'Saving Report...' : 'Save & Generate Report'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Report Success Modal */}
      {reportSuccessData && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setReportSuccessData(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full inline-block mb-2">
                Service Report Finalized
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                Report #{reportSuccessData.report.reportNumber}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Linked to Task #{reportSuccessData.task.taskNumber} • Completed by {reportSuccessData.report.engineerName}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-200 dark:border-slate-700/60">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Client:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{reportSuccessData.report.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Machine:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{reportSuccessData.report.equipmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Serial No (S/N):</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{reportSuccessData.report.serialNumber || reportSuccessData.task.serialNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Date:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{reportSuccessData.report.date}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await PDFService.generateServiceReportPDF(reportSuccessData.report);
                    previewPDF(blob, `${reportSuccessData.report.reportNumber}.pdf`);
                  } catch (err) {
                    addNotification('Error', 'Could not open PDF.', 'alert');
                  }
                }}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
              >
                <Printer size={15} /> Print / View PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportSuccessData(null);
                  setActiveTab(TabView.SERVICE_REPORTS);
                }}
                className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-center"
              >
                Open Archive
              </button>
              <button
                type="button"
                onClick={() => setReportSuccessData(null)}
                className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all text-center"
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
