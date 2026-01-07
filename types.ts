
export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUOTED = 'Quoted',
  NEGOTIATION = 'Negotiation',
  WON = 'Won',
  LOST = 'Lost'
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
  contactPerson?: string;
  address: string;
  gstin?: string;
  email?: string;
  phone?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderDetails {
  orderId: string;
  orderDate: string;
  items: OrderItem[];
  shippingAddress: string;
  paymentStatus: 'Paid' | 'Pending' | 'COD';
  platformFee?: number;
}

export interface FollowUp {
  id: string;
  date: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Site Visit' | 'WhatsApp';
  notes: string;
  status: 'Pending' | 'Completed';
}

export interface Lead {
  id: string;
  name: string;
  hospital: string;
  source: 'Website' | 'IndiaMART' | 'Referral' | 'Walk-in' | 'Amazon' | 'Flipkart';
  status: LeadStatus;
  value: number;
  lastContact: string;
  productInterest: string;
  orderDetails?: OrderDetails;
  phone?: string;
  email?: string;
  address?: string;
  followUps?: FollowUp[];
}

export interface Product {
  id: string;
  name: string;
  category: 'Equipment' | 'Consumable' | 'Spare Part';
  sku: string;
  stock: number;
  price: number;
  minLevel: number;
  location: string;
  hsn?: string;
  taxRate?: number;
  model?: string;
  description?: string;
  supplier?: string;
  lastRestocked?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'In' | 'Out';
  quantity: number;
  date: string;
  reference: string;
  purpose?: 'Sale' | 'Demo' | 'Restock' | 'Service' | 'Return';
}

export interface ServiceTicket {
  id: string;
  customer: string;
  equipment: string;
  issue: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved';
  assignedTo: string;
  dueDate: string;
  type: 'Breakdown' | 'AMC' | 'Installation';
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
  category: 'Billing' | 'Technical' | 'Sales' | 'General';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
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
  customerHospital?: string;
  customerAddress?: string;
  equipmentName: string;
  modelNumber?: string;
  serialNumber?: string;
  problemReported: string;
  actionTaken: string;
  engineerName: string;
  status: 'Completed' | 'Pending Spares' | 'Observation' | 'Draft';
  itemsUsed?: ServiceReportItem[];
  customerRemarks?: string;
  documentType?: 'ServiceOrder' | 'ServiceReport' | 'InstallationReport';
  createdBy?: string;
}

export interface AMCReminder {
  id: string;
  hospital: string;
  equipment: string;
  expiryDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
}

export enum TabView {
  DASHBOARD = 'dashboard',
  LEADS = 'leads',
  QUOTES = 'quotes',
  PO_BUILDER = 'customer_po',
  SUPPLIER_PO = 'supplier_po',
  INVENTORY = 'inventory',
  SERVICE_ORDERS = 'service_orders',
  SERVICE_REPORTS = 'service_reports',
  INSTALLATION_REPORTS = 'installation_reports',
  HR = 'hr',
  ATTENDANCE = 'attendance',
  TASKS = 'tasks',
  BILLING = 'billing',
  DELIVERY = 'delivery',
  REPORTS = 'reports',
  PROFILE = 'profile',
  CLIENTS = 'clients',
  VENDORS = 'vendors',
  EXPENSES = 'expenses',
  PERFORMANCE = 'performance',
}

export type EnterpriseRole = 'SYSTEM_ADMIN' | 'SYSTEM_STAFF';

export interface Employee {
  id: string;
  name: string;
  role: EnterpriseRole;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  baseSalary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
  permissions?: TabView[];
  password?: string;
  isLoginEnabled?: boolean;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  attendanceDays: number;
  lopDays: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'Paid' | 'Pending' | 'Processing';
  paymentDate?: string;
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  type: 'Sick' | 'Casual' | 'Earned';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Approved' | 'Rejected' | 'Pending';
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
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
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  relatedTo?: string;
  coords?: { lat: number; lng: number };
  locationName?: string;
  subTasks?: SubTask[];
  logs?: TaskLog[];
  completionRequest?: {
    requested: boolean;
    note: string;
    timestamp: string;
  };
  exceptionRequest?: {
    type: 'Move' | 'Delete';
    reason: string;
    newDate?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    timestamp: string;
  };
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  mode: string;
  reference?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  model?: string;
  features?: string;
  hsn: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate: number;
  amount: number;
  gstValue: number;
  priceWithGst: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  documentType?: 'Quotation' | 'PO' | 'SupplierPO' | 'ServiceOrder';
  date: string;
  dueDate: string;
  customerName: string;
  customerHospital: string;
  customerAddress: string;
  customerGstin?: string;
  phone?: string;
  email?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Draft' | 'Converted' | 'Completed';
  paymentMethod?: 'Bank Transfer' | 'Cheque' | 'Cash' | 'UPI' | 'NEFT';
  smcpoNumber?: string;
  cpoNumber?: string;
  cpoDate?: string;
  deliveryAddress?: string;
  discount?: number;
  advanceAmount?: number;
  advanceDate?: string;
  advanceMode?: string;
  bankDetails?: string;
  deliveryTime?: string;
  specialNote?: string;
  subject?: string;
  freightAmount?: number;
  freightTaxRate?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  deliveryTerms?: string;
  payments?: PaymentRecord[];
  totalPaid?: number;
  balanceDue?: number;
  signatureImage?: string;
  sealImage?: string;
  relatedQuotationId?: string;
  bankAndBranch?: string;
  accountNo?: string;
  createdBy?: string;
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
  vehicleNumber?: string;
  items: ChallanItem[];
  status: 'Dispatched' | 'Delivered' | 'Returned' | 'Draft';
  referenceOrder?: string;
  createdBy?: string;
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
}

export interface PointHistory {
  id: string;
  date: string;
  points: number;
  category: 'Task' | 'Attendance' | 'Sales' | 'Bonus';
  description: string;
  userId: string;
}

export interface UserStats {
  points: number;
  tasksCompleted: number;
  attendanceStreak: number;
  salesRevenue: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'alert' | 'warning' | 'success';
  read: boolean;
  isNewToast?: boolean;
}

// Add missing UserProfile interface used in ProfileModule
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
