
import { FieldValue, Timestamp } from 'firebase/firestore';

// Fix: Updated roles to match HRModule usage
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
  createdBy?: string; // UID or Name
}

// Fix: Added missing properties used in ProfileModule
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

// Fix: Added missing Employee interface used in HR and Attendance modules
export interface Employee {
    id: string;
    name: string;
    role: EnterpriseRole;
    department: string;
    email: string;
    phone?: string;
    joinDate?: string;
    baseSalary?: number;
    status: 'Active' | 'Inactive';
    permissions: TabView[];
    password?: string;
    isLoginEnabled: boolean;
}

// Fix: Added description and features to Product
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

// Fix: Added missing properties used in Billing/PO/Quotation modules
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

// Fix: Added extensive missing fields for various document types (Billing, PO, Quotation, SPO)
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
  
  // Doc Maker shared fields
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
  
  // PO / SPO specific
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
  
  // Quotation specific
  subject?: string;
  phone?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
}

// Fix: Added AttendanceStatus enum
export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    HALFDAY = 'Half-Day',
    PENDING = 'Pending'
}

// Fix: Added missing properties to AttendanceRecord
export interface AttendanceRecord {
  id: string; // Format: uid_YYYY-MM-DD
  userId: string;
  employeeId?: string;
  userName: string;
  employeeName?: string;
  date: string; // YYYY-MM-DD
  checkIn: FieldValue | Timestamp | string;
  checkOut?: FieldValue | Timestamp | string;
  status: AttendanceStatus | string;
  workMode: 'Office' | 'Field' | 'Remote';
  totalHours?: number;
  tasksCompleted?: number;
  overriddenBy?: string;
}

// Fix: Added date to PointHistory
export interface PointHistory extends ServerMetadata {
  id: string;
  points: number;
  category: 'Task' | 'Attendance' | 'Sales' | 'Lead';
  description: string;
  userId: string;
  date: string;
}

// Fix: Added missing TaskLog and properties to Task
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
  assignedTo: string; // Name
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  locationName?: string;
  subTasks?: any[];
  pointsAwarded?: boolean;
  logs?: TaskLog[];
  submittedBy?: string;
}

// Fix: Added missing Client and Vendor interfaces
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

// Fix: Added missing StockMovement interface
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

// Fix: Added missing ExpenseRecord interface
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

// Fix: Added missing AppNotification interface
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

// Fix: Added missing LeadStatus, FollowUp, and Lead interfaces
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

// Fix: Added missing ServiceTicket, AMCReminder, ServiceReport interfaces
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

// Fix: Added missing UserStats interface
export interface UserStats {
    points: number;
    tasksCompleted: number;
    attendanceStreak: number;
    salesRevenue: number;
}

// Fix: Added missing SupportMessage and SupportTicket interfaces
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

// Fix: Added missing ChallanItem and DeliveryChallan interfaces
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
