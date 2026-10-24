import React, { useState, useMemo, useRef } from 'react';
import {
  InwardOutwardEntry,
  InwardOutwardItem,
  InwardOutwardAttachment,
  InwardOutwardType,
  InwardOutwardPurpose,
  InwardOutwardStatus,
  InwardOutwardPartyType,
  InwardOutwardTransportMode,
  TabView
} from '../types';
import {
  ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Search, Plus, Filter,
  Download, Printer, Eye, Edit3, Trash2, X, Check, AlertTriangle,
  Calendar, Clock, Truck, Package, User, Building2, Phone, MapPin,
  FileText, Paperclip, ExternalLink, ShieldCheck, ChevronDown, Copy,
  Info, Sparkles, RefreshCw, Layers, CheckCircle2, AlertCircle, Upload
} from 'lucide-react';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';

const PURPOSE_OPTIONS: InwardOutwardPurpose[] = [
  'Purchase', 'Sales', 'Service', 'Repair', 'Demo',
  'Return', 'Replacement', 'Loan', 'Transfer', 'Other'
];

const STATUS_OPTIONS: InwardOutwardStatus[] = [
  'Received', 'Dispatched', 'In Transit', 'Delivered', 'Returned', 'Cancelled'
];

const INWARD_PARTY_TYPES: InwardOutwardPartyType[] = [
  'Vendor', 'Hospital', 'Customer', 'Courier', 'Other'
];

const OUTWARD_PARTY_TYPES: InwardOutwardPartyType[] = [
  'Hospital', 'Customer', 'Vendor', 'Service Engineer', 'Courier', 'Other'
];

const TRANSPORT_MODES: InwardOutwardTransportMode[] = [
  'Courier', 'Road Transport', 'Hand Delivery', 'Company Vehicle', 'Other'
];

const COMMON_COURIERS = [
  'DTDC', 'Blue Dart', 'The Professional Couriers', 'Delhivery',
  'ST Couriers', 'TCI Express', 'VRL Logistics', 'Trackon', 'India Post (Speed Post)', 'Other'
];

const ITEM_CONDITIONS = ['New', 'Good', 'Damaged', 'Under Repair', 'Other'] as const;
const ITEM_UNITS = ['Nos', 'Sets', 'Pcs', 'Boxes', 'Units', 'Meters', 'Kg', 'Packets'];

const STATUS_CONFIG: Record<InwardOutwardStatus, { label: string; bg: string; text: string; dot: string }> = {
  'Received': { label: 'Received', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Dispatched': { label: 'Dispatched', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'In Transit': { label: 'In Transit', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  'Delivered': { label: 'Delivered', bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
  'Returned': { label: 'Returned', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  'Cancelled': { label: 'Cancelled', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface InwardOutwardRegisterModuleProps {
  userRole?: 'Admin' | 'Employee';
}

export const InwardOutwardRegisterModule: React.FC<InwardOutwardRegisterModuleProps> = ({ userRole }) => {
  const {
    inwardOutwardEntries,
    addInwardOutwardEntry,
    updateInwardOutwardEntry,
    removeInwardOutwardEntry,
    currentUser,
    isSystemAdmin,
    clients,
    vendors,
    employees,
    products,
    companyProfiles,
    showConfirm,
    addNotification
  } = useData();

  const canAccess = isSystemAdmin ||
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.email === 'sreekumar.career@gmail.com' ||
    userRole === 'Admin' ||
    userRole === 'Employee' ||
    !!(currentUser?.permissions?.[TabView.INWARD_OUTWARD_REGISTER]);

  const isAdmin = isSystemAdmin ||
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.email === 'sreekumar.career@gmail.com' ||
    userRole === 'Admin' ||
    currentUser?.permissions?.[TabView.INWARD_OUTWARD_REGISTER] === 'Admin';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Inward' | 'Outward'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | InwardOutwardStatus>('All');
  const [purposeFilter, setPurposeFilter] = useState<'All' | InwardOutwardPurpose>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<'All' | 'Today' | 'ThisWeek' | 'ThisMonth' | 'Custom'>('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals & Drawers
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEntry, setSelectedEntry] = useState<InwardOutwardEntry | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [entryToPrint, setEntryToPrint] = useState<InwardOutwardEntry | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [pendingSaveWithDuplicate, setPendingSaveWithDuplicate] = useState(false);

  // Form State
  const initialFormState: Omit<InwardOutwardEntry, 'id' | 'createdAt' | 'createdBy'> = {
    entryNumber: '',
    type: 'Inward',
    entryDate: new Date().toISOString().split('T')[0],
    entryTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    referenceNo: '',
    purpose: 'Service',
    status: 'Received',
    partyType: 'Vendor',
    partyName: '',
    partyAddress: '',
    contactPerson: '',
    contactPhone: '',
    locationAt: 'Sreemeditec Head Office',
    handledBy: currentUser?.name || 'Admin',
    handledById: currentUser?.id,
    courierCompany: '',
    docketNo: '',
    lrNo: '',
    transportMode: 'Courier',
    dispatchDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    actualDeliveryDate: '',
    trackingUrl: '',
    freightCharges: undefined,
    items: [
      {
        id: `ITM-${Date.now()}-1`,
        name: '',
        brand: '',
        model: '',
        serialNumbers: [],
        barcode: '',
        quantity: 1,
        unit: 'Nos',
        condition: 'Good',
        accessories: '',
        reason: '',
        remarks: ''
      }
    ],
    attachments: [],
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [serialInputText, setSerialInputText] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentCategory, setAttachmentCategory] = useState<InwardOutwardAttachment['category']>('courier_receipt');

  // KPI Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const total = inwardOutwardEntries.length;
    const inward = inwardOutwardEntries.filter(e => e.type === 'Inward');
    const outward = inwardOutwardEntries.filter(e => e.type === 'Outward');

    const inwardToday = inward.filter(e => e.entryDate === todayStr).length;
    const inwardMonth = inward.filter(e => e.entryDate >= firstDayOfMonth).length;

    const outwardToday = outward.filter(e => e.entryDate === todayStr).length;
    const outwardMonth = outward.filter(e => e.entryDate >= firstDayOfMonth).length;

    const inTransit = inwardOutwardEntries.filter(e => e.status === 'In Transit' || e.status === 'Dispatched').length;
    const deliveredOrReceived = inwardOutwardEntries.filter(e => e.status === 'Delivered' || e.status === 'Received').length;

    return {
      total,
      inwardTotal: inward.length,
      inwardToday,
      inwardMonth,
      outwardTotal: outward.length,
      outwardToday,
      outwardMonth,
      inTransit,
      deliveredOrReceived
    };
  }, [inwardOutwardEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Calculate start of week (Monday)
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const startOfWeekStr = monday.toISOString().split('T')[0];

    // Calculate start of month
    const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    return inwardOutwardEntries.filter(e => {
      // Type Filter
      if (typeFilter !== 'All' && e.type !== typeFilter) return false;

      // Status Filter
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;

      // Purpose Filter
      if (purposeFilter !== 'All' && e.purpose !== purposeFilter) return false;

      // Date Range Filter
      if (dateRangeFilter === 'Today' && e.entryDate !== todayStr) return false;
      if (dateRangeFilter === 'ThisWeek' && (e.entryDate < startOfWeekStr || e.entryDate > todayStr)) return false;
      if (dateRangeFilter === 'ThisMonth' && (e.entryDate < startOfMonthStr || e.entryDate > todayStr)) return false;
      if (dateRangeFilter === 'Custom') {
        if (customStartDate && e.entryDate < customStartDate) return false;
        if (customEndDate && e.entryDate > customEndDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = e.entryNumber.toLowerCase().includes(q);
        const matchesParty = (e.partyName || '').toLowerCase().includes(q) || (e.contactPerson || '').toLowerCase().includes(q);
        const matchesRef = (e.referenceNo || '').toLowerCase().includes(q);
        const matchesDocket = (e.docketNo || '').toLowerCase().includes(q) || (e.lrNo || '').toLowerCase().includes(q);
        const matchesCourier = (e.courierCompany || '').toLowerCase().includes(q);
        const matchesItems = (e.items || []).some(item =>
          item.name.toLowerCase().includes(q) ||
          (item.brand || '').toLowerCase().includes(q) ||
          (item.model || '').toLowerCase().includes(q) ||
          (item.serialNumbers || []).some(s => s.toLowerCase().includes(q))
        );

        if (!matchesId && !matchesParty && !matchesRef && !matchesDocket && !matchesCourier && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [inwardOutwardEntries, typeFilter, statusFilter, purposeFilter, dateRangeFilter, customStartDate, customEndDate, searchQuery]);

  // Generate next entry number
  const generateEntryNumber = (type: InwardOutwardType) => {
    const prefix = type === 'Inward' ? 'INW' : 'OUT';
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${yy}${mm}-${random}`;
  };

  // Open Create Form
  const handleOpenCreate = (type: InwardOutwardType) => {
    const entryNumber = generateEntryNumber(type);
    const now = new Date();
    setFormData({
      ...initialFormState,
      entryNumber,
      type,
      status: type === 'Inward' ? 'Received' : 'Dispatched',
      partyType: type === 'Inward' ? 'Vendor' : 'Hospital',
      locationAt: type === 'Inward' ? 'Sreemeditec Head Office' : 'Sreemeditec Warehouse',
      handledBy: currentUser?.name || 'Admin',
      handledById: currentUser?.id,
      entryDate: now.toISOString().split('T')[0],
      entryTime: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      dispatchDate: now.toISOString().split('T')[0]
    });
    setFormMode('create');
    setSelectedEntry(null);
    setDuplicateWarning(null);
    setShowFormModal(true);
  };

  // Open Edit Form
  const handleOpenEdit = (entry: InwardOutwardEntry) => {
    setSelectedEntry(entry);
    setFormData({
      entryNumber: entry.entryNumber,
      type: entry.type,
      entryDate: entry.entryDate,
      entryTime: entry.entryTime,
      referenceNo: entry.referenceNo || '',
      purpose: entry.purpose,
      status: entry.status,
      partyType: entry.partyType,
      partyName: entry.partyName,
      partyAddress: entry.partyAddress || '',
      contactPerson: entry.contactPerson || '',
      contactPhone: entry.contactPhone || '',
      locationAt: entry.locationAt,
      handledBy: entry.handledBy,
      handledById: entry.handledById,
      courierCompany: entry.courierCompany || '',
      docketNo: entry.docketNo || '',
      lrNo: entry.lrNo || '',
      transportMode: entry.transportMode || 'Courier',
      dispatchDate: entry.dispatchDate || '',
      expectedDeliveryDate: entry.expectedDeliveryDate || '',
      actualDeliveryDate: entry.actualDeliveryDate || '',
      trackingUrl: entry.trackingUrl || '',
      freightCharges: entry.freightCharges,
      items: (entry.items && entry.items.length > 0) ? entry.items : [
        {
          id: `ITM-${Date.now()}-1`,
          name: '',
          quantity: 1,
          unit: 'Nos',
          condition: 'Good'
        }
      ],
      attachments: entry.attachments || [],
      remarks: entry.remarks || ''
    });
    setFormMode('edit');
    setDuplicateWarning(null);
    setShowFormModal(true);
  };

  // Item Management inside Form
  const handleAddItem = () => {
    const newItem: InwardOutwardItem = {
      id: `ITM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      brand: '',
      model: '',
      serialNumbers: [],
      barcode: '',
      quantity: 1,
      unit: 'Nos',
      condition: 'Good',
      accessories: '',
      reason: '',
      remarks: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleUpdateItem = (index: number, updates: Partial<InwardOutwardItem>) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...updates };
      return { ...prev, items };
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) {
      addNotification('Item Required', 'At least one item is required in the register entry.', 'warning');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Serial tag handling
  const handleAddSerialTag = (itemIndex: number, serial: string) => {
    const trimmed = serial.trim();
    if (!trimmed) return;
    const currentSerials = formData.items[itemIndex].serialNumbers || [];
    if (currentSerials.includes(trimmed)) return;
    handleUpdateItem(itemIndex, { serialNumbers: [...currentSerials, trimmed] });
    setSerialInputText(prev => ({ ...prev, [itemIndex]: '' }));
  };

  const handleRemoveSerialTag = (itemIndex: number, serialToRemove: string) => {
    const currentSerials = formData.items[itemIndex].serialNumbers || [];
    handleUpdateItem(itemIndex, {
      serialNumbers: currentSerials.filter(s => s !== serialToRemove)
    });
  };

  // Attachment upload
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    try {
      const newAttachments: InwardOutwardAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 8 * 1024 * 1024) {
          addNotification('File Limit', `${file.name} exceeds 8MB size limit.`, 'warning');
          continue;
        }
        const base64 = await fileToBase64(file);
        newAttachments.push({
          id: `ATT-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          name: file.name,
          data: base64,
          type: file.type || 'application/octet-stream',
          size: file.size,
          category: attachmentCategory,
          uploadedAt: new Date().toISOString()
        });
      }
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newAttachments]
      }));
      addNotification('Uploaded', `${newAttachments.length} document(s) attached.`, 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      addNotification('Upload Failed', 'Error reading uploaded files.', 'alert');
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== attId)
    }));
  };

  // Duplicate Check
  const checkDuplicates = (): string | null => {
    const trimmedDocket = (formData.docketNo || '').trim().toLowerCase();
    const currentId = selectedEntry?.id;

    // Check Docket duplicate
    if (trimmedDocket) {
      const existingDocket = inwardOutwardEntries.find(e =>
        e.id !== currentId &&
        e.type === formData.type &&
        (e.docketNo || '').trim().toLowerCase() === trimmedDocket &&
        !e.isCancelled
      );
      if (existingDocket) {
        return `Docket/AWB #${formData.docketNo} is already registered under ${existingDocket.type} Entry (${existingDocket.entryNumber} - ${existingDocket.partyName}).`;
      }
    }

    // Check Serial duplicate
    const allInputSerials = formData.items.flatMap(i => (i.serialNumbers || []).map(s => s.trim().toLowerCase())).filter(Boolean);
    if (allInputSerials.length > 0) {
      for (const entry of inwardOutwardEntries) {
        if (entry.id === currentId || entry.type !== formData.type || entry.isCancelled) continue;
        const entrySerials = entry.items.flatMap(i => (i.serialNumbers || []).map(s => s.trim().toLowerCase())).filter(Boolean);
        const duplicateSerial = allInputSerials.find(s => entrySerials.includes(s));
        if (duplicateSerial) {
          return `Serial Number "${duplicateSerial.toUpperCase()}" already exists in ${entry.type} Entry (${entry.entryNumber} - ${entry.partyName}).`;
        }
      }
    }

    return null;
  };

  // Save Form
  const handleSaveEntry = async (bypassDuplicate = false) => {
    // Validation
    if (!formData.partyName.trim()) {
      addNotification('Validation Error', 'Please specify the Sender / Recipient name.', 'error');
      return;
    }

    const invalidItem = formData.items.find(i => !i.name.trim() || i.quantity <= 0);
    if (invalidItem) {
      addNotification('Validation Error', 'All items must have a valid name and quantity greater than 0.', 'error');
      return;
    }

    // Duplicate check
    if (!bypassDuplicate) {
      const dup = checkDuplicates();
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }

    const nowIso = new Date().toISOString();

    if (formMode === 'create') {
      const newEntryId = `IOR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const newEntry: InwardOutwardEntry = {
        id: newEntryId,
        entryNumber: formData.entryNumber || generateEntryNumber(formData.type),
        type: formData.type,
        entryDate: formData.entryDate,
        entryTime: formData.entryTime,
        referenceNo: formData.referenceNo?.trim() || undefined,
        purpose: formData.purpose,
        status: formData.status,
        partyType: formData.partyType,
        partyName: formData.partyName.trim(),
        partyAddress: formData.partyAddress?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        contactPhone: formData.contactPhone?.trim() || undefined,
        locationAt: formData.locationAt.trim(),
        handledBy: formData.handledBy.trim(),
        handledById: formData.handledById,
        courierCompany: formData.courierCompany?.trim() || undefined,
        docketNo: formData.docketNo?.trim() || undefined,
        lrNo: formData.lrNo?.trim() || undefined,
        transportMode: formData.transportMode,
        dispatchDate: formData.dispatchDate || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        actualDeliveryDate: formData.actualDeliveryDate || undefined,
        trackingUrl: formData.trackingUrl?.trim() || undefined,
        freightCharges: formData.freightCharges ? Number(formData.freightCharges) : undefined,
        items: formData.items.map(item => ({
          ...item,
          name: item.name.trim(),
          brand: item.brand?.trim() || undefined,
          model: item.model?.trim() || undefined,
          barcode: item.barcode?.trim() || undefined,
          accessories: item.accessories?.trim() || undefined,
          reason: item.reason?.trim() || undefined,
          remarks: item.remarks?.trim() || undefined
        })),
        attachments: formData.attachments || [],
        remarks: formData.remarks?.trim() || undefined,
        createdAt: nowIso,
        createdBy: currentUser?.name || 'Admin',
        createdById: currentUser?.id,
        activityLog: [
          {
            id: `ACT-${Date.now()}-1`,
            action: 'Entry Created',
            user: currentUser?.name || 'Admin',
            timestamp: nowIso,
            details: `Created as ${formData.type} entry with ${formData.items.length} item(s)`
          }
        ]
      };

      await addInwardOutwardEntry(newEntry);
      addNotification('Success', `${newEntry.type} entry ${newEntry.entryNumber} recorded successfully.`, 'success');
    } else if (selectedEntry) {
      const updates: Partial<InwardOutwardEntry> = {
        type: formData.type,
        entryDate: formData.entryDate,
        entryTime: formData.entryTime,
        referenceNo: formData.referenceNo?.trim() || undefined,
        purpose: formData.purpose,
        status: formData.status,
        partyType: formData.partyType,
        partyName: formData.partyName.trim(),
        partyAddress: formData.partyAddress?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        contactPhone: formData.contactPhone?.trim() || undefined,
        locationAt: formData.locationAt.trim(),
        handledBy: formData.handledBy.trim(),
        handledById: formData.handledById,
        courierCompany: formData.courierCompany?.trim() || undefined,
        docketNo: formData.docketNo?.trim() || undefined,
        lrNo: formData.lrNo?.trim() || undefined,
        transportMode: formData.transportMode,
        dispatchDate: formData.dispatchDate || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        actualDeliveryDate: formData.actualDeliveryDate || undefined,
        trackingUrl: formData.trackingUrl?.trim() || undefined,
        freightCharges: formData.freightCharges ? Number(formData.freightCharges) : undefined,
        items: formData.items.map(item => ({
          ...item,
          name: item.name.trim(),
          brand: item.brand?.trim() || undefined,
          model: item.model?.trim() || undefined,
          barcode: item.barcode?.trim() || undefined,
          accessories: item.accessories?.trim() || undefined,
          reason: item.reason?.trim() || undefined,
          remarks: item.remarks?.trim() || undefined
        })),
        attachments: formData.attachments || [],
        remarks: formData.remarks?.trim() || undefined,
        lastModifiedAt: nowIso,
        lastModifiedBy: currentUser?.name || 'Admin',
        activityLog: [
          ...(selectedEntry.activityLog || []),
          {
            id: `ACT-${Date.now()}`,
            action: 'Entry Modified',
            user: currentUser?.name || 'Admin',
            timestamp: nowIso,
            details: 'Updated entry details & items'
          }
        ]
      };

      await updateInwardOutwardEntry(selectedEntry.id, updates);
      addNotification('Updated', `${selectedEntry.entryNumber} updated successfully.`, 'success');
      setSelectedEntry(prev => prev ? ({ ...prev, ...updates } as InwardOutwardEntry) : null);
    }

    setShowFormModal(false);
    setDuplicateWarning(null);
  };

  // Delete / Soft Cancel
  const handleDeleteEntry = async (entry: InwardOutwardEntry) => {
    if (!isAdmin) {
      addNotification('Action Denied', 'Only administrators can delete register entries.', 'alert');
      return;
    }
    const confirmed = await showConfirm(`Are you sure you want to PERMANENTLY delete register entry ${entry.entryNumber}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await removeInwardOutwardEntry(entry.id);
      addNotification('Deleted', `${entry.entryNumber} has been removed.`, 'success');
      if (selectedEntry?.id === entry.id) {
        setShowDetailDrawer(false);
        setSelectedEntry(null);
      }
    } catch {
      addNotification('Error', 'Failed to delete register entry.', 'alert');
    }
  };

  // Cancel Status
  const handleCancelEntry = async (entry: InwardOutwardEntry) => {
    const confirmed = await showConfirm(`Cancel register entry ${entry.entryNumber}? This marks the shipment as cancelled while preserving the audit record.`);
    if (!confirmed) return;

    const nowIso = new Date().toISOString();
    await updateInwardOutwardEntry(entry.id, {
      status: 'Cancelled',
      isCancelled: true,
      cancelledAt: nowIso,
      cancelledBy: currentUser?.name || 'Admin',
      activityLog: [
        ...(entry.activityLog || []),
        {
          id: `ACT-${Date.now()}`,
          action: 'Entry Cancelled',
          user: currentUser?.name || 'Admin',
          timestamp: nowIso,
          details: 'Marked as Cancelled'
        }
      ]
    });
    addNotification('Entry Cancelled', `${entry.entryNumber} status changed to Cancelled.`, 'info');
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry(prev => prev ? ({ ...prev, status: 'Cancelled', isCancelled: true } as InwardOutwardEntry) : null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      addNotification('No Data', 'No entries to export for current filters.', 'warning');
      return;
    }

    const headers = [
      'Entry ID', 'Type', 'Date', 'Time', 'Reference No', 'Purpose', 'Status',
      'Party Type', 'Party Name', 'Contact Person', 'Phone', 'Address', 'Location',
      'Handled By', 'Courier Company', 'Docket No', 'LR No', 'Transport Mode',
      'Total Items', 'Total Quantity', 'Item Summary', 'Serial Numbers', 'Freight Charges',
      'Remarks', 'Created By', 'Created At'
    ];

    const rows = filteredEntries.map(e => {
      const totalQty = (e.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
      const itemNames = (e.items || []).map(i => `${i.name} (x${i.quantity})`).join('; ');
      const allSerials = (e.items || []).flatMap(i => i.serialNumbers || []).join('; ');

      return [
        `"${e.entryNumber}"`,
        `"${e.type}"`,
        `"${e.entryDate}"`,
        `"${e.entryTime}"`,
        `"${e.referenceNo || ''}"`,
        `"${e.purpose}"`,
        `"${e.status}"`,
        `"${e.partyType}"`,
        `"${(e.partyName || '').replace(/"/g, '""')}"`,
        `"${(e.contactPerson || '').replace(/"/g, '""')}"`,
        `"${e.contactPhone || ''}"`,
        `"${(e.partyAddress || '').replace(/"/g, '""')}"`,
        `"${(e.locationAt || '').replace(/"/g, '""')}"`,
        `"${e.handledBy || ''}"`,
        `"${e.courierCompany || ''}"`,
        `"${e.docketNo || ''}"`,
        `"${e.lrNo || ''}"`,
        `"${e.transportMode || ''}"`,
        e.items?.length || 0,
        totalQty,
        `"${itemNames.replace(/"/g, '""')}"`,
        `"${allSerials.replace(/"/g, '""')}"`,
        e.freightCharges || 0,
        `"${(e.remarks || '').replace(/"/g, '""')}"`,
        `"${e.createdBy || ''}"`,
        `"${e.createdAt || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sreemeditec_Inward_Outward_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('Export Complete', 'Register downloaded as CSV file.', 'success');
  };

  // Trigger Print Slip
  const handleTriggerPrint = (entry: InwardOutwardEntry) => {
    setEntryToPrint(entry);
    setShowPrintModal(true);
  };

  const executePrint = () => {
    window.print();
  };

  // Company Profile helper
  const primaryCompany = companyProfiles[0] || {
    companyName: 'SREEMEDITEC ENTERPRISES PRIVATE LIMITED',
    address: 'Plot No. 12, Ground Floor, Anna Nagar East, Chennai - 600102, Tamil Nadu, India',
    gstin: '33AAGCS9481M1Z5',
    phone: '+91 99408 81234 / 044 2626 5555',
    email: 'support@sreemeditec.com'
  };

  // Non-authorized block
  if (!canAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
          The Inward / Outward Register is strictly restricted to authorized users. Please contact system management for access privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative p-0 md:p-1 gap-4 overflow-hidden">
      
      {/* Module Header Banner (ERP Emerald & Gold Theme) */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 md:p-5 pt-6 rounded-none rounded-b-[1.5rem] md:rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative overflow-hidden group m-0 md:m-3 lg:m-4">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>

        <div className="flex items-center gap-5 relative z-10 w-full lg:w-auto">
          <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
            <ArrowLeftRight size={22} className="hidden xl:block" />
            <ArrowLeftRight size={18} className="xl:hidden" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">
                Inward / Outward Register
              </h2>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-emerald-400/20 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                <span className="text-[7.5px] font-black text-emerald-300 uppercase tracking-widest">{isAdmin ? 'Admin Live' : 'Staff Access'}</span>
              </div>
            </div>

            {/* Quick Type Pill Filter Switcher */}
            <div className="flex bg-emerald-900/40 border border-emerald-700/50 p-1 rounded-full w-fit">
              {(['All', 'Inward', 'Outward'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    typeFilter === type
                      ? 'bg-white text-emerald-900 shadow-md'
                      : 'text-emerald-100/70 hover:text-white'
                  }`}
                >
                  {type === 'All' ? 'All Movements' : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full lg:w-auto">
          <button
            onClick={() => handleOpenCreate('Inward')}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-950/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ArrowDownLeft size={14} />
            <span>New Inward Entry</span>
          </button>

          <button
            onClick={() => handleOpenCreate('Outward')}
            className="flex-1 sm:flex-none bg-[#c5a059] hover:bg-[#b38f48] text-white py-3 px-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-950/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpRight size={14} />
            <span>New Outward Entry</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-100 border border-emerald-700/50 py-3 px-4 rounded-[2rem] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
            title="Export to CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards (Signature ERP Theme Colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mx-0 md:mx-3 lg:mx-4 shrink-0">
        {/* Total Records - Deep Forest Emerald */}
        <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300 text-white relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-100/80">
            <span className="text-[9px] font-black uppercase tracking-wider">Total Movements</span>
            <div className="p-2 rounded-xl bg-emerald-900/50 text-emerald-100">
              <Layers size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-playfair font-bold tracking-tight text-white">{metrics.total}</div>
            <p className="text-[10px] font-semibold text-emerald-200/70 uppercase tracking-tighter mt-0.5">All-time register logs</p>
          </div>
          <div className="text-[8px] font-black uppercase tracking-widest text-emerald-300/80">Active Ledger</div>
        </div>

        {/* Inward Received - Bright Emerald */}
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300 text-white relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-100/90">
            <span className="text-[9px] font-black uppercase tracking-wider">Inward Received</span>
            <div className="p-2 rounded-xl bg-emerald-900/40 text-emerald-100">
              <ArrowDownLeft size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-playfair font-bold tracking-tight text-white">{metrics.inwardTotal}</div>
            <p className="text-[10px] font-bold text-emerald-100/90 uppercase tracking-tight mt-0.5">
              Today: +{metrics.inwardToday} • Month: {metrics.inwardMonth}
            </p>
          </div>
          <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/80">Received Items</div>
        </div>

        {/* Outward Dispatched - Deep Slate */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(15,23,42,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(15,23,42,0.6)] transition-all duration-300 text-white relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[9px] font-black uppercase tracking-wider">Outward Dispatched</span>
            <div className="p-2 rounded-xl bg-slate-800/60 text-slate-200">
              <ArrowUpRight size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-playfair font-bold tracking-tight text-white">{metrics.outwardTotal}</div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">
              Today: +{metrics.outwardToday} • Month: {metrics.outwardMonth}
            </p>
          </div>
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Dispatched Goods</div>
        </div>

        {/* In Transit / Active - Gold Amber */}
        <div className="bg-gradient-to-br from-[#c5a059] to-[#e5c185] p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300 text-amber-950 relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-950/80">
            <span className="text-[9px] font-black uppercase tracking-wider">In Transit / Active</span>
            <div className="p-2 rounded-xl bg-amber-900/15 text-amber-950">
              <Truck size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-playfair font-bold tracking-tight text-amber-950">{metrics.inTransit}</div>
            <p className="text-[10px] font-black text-amber-950/70 uppercase tracking-tight mt-0.5">Pending Arrival / Delivery</p>
          </div>
          <div className="text-[8px] font-black uppercase tracking-widest text-amber-950/70">Live Logistics</div>
        </div>

        {/* Concluded / Delivered - Medical Teal */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-teal-900 to-emerald-950 p-5 rounded-[28px] shadow-[0_20px_40px_-10px_rgba(13,148,136,0.5)] flex flex-col justify-between group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(13,148,136,0.6)] transition-all duration-300 text-white relative overflow-hidden">
          <div className="flex items-center justify-between text-teal-200/80">
            <span className="text-[9px] font-black uppercase tracking-wider">Concluded / Done</span>
            <div className="p-2 rounded-xl bg-teal-800/40 text-teal-200">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-playfair font-bold tracking-tight text-white">{metrics.deliveredOrReceived}</div>
            <p className="text-[10px] font-semibold text-teal-200/70 uppercase tracking-tight mt-0.5">Received or Delivered</p>
          </div>
          <div className="text-[8px] font-black uppercase tracking-widest text-teal-300/80">Completed Movements</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3 shrink-0 mx-0 md:mx-3 lg:mx-4">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Entry ID, Hospital/Party, Item, Serial No, Docket, Ref #..."
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-[2rem] pl-10 pr-8 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-[2rem] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all"
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Purpose Dropdown */}
          <select
            value={purposeFilter}
            onChange={e => setPurposeFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-[2rem] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all"
          >
            <option value="All">All Purposes</option>
            {PURPOSE_OPTIONS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Date Range Dropdown */}
          <select
            value={dateRangeFilter}
            onChange={e => setDateRangeFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-[2rem] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all"
          >
            <option value="All">All Dates</option>
            <option value="Today">Today</option>
            <option value="ThisWeek">This Week</option>
            <option value="ThisMonth">This Month</option>
            <option value="Custom">Custom Date Range</option>
          </select>
        </div>

        {/* Custom Date Range Picker */}
        {dateRangeFilter === 'Custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-400"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full text-xs border border-slate-200 dark:border-slate-700 outline-none focus:border-teal-400"
            />
            <button
              onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setDateRangeFilter('All'); }}
              className="text-[10px] font-bold text-rose-500 hover:underline ml-2"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0 mx-0 md:mx-3 lg:mx-4 mb-3">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-3 px-4">Entry ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Sender / Receiver</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-3">Courier / Docket</th>
                <th className="py-3 px-3">Purpose</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Handled By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEntries.map(entry => {
                const totalQty = (entry.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
                const firstItem = entry.items?.[0];
                const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG['Received'];

                return (
                  <tr
                    key={entry.id}
                    onClick={() => { setSelectedEntry(entry); setShowDetailDrawer(true); }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Entry ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${entry.type === 'Inward' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                        {entry.entryNumber}
                      </div>
                      {entry.referenceNo && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[120px]">
                          Ref: {entry.referenceNo}
                        </p>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="font-semibold flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {entry.entryDate}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />
                        {entry.entryTime}
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        entry.type === 'Inward'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-[#c5a059]/15 text-[#9a7833] dark:text-[#c5a059] border border-[#c5a059]/30'
                      }`}>
                        {entry.type === 'Inward' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {entry.type}
                      </span>
                    </td>

                    {/* Sender / Receiver */}
                    <td className="py-3 px-4 min-w-[180px]">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">
                        {entry.partyName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                          {entry.partyType}
                        </span>
                        {entry.contactPhone && (
                          <span className="truncate">{entry.contactPhone}</span>
                        )}
                      </div>
                    </td>

                    {/* Items Summary */}
                    <td className="py-3 px-4 min-w-[200px]">
                      {firstItem ? (
                        <div>
                          <div className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[220px]">
                            {firstItem.name}
                            {entry.items.length > 1 && (
                              <span className="ml-1 text-[10px] text-teal-600 font-bold bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
                                +{entry.items.length - 1} more
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>Qty: <strong className="text-slate-600 dark:text-slate-300">{totalQty} {firstItem.unit}</strong></span>
                            {firstItem.condition && (
                              <span className="italic">({firstItem.condition})</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No items</span>
                      )}
                    </td>

                    {/* Courier / Docket */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {entry.courierCompany || entry.docketNo ? (
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">
                            {entry.courierCompany || entry.transportMode || 'Courier'}
                          </p>
                          {entry.docketNo && (
                            <p className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-semibold truncate max-w-[130px]">
                              #{entry.docketNo}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Hand Delivery</span>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                        {entry.purpose}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                        {cfg.label}
                      </span>
                    </td>

                    {/* Handled By */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-semibold text-[11px]">
                      {entry.handledBy?.split(' ')[0] || 'Admin'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTriggerPrint(entry)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all"
                          title="Print Material Slip"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-all"
                          title="Edit Entry"
                        >
                          <Edit3 size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Delete Entry"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Package size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-sm">No Register Entries Found</p>
                    <p className="text-xs opacity-70 mt-1">Try adjusting your search criteria or create a new entry.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Form Modal (Create / Edit) */}
      {showFormModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-6 md:p-8 text-white relative overflow-hidden flex items-center justify-between shrink-0 border-b border-emerald-800/40">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-[1.5rem] flex items-center justify-center text-[#c5a059] bg-white/10 border border-white/10 shadow-inner shrink-0">
                  {formData.type === 'Inward' ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-emerald-400/20 text-emerald-300 border border-emerald-500/20 rounded-full">
                      {formMode === 'create' ? 'New Transaction' : 'Edit Transaction'}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-100/90">{formData.entryNumber}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-playfair font-bold uppercase tracking-tight text-white">
                    {formData.type === 'Inward' ? 'Material Inward Register' : 'Material Outward Register'}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowFormModal(false)}
                className="p-2 text-white/70 hover:text-white transition-all z-10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              
              {/* Duplicate Warning Alert if triggered */}
              {duplicateWarning && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/40 rounded-2xl p-4 flex items-start gap-3 text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <h4 className="font-black uppercase tracking-wider">Potential Duplicate Entry Detected</h4>
                    <p className="mt-1 leading-relaxed">{duplicateWarning}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleSaveEntry(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3.5 py-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-all"
                      >
                        Proceed Anyway (Ignore Warning)
                      </button>
                      <button
                        onClick={() => setDuplicateWarning(null)}
                        className="border border-amber-400 dark:border-amber-700 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider"
                      >
                        Modify Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION A: Transaction Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-[10px]">A</span>
                  Transaction Basics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Transaction Type</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, type: 'Inward', status: 'Received', partyType: 'Vendor' }))}
                        className={`py-1.5 rounded-lg text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                          formData.type === 'Inward' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        <ArrowDownLeft size={13} /> Inward
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, type: 'Outward', status: 'Dispatched', partyType: 'Hospital' }))}
                        className={`py-1.5 rounded-lg text-[11px] font-black uppercase transition-all flex items-center justify-center gap-1 ${
                          formData.type === 'Outward' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        <ArrowUpRight size={13} /> Outward
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Entry Date & Time</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        value={formData.entryDate}
                        onChange={e => setFormData(p => ({ ...p, entryDate: e.target.value }))}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none"
                      />
                      <input
                        type="text"
                        value={formData.entryTime}
                        onChange={e => setFormData(p => ({ ...p, entryTime: e.target.value }))}
                        placeholder="HH:MM"
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Movement Purpose</label>
                    <select
                      value={formData.purpose}
                      onChange={e => setFormData(p => ({ ...p, purpose: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    >
                      {PURPOSE_OPTIONS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Movement Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reference Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.referenceNo || ''}
                    onChange={e => setFormData(p => ({ ...p, referenceNo: e.target.value }))}
                    placeholder="E.g., PO-2026-0042 / INV-9941 / DC-0812 / Service Ticket #"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* SECTION B: Sender and Receiver Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="w-5 h-5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center text-[10px]">B</span>
                  {formData.type === 'Inward' ? 'Sender & Receiving Facility' : 'Recipient & Dispatch Origin'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {formData.type === 'Inward' ? 'Received From (Type)' : 'Sent To (Type)'}
                    </label>
                    <select
                      value={formData.partyType}
                      onChange={e => setFormData(p => ({ ...p, partyType: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    >
                      {(formData.type === 'Inward' ? INWARD_PARTY_TYPES : OUTWARD_PARTY_TYPES).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {formData.type === 'Inward' ? 'Sender / Entity Name *' : 'Recipient / Hospital Name *'}
                    </label>
                    <AutoSuggest
                      value={formData.partyName}
                      onChange={val => setFormData(p => ({ ...p, partyName: val }))}
                      onSelect={party => setFormData(p => ({
                        ...p,
                        partyName: party.hospital || party.name || '',
                        contactPerson: party.contactPerson || (party.name !== party.hospital ? party.name : '') || p.contactPerson,
                        contactPhone: party.phone || party.mobile || p.contactPhone,
                        partyAddress: party.address || p.partyAddress
                      }))}
                      suggestions={
                        formData.partyType === 'Vendor' ? vendors :
                        (formData.partyType === 'Hospital' || formData.partyType === 'Customer') ? clients :
                        formData.partyType === 'Service Engineer' ? employees.map(e => ({ name: e.name, hospital: e.name, phone: e.phone, address: e.location })) :
                        [...clients, ...vendors]
                      }
                      filterKey={formData.partyType === 'Hospital' ? 'hospital' : 'name'}
                      placeholder={formData.type === 'Inward' ? 'Vendor / Sender Name (auto-suggest on type)' : 'Client / Hospital Name (auto-suggest on type)'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contactPerson || ''}
                      onChange={e => setFormData(p => ({ ...p, contactPerson: e.target.value }))}
                      placeholder="Person In-charge Name"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mobile / Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone || ''}
                      onChange={e => setFormData(p => ({ ...p, contactPhone: e.target.value }))}
                      placeholder="10-digit mobile number"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {formData.type === 'Inward' ? 'Received At (Destination)' : 'Dispatched From (Origin)'}
                    </label>
                    <input
                      type="text"
                      value={formData.locationAt}
                      onChange={e => setFormData(p => ({ ...p, locationAt: e.target.value }))}
                      placeholder="Sreemeditec Office / Warehouse"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {formData.type === 'Inward' ? 'Received By (Staff / Admin)' : 'Dispatched By (Staff / Admin)'}
                    </label>
                    <select
                      value={formData.handledById || ''}
                      onChange={e => {
                        const emp = employees.find(emp => emp.id === e.target.value);
                        setFormData(p => ({
                          ...p,
                          handledById: e.target.value,
                          handledBy: emp ? emp.name : (currentUser?.name || 'Admin')
                        }));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    >
                      <option value="">{currentUser?.name || 'Admin'}</option>
                      {employees.filter(emp => emp.status !== 'Resigned').map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.partyAddress || ''}
                    onChange={e => setFormData(p => ({ ...p, partyAddress: e.target.value }))}
                    placeholder="Full street address, city, pin code"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* SECTION C: Courier & Transport Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-[10px]">C</span>
                  Courier & Logistics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Transport Mode</label>
                    <select
                      value={formData.transportMode}
                      onChange={e => setFormData(p => ({ ...p, transportMode: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    >
                      {TRANSPORT_MODES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Courier / Carrier</label>
                    <input
                      type="text"
                      list="courier-presets"
                      value={formData.courierCompany || ''}
                      onChange={e => setFormData(p => ({ ...p, courierCompany: e.target.value }))}
                      placeholder="E.g., DTDC, Blue Dart..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    />
                    <datalist id="courier-presets">
                      {COMMON_COURIERS.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Docket / AWB Number</label>
                    <input
                      type="text"
                      value={formData.docketNo || ''}
                      onChange={e => setFormData(p => ({ ...p, docketNo: e.target.value }))}
                      placeholder="Air Waybill / Consignment #"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">LR Number / Consignment</label>
                    <input
                      type="text"
                      value={formData.lrNo || ''}
                      onChange={e => setFormData(p => ({ ...p, lrNo: e.target.value }))}
                      placeholder="Lorry Receipt / Transporter #"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dispatch Date</label>
                    <input
                      type="date"
                      value={formData.dispatchDate || ''}
                      onChange={e => setFormData(p => ({ ...p, dispatchDate: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={formData.expectedDeliveryDate || ''}
                      onChange={e => setFormData(p => ({ ...p, expectedDeliveryDate: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Freight Charges (₹)</label>
                    <input
                      type="number"
                      value={formData.freightCharges !== undefined ? formData.freightCharges : ''}
                      onChange={e => setFormData(p => ({ ...p, freightCharges: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Amount in INR"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tracking URL (Optional)</label>
                    <input
                      type="url"
                      value={formData.trackingUrl || ''}
                      onChange={e => setFormData(p => ({ ...p, trackingUrl: e.target.value }))}
                      placeholder="https://track.courier.com/..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION D: Items & Equipment Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-[10px]">D</span>
                    Items & Equipment Details ({formData.items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-[2rem] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus size={13} /> Add Another Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, idx) => (
                    <div key={item.id || idx} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                          Item #{idx + 1}
                        </span>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 text-[10px] font-bold flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Item / Product Name *</label>
                          <AutoSuggest
                            value={item.name}
                            onChange={val => handleUpdateItem(idx, { name: val })}
                            onSelect={prod => handleUpdateItem(idx, {
                              name: prod.name,
                              brand: prod.brand || item.brand,
                              model: prod.model || item.model
                            })}
                            suggestions={products}
                            filterKey="name"
                            placeholder="E.g., Philips Patient Monitor / Suction Apparatus (auto-suggest on type)"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Brand</label>
                          <input
                            type="text"
                            value={item.brand || ''}
                            onChange={e => handleUpdateItem(idx, { brand: e.target.value })}
                            placeholder="Brand / Manufacturer"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Model Number</label>
                          <input
                            type="text"
                            value={item.model || ''}
                            onChange={e => handleUpdateItem(idx, { model: e.target.value })}
                            placeholder="Model code / number"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(idx, { quantity: Number(e.target.value) || 1 })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unit</label>
                          <select
                            value={item.unit}
                            onChange={e => handleUpdateItem(idx, { unit: e.target.value })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          >
                            {ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Condition</label>
                          <select
                            value={item.condition}
                            onChange={e => handleUpdateItem(idx, { condition: e.target.value as any })}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          >
                            {ITEM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Barcode / Tag</label>
                          <input
                            type="text"
                            value={item.barcode || ''}
                            onChange={e => handleUpdateItem(idx, { barcode: e.target.value })}
                            placeholder="Scan or enter barcode"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                          />
                        </div>
                      </div>

                      {/* Serial Numbers Manager */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          Serial Number(s) (Press Enter or click Add to append multiple)
                        </label>
                        <div className="flex gap-2 mb-1.5">
                          <input
                            type="text"
                            value={serialInputText[idx] || ''}
                            onChange={e => setSerialInputText(prev => ({ ...prev, [idx]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSerialTag(idx, serialInputText[idx] || '');
                              }
                            }}
                            placeholder="Type serial number and press Enter..."
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono outline-none uppercase"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSerialTag(idx, serialInputText[idx] || '')}
                            className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                          >
                            Add Serial
                          </button>
                        </div>
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.serialNumbers.map(sn => (
                              <span
                                key={sn}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold"
                              >
                                {sn}
                                <button type="button" onClick={() => handleRemoveSerialTag(idx, sn)} className="hover:text-rose-500">
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Accessories Included</label>
                          <input
                            type="text"
                            value={item.accessories || ''}
                            onChange={e => handleUpdateItem(idx, { accessories: e.target.value })}
                            placeholder="E.g., Power cord, 3 probes, operator manual"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Reason for Movement / Remarks</label>
                          <input
                            type="text"
                            value={item.reason || ''}
                            onChange={e => handleUpdateItem(idx, { reason: e.target.value })}
                            placeholder="E.g., Client trial demo, sensor recalibration"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION E: Supporting Documents */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="w-5 h-5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-[10px]">E</span>
                  Supporting Documents & Receipts
                </h3>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={attachmentCategory}
                    onChange={e => setAttachmentCategory(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="courier_receipt">Courier Receipt / POD</option>
                    <option value="delivery_challan">Delivery Challan</option>
                    <option value="purchase_order">Purchase Order</option>
                    <option value="sales_invoice">Sales Invoice</option>
                    <option value="service_sheet">Service Job Sheet</option>
                    <option value="handover_form">Equipment Handover Form</option>
                    <option value="item_photo">Photographs of Items</option>
                    <option value="other">Other Supporting Document</option>
                  </select>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleUploadAttachment}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-[2rem] flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Upload size={14} /> Attach File
                  </button>
                </div>

                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                    {formData.attachments.map(att => (
                      <div key={att.id} className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{att.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{att.category?.replace(/_/g, ' ')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* General Remarks */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">General Remarks / Notes</label>
                <textarea
                  rows={3}
                  value={formData.remarks || ''}
                  onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Additional dispatch instructions, security check notes, receiver remarks..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-3.5 text-xs outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-6 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-wider border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveEntry(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3 rounded-[2rem] shadow-lg shadow-emerald-950/40 active:scale-95 transition-all flex items-center gap-2"
              >
                <Check size={16} /> Save Register Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Slide-Over Drawer */}
      {showDetailDrawer && selectedEntry && (
        <div className="fixed inset-0 z-[140] flex justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowDetailDrawer(false)}></div>
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header (ERP Emerald/Gold Theme) */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 text-white p-6 border-b border-emerald-800/40 flex items-start justify-between shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedEntry.type === 'Inward'
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#c5a059]/20 text-[#e5c185] border border-[#c5a059]/40'
                  }`}>
                    {selectedEntry.type === 'Inward' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                    {selectedEntry.type} Entry
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-200/90">{selectedEntry.entryNumber}</span>
                </div>
                <h3 className="text-xl font-playfair font-bold text-white uppercase tracking-tight">
                  {selectedEntry.partyName}
                </h3>
                <p className="text-[11px] text-emerald-200/70 mt-0.5">
                  {selectedEntry.entryDate} at {selectedEntry.entryTime} • {selectedEntry.purpose}
                </p>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                <button
                  onClick={() => handleTriggerPrint(selectedEntry)}
                  className="p-2 text-emerald-200 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Print Slip"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => { setShowDetailDrawer(false); handleOpenEdit(selectedEntry); }}
                  className="p-2 text-emerald-200 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
                  title="Edit Entry"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => setShowDetailDrawer(false)}
                  className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar text-xs">
              
              {/* Status Box */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Status</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEntry.status}</span>
                </div>
                {selectedEntry.status !== 'Cancelled' && (
                  <button
                    onClick={() => handleCancelEntry(selectedEntry)}
                    className="text-rose-500 hover:text-rose-700 font-bold text-[10px] uppercase tracking-wider"
                  >
                    Cancel Movement
                  </button>
                )}
              </div>

              {/* Party Information */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {selectedEntry.type === 'Inward' ? 'Sender Details' : 'Recipient Details'}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Name:</span>
                    <strong className="text-slate-800 dark:text-slate-100">{selectedEntry.partyName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Party Type:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedEntry.partyType}</span>
                  </div>
                  {selectedEntry.contactPerson && (
                    <div>
                      <span className="text-slate-400 block">Contact Person:</span>
                      <span className="font-semibold">{selectedEntry.contactPerson}</span>
                    </div>
                  )}
                  {selectedEntry.contactPhone && (
                    <div>
                      <span className="text-slate-400 block">Phone:</span>
                      <span className="font-semibold">{selectedEntry.contactPhone}</span>
                    </div>
                  )}
                  {selectedEntry.partyAddress && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Address:</span>
                      <span className="text-slate-600 dark:text-slate-300">{selectedEntry.partyAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Courier & Tracking */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Logistics & Tracking</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Transport Mode:</span>
                    <strong className="text-slate-700 dark:text-slate-200">{selectedEntry.transportMode || 'Courier'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Carrier:</span>
                    <strong className="text-slate-700 dark:text-slate-200">{selectedEntry.courierCompany || '---'}</strong>
                  </div>
                  {selectedEntry.docketNo && (
                    <div>
                      <span className="text-slate-400 block">Docket / AWB:</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{selectedEntry.docketNo}</span>
                    </div>
                  )}
                  {selectedEntry.lrNo && (
                    <div>
                      <span className="text-slate-400 block">LR Number:</span>
                      <span className="font-mono font-bold">{selectedEntry.lrNo}</span>
                    </div>
                  )}
                  {selectedEntry.dispatchDate && (
                    <div>
                      <span className="text-slate-400 block">Dispatch Date:</span>
                      <span>{selectedEntry.dispatchDate}</span>
                    </div>
                  )}
                  {selectedEntry.expectedDeliveryDate && (
                    <div>
                      <span className="text-slate-400 block">Expected Delivery:</span>
                      <span>{selectedEntry.expectedDeliveryDate}</span>
                    </div>
                  )}
                  {selectedEntry.freightCharges !== undefined && (
                    <div>
                      <span className="text-slate-400 block">Freight Charges:</span>
                      <span className="font-bold">₹{selectedEntry.freightCharges}</span>
                    </div>
                  )}
                  {selectedEntry.trackingUrl && (
                    <div className="col-span-2">
                      <a
                        href={selectedEntry.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                      >
                        <ExternalLink size={12} /> Open Tracking Portal
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Items ({selectedEntry.items?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(selectedEntry.items || []).map((item, i) => (
                    <div key={item.id || i} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-100">{item.name}</strong>
                          {(item.brand || item.model) && (
                            <p className="text-[10px] text-slate-400">{item.brand} {item.model}</p>
                          )}
                        </div>
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      {item.serialNumbers && item.serialNumbers.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Serial Nos:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.serialNumbers.map(sn => (
                              <span key={sn} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                                {sn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.accessories && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          <strong>Accessories:</strong> {item.accessories}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Attached Documents */}
              {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Attached Files ({selectedEntry.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEntry.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.data}
                        download={att.name}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 hover:border-emerald-500 transition-colors"
                      >
                        <FileText size={16} className="text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-[11px]">{att.name}</p>
                          <p className="text-[9px] text-slate-400 capitalize">{att.category?.replace(/_/g, ' ')}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Info */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
                <p>Created by: <strong>{selectedEntry.createdBy}</strong> on {new Date(selectedEntry.createdAt).toLocaleString()}</p>
                {selectedEntry.lastModifiedAt && (
                  <p>Last edited by: <strong>{selectedEntry.lastModifiedBy}</strong> on {new Date(selectedEntry.lastModifiedAt).toLocaleString()}</p>
                )}
                {selectedEntry.isCancelled && (
                  <p className="text-rose-500 font-bold">Cancelled by: {selectedEntry.cancelledBy} on {new Date(selectedEntry.cancelledAt || '').toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Material Slip Modal */}
      {showPrintModal && entryToPrint && (
        <div className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 my-auto print:p-0 print:m-0 print:shadow-none print:w-full">
            
            {/* Top Toolbar (Hidden during print) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-emerald-700" />
                <span className="font-playfair font-bold text-sm uppercase tracking-wider text-slate-900">Print Official Movement Slip</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-6 py-2.5 rounded-[2rem] flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Printer size={14} /> Print Now
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-800 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="space-y-6 text-xs text-slate-800 leading-relaxed font-sans">
              
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-950">
                    {primaryCompany.companyName}
                  </h1>
                  <p className="text-[11px] text-slate-600 max-w-md mt-0.5">{primaryCompany.address}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-slate-600 mt-1">
                    <span><strong>GSTIN:</strong> {primaryCompany.gstin || '33AAGCS9481M1Z5'}</span>
                    <span><strong>Phone:</strong> {primaryCompany.phone}</span>
                    <span><strong>Email:</strong> {primaryCompany.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider text-white ${
                    entryToPrint.type === 'Inward' ? 'bg-emerald-700' : 'bg-blue-800'
                  }`}>
                    {entryToPrint.type === 'Inward' ? 'INWARD MATERIAL RECEIPT' : 'OUTWARD DISPATCH SLIP'}
                  </div>
                  <div className="mt-2 text-right">
                    <p className="font-mono font-bold text-sm text-slate-900">{entryToPrint.entryNumber}</p>
                    <p className="text-[10px] text-slate-500">Date: {entryToPrint.entryDate} | {entryToPrint.entryTime}</p>
                    {entryToPrint.referenceNo && (
                      <p className="text-[10px] text-slate-600 font-semibold">Ref: {entryToPrint.referenceNo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Party & Movement Metadata Boxes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-300 rounded-xl p-3 space-y-1">
                  <h3 className="font-black text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
                    {entryToPrint.type === 'Inward' ? 'Sender / Consignor Details' : 'Recipient / Consignee Details'}
                  </h3>
                  <p className="font-bold text-sm text-slate-900">{entryToPrint.partyName}</p>
                  <p className="text-[11px] text-slate-600">{entryToPrint.partyAddress || 'Address on record'}</p>
                  {entryToPrint.contactPerson && (
                    <p className="text-[11px] text-slate-700"><strong>Attn:</strong> {entryToPrint.contactPerson}</p>
                  )}
                  {entryToPrint.contactPhone && (
                    <p className="text-[11px] text-slate-700"><strong>Phone:</strong> {entryToPrint.contactPhone}</p>
                  )}
                </div>

                <div className="border border-slate-300 rounded-xl p-3 space-y-1">
                  <h3 className="font-black text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
                    Logistics & Purpose
                  </h3>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div><strong>Purpose:</strong> {entryToPrint.purpose}</div>
                    <div><strong>Status:</strong> {entryToPrint.status}</div>
                    <div><strong>Carrier:</strong> {entryToPrint.courierCompany || entryToPrint.transportMode || 'Hand Delivery'}</div>
                    <div><strong>Docket #:</strong> {entryToPrint.docketNo || '---'}</div>
                    {entryToPrint.lrNo && <div><strong>LR No:</strong> {entryToPrint.lrNo}</div>}
                    <div><strong>Handled By:</strong> {entryToPrint.handledBy}</div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase text-slate-700">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">#</th>
                      <th className="py-2 px-3 border-r border-slate-300">Item Description</th>
                      <th className="py-2 px-3 border-r border-slate-300">Brand / Model</th>
                      <th className="py-2 px-3 border-r border-slate-300">Serial Numbers</th>
                      <th className="py-2 px-3 border-r border-slate-300 w-16 text-center">Condition</th>
                      <th className="py-2 px-3 w-16 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(entryToPrint.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold">
                          <div>{item.name}</div>
                          {item.accessories && (
                            <div className="text-[10px] text-slate-500"><strong>Accessories:</strong> {item.accessories}</div>
                          )}
                          {item.reason && (
                            <div className="text-[10px] text-slate-500"><strong>Note:</strong> {item.reason}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200">{item.brand || '---'} {item.model || ''}</td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono text-[10px]">
                          {(item.serialNumbers && item.serialNumbers.length > 0) ? item.serialNumbers.join(', ') : 'N/A'}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center">{item.condition}</td>
                        <td className="py-2 px-3 text-right font-bold">{item.quantity} {item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                      <td colSpan={5} className="py-2 px-3 text-right uppercase text-[10px]">Total Quantity:</td>
                      <td className="py-2 px-3 text-right font-mono">
                        {(entryToPrint.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remarks */}
              {entryToPrint.remarks && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                  <strong>Remarks / Instructions:</strong> {entryToPrint.remarks}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-300 mt-12 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">Handed Over By</div>
                  <p className="text-[10px] text-slate-400">Signature & Date</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">Received / Inspected By</div>
                  <p className="text-[10px] text-slate-400">Signature & Date</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 font-bold">Authorized Signatory</div>
                  <p className="text-[10px] text-slate-400">For {primaryCompany.companyName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
