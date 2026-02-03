
import { FieldValue, Timestamp } from 'firebase/firestore';

export type EnterpriseRole = 'SYSTEM_ADMIN' | 'SYSTEM_STAFF';

export enum TabView {
  DASHBOARD = 'DASHBOARD',
  LEADS = 'LEADS',
  CLIENTS = 'CLIENTS',
  VENDORS = 'VENDORS',
  INVENTORY = 'INVENTORY',
  BILLING = 'BILLING',
  QUOTES = 'QUOTES',
  PO_BUILDER = 'PO_BUILDER',
  SUPPLIER_PO = 'SUPPLIER_PO',
  SERVICE_ORDERS = 'SERVICE_ORDERS',
  SERVICE_REPORTS = 'SERVICE_REPORTS',
  INSTALLATION_REPORTS = 'INSTALLATION_REPORTS',
  DELIVERY = 'DELIVERY',
  TASKS = 'TASKS',
  ATTENDANCE = 'ATTENDANCE',
  EXPENSES = 'EXPENSES',
  PERFORMANCE = 'PERFORMANCE',
  HR = 'HR',
  PROFILE = 'PROFILE',
  REPORTS = 'REPORTS'
}

export interface ServerMetadata {
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
  createdBy?: string; 
}

export interface UserProfile extends ServerMetadata {
  uid: string;
  name: string;
  email: string;
  role: EnterpriseRole | string;
  department: string;
  phone?: string;
  isLoginEnabled: boolean;
  permissions: TabView[];
  baseSalary?: number;
  location?: string;
  bio?: string;
  notifications?: {
      email: boolean;
      sms: boolean;
      push: boolean;
  };
}

export interface Employee extends ServerMetadata {
    id: string; // Internal Registry ID (e.g. EMP001)
    uid: string; // Firebase Auth UID
    name: string;
    role: EnterpriseRole;
    department: string;
    email: string;
    phone?: string;
    joinDate?: string;
    baseSalary?: number;
    status: 'Active' | 'Inactive';
    permissions: TabView[];
    isLoginEnabled: boolean;
}

export interface Product extends ServerMetadata {
  id: string;
  name: string;
  category: 'Equipment' | 'Consumable' | 'Spare Part';
  sku: string;
  stock: number;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minLevel: number;
  location: string;
  hsn?: string;
  taxRate?: number;
  model?: string;
  supplier?: string;
  description?: string;
  features?: string;
  lastRestocked?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsn?: string;
  model?: string;
  features?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  gstValue?: number;
  priceWithGst?: number;
}

export interface Invoice extends ServerMetadata {
  id: string;
  invoiceNumber: string;
  date: string;
  items: InvoiceItem[];
  status: 'Pending' | 'Paid' | 'Draft' | 'Finalized';
  customerName: string;
  customerHospital?: string;
  customerAddress?: string;
  customerGstin?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerGstin?: string;
  documentType: 'Invoice' | 'PO' | 'Quotation' | 'SupplierPO' | 'ServiceOrder' | 'ServiceReport' | 'InstallationReport';
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  discount?: number;
  freightAmount?: number;
  freightTaxRate?: number;
  deliveryNote?: string;
  modeOfPayment?: string;
  referenceNoDate?: string;
  otherReferences?: string;
  smcpoNumber?: string;
  buyerOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  specialNote?: string;
  cpoNumber?: string;
  cpoDate?: string;
  bankDetails?: string;
  deliveryAddress?: string;
  bankAndBranch?: string;
  accountNo?: string;
  paymentMethod?: string;
  advanceAmount?: number;
  advanceDate?: string;
  deliveryTime?: string;
  subject?: string;
  phone?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    HALFDAY = 'Half-Day',
    PENDING = 'Pending'
}

export interface AttendanceRecord {
  id: string; 
  userId: string;
  employeeId?: string;
  userName: string;
  employeeName?: string;
  date: string; 
  checkIn: FieldValue | Timestamp | string;
  checkOut?: FieldValue | Timestamp | string;
  status: AttendanceStatus | string;
  workMode: 'Office' | 'Field' | 'Remote';
  totalHours?: number;
  tasksCompleted?: number;
  overriddenBy?: string;
}

export interface PointHistory extends ServerMetadata {
  id: string;
  points: number;
  category: 'Task' | 'Attendance' | 'Sales' | 'Lead';
  description: string;
  userId: string;
  date: string;
}

export interface TaskLog {
    id: string;
    user: string;
    action: string;
    timestamp: string;
}

export interface Task extends ServerMetadata {
  id: string;
  title: string;
  description: string;
  assignedTo: string; 
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  locationName?: string;
  subTasks?: any[];
  pointsAwarded?: boolean;
  logs?: TaskLog[];
  submittedBy?: string;
}

export interface Client {
    id: string;
    name: string;
    hospital?: string;
    address: string;
    gstin?: string;
    email?: string;
    phone?: string;
}

export interface Vendor {
    id: string;
    name: string;
    address: string;
    contactPerson?: string;
    gstin?: string;
    email?: string;
    phone?: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    productName: string;
    type: 'In' | 'Out';
    quantity: number;
    date: string;
    reference: string;
    purpose: 'Restock' | 'Sale' | 'Demo';
}

export interface ExpenseRecord {
    id: string;
    employeeName: string;
    date: string;
    category: 'Travel' | 'Food' | 'Lodging' | 'Supplies' | 'Other';
    amount: number;
    description: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    receiptUrl?: string;
    rejectionReason?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  isNewToast?: boolean;
  createdAt?: FieldValue | Timestamp;
}

export enum LeadStatus {
    NEW = 'New',
    CONTACTED = 'Contacted',
    QUALIFIED = 'Qualified',
    PROPOSAL = 'Proposal',
    NEGOTIATION = 'Negotiation',
    WON = 'Won',
    LOST = 'Lost'
}

export interface FollowUp {
    id: string;
    date: string;
    type: 'Call' | 'Meeting' | 'WhatsApp';
    notes: string;
    status: 'Pending' | 'Completed';
}

export interface Lead {
    id: string;
    name: string;
    hospital: string;
    source: 'Website' | 'Amazon' | 'Flipkart' | 'Referral' | 'IndiaMART' | 'Walk-in' | 'Social Media';
    status: LeadStatus;
    value: number;
    lastContact: string;
    productInterest: string;
    phone?: string;
    email?: string;
    address?: string;
    followUps: FollowUp[];
}

export interface ServiceTicket {
    id: string;
    customer: string;
    equipment: string;
    issue: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Resolved';
    assignedTo: string;
    dueDate: string;
}

export interface AMCReminder {
    id: string;
    customer: string;
    equipment: string;
    expiryDate: string;
    status: 'Pending' | 'Sent' | 'Renewed';
}

export interface ServiceReportItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface ServiceReport {
    id: string;
    reportNumber: string;
    date: string;
    customerName: string;
    customerAddress?: string;
    customerHospital?: string;
    equipmentName: string;
    problemReported: string;
    actionTaken: string;
    engineerName: string;
    status: 'Draft' | 'Completed';
    itemsUsed?: ServiceReportItem[];
    documentType?: string;
    serialNumber?: string;
}

export interface UserStats {
    points: number;
    tasksCompleted: number;
    attendanceStreak: number;
    salesRevenue: number;
}

export interface SupportMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
    isAdmin: boolean;
}

export interface SupportTicket {
    id: string;
    subject: string;
    customerName: string;
    customerEmail: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    category: 'Technical' | 'Billing' | 'Sales' | 'General';
    createdAt: string;
    updatedAt: string;
    messages: SupportMessage[];
}

export interface ChallanItem {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    remarks?: string;
}

export interface DeliveryChallan {
    id: string;
    challanNumber: string;
    date: string;
    customerName: string;
    customerAddress: string;
    items: ChallanItem[];
    status: 'Draft' | 'Dispatched';
}
