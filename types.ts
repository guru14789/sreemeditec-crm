
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

export enum LeadStatus {
  NEW = 'New',
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
  source: string;
  status: LeadStatus;
  value: number;
  lastContact: string;
  productInterest: string;
  phone?: string;
  email?: string;
  address?: string;
  followUps: FollowUp[];
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

export interface Product {
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
  description?: string;
  supplier?: string;
  lastRestocked?: string;
  price?: number;
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsn?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  gstValue: number;
  priceWithGst: number;
  model?: string;
  features?: string;
  unit?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  items: InvoiceItem[];
  status: 'Pending' | 'Paid' | 'Draft' | 'Finalized';
  customerName: string;
  customerHospital?: string;
  customerAddress?: string;
  customerGstin?: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  documentType?: 'PO' | 'Quotation' | 'SupplierPO' | 'ServiceOrder' | 'ServiceReport' | 'InstallationReport';
  createdBy?: string;
  smcpoNumber?: string;
  deliveryTime?: string;
  specialNote?: string;
  cpoNumber?: string;
  cpoDate?: string;
  bankDetails?: string;
  deliveryAddress?: string;
  bankAndBranch?: string;
  accountNo?: string;
  paymentMethod?: 'Bank Transfer' | 'NEFT' | 'RTGS' | 'Cheque' | 'Cash' | 'UPI';
  advanceAmount?: number;
  advanceDate?: string;
  discount?: number;
  subject?: string;
  phone?: string;
  freightAmount?: number;
  freightTaxRate?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
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

export interface Employee {
  id: string;
  name: string;
  role: EnterpriseRole;
  department: string;
  email: string;
  phone?: string;
  joinDate?: string;
  baseSalary?: number;
  status: 'Active' | 'On Leave';
  permissions: TabView[];
  password?: string;
  isLoginEnabled: boolean;
}

export interface UserStats {
  points: number;
  tasksCompleted: number;
  attendanceStreak: number;
  salesRevenue: number;
}

export interface PointHistory {
  id: string;
  date: string;
  points: number;
  category: 'Task' | 'Attendance' | 'Sales' | 'Lead';
  description: string;
  userId: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'warning' | 'success' | 'info';
  read: boolean;
}

export interface TaskLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  locationName?: string;
  submittedBy?: string;
  pointsAwarded?: boolean;
  logs: TaskLog[];
  subTasks?: any[];
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
  equipmentName: string;
  problemReported: string;
  actionTaken: string;
  engineerName: string;
  status: 'Draft' | 'Completed';
  itemsUsed?: ServiceReportItem[];
  documentType?: string;
  serialNumber?: string;
  customerHospital?: string;
  customerAddress?: string;
  office?: string;
  time?: string;
  machineStatus?: 'Warranty' | 'Out Of Warranty' | 'AMC';
  softwareVersion?: string;
  engineerObservations?: string;
  poWoNumber?: string;
  actionHardware?: string;
  actionOperational?: string;
  actionSoftware?: string;
  pastBalance?: number;
  visitCharges?: number;
  sparesCharges?: number;
  amountReceived?: number;
  memoNumber?: string;
  queriesRemarks?: string;
  smirNo?: string;
  installationOf?: string;
  trainedPersons?: string;
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

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  location: string;
  bio: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export interface ChallanItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string;
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
  subject?: string;
}
