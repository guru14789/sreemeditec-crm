

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
  // Enhanced fields for Billing auto-fill
  hsn?: string;
  taxRate?: number; // GST %
  model?: string;
  description?: string; // Features
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

export interface ServiceReport {
  id: string;
  date: string;
  customerName: string;
  equipmentName: string;
  serialNumber?: string;
  problemReported: string;
  actionTaken: string;
  engineerName: string;
  status: 'Completed' | 'Pending Spares' | 'Observation';
}

export interface AMCReminder {
  id: string;
  hospital: string;
  equipment: string;
  expiryDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
}

// HR & Payroll Types
export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  baseSalary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  attendanceDays: number; // Days worked + Paid Leave
  lopDays: number; // Loss of Pay (Absent)
  allowances: number; // HRA, Transport
  deductions: number; // PF, Tax
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

// Task Management
export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // Employee Name
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  dueDate: string;
  relatedTo?: string; // e.g., Lead Name or Ticket ID
  
  // New Fields for Geo-Fencing
  coords?: { lat: number; lng: number }; // Target location coordinates
  locationName?: string; // Human readable location
  
  // Exception Handling
  completionRequest?: {
    requested: boolean;
    note: string;
    timestamp: string;
  };
}

// Billing & Invoicing
export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  mode: string;
  reference?: string;
}

export interface InvoiceItem {
  id: string;
  description: string; // Product Name
  model?: string;
  features?: string;
  hsn: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate: number; // GST %
  amount: number; // Qty * UnitPrice
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // Used as SMCPO NO in template
  date: string;
  dueDate: string;
  customerName: string;
  customerHospital: string;
  customerAddress: string;
  customerGstin?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  paymentMethod?: 'Bank Transfer' | 'Cheque' | 'Cash' | 'UPI';
  
  // New Fields for PO Format
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
  
  // New Fields for Quotation Generator UI
  subject?: string;
  freightAmount?: number;
  freightTaxRate?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  deliveryTerms?: string; // Expanded terms
  
  // Payment Tracking
  payments?: PaymentRecord[];
  totalPaid?: number;
  balanceDue?: number;
}

// Delivery Challan
export interface ChallanItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string; // e.g., Box, Pcs
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
  status: 'Dispatched' | 'Delivered' | 'Returned';
  referenceOrder?: string;
}

// User Profile
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
  bio: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Global Notifications
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'alert' | 'warning' | 'success';
  read: boolean;
}

export enum TabView {
  DASHBOARD = 'dashboard',
  LEADS = 'leads',
  QUOTES = 'quotes',
  INVENTORY = 'inventory',
  SERVICE = 'service',
  HR = 'hr',
  ATTENDANCE = 'attendance',
  TASKS = 'tasks',
  BILLING = 'billing',
  DELIVERY = 'delivery',
  SUPPORT = 'support',
  REPORTS = 'reports',
  PROFILE = 'profile',
}