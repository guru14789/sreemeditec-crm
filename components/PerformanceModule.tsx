import React, { useState, useMemo } from 'react';
import { 
  Trophy, Star, Target, Award, Crown, Info, History, Medal, 
  X, Edit2, Search, User, Filter, DollarSign, 
  FileText, Wrench, PieChart, ChevronRight, Briefcase, CheckCircle2,
  ArrowLeft, Calendar, Clock, CheckCircle, Linkedin
} from 'lucide-react';
import { useData } from './DataContext';
import ReactConfetti from 'react-confetti';
import { Employee, SALARY_SCALE } from '../types';

const LOCAL_EMPLOYEE_PHOTOS: Record<string, string> = {
  'EMP004': '/images/2.png',
  'EMP005': '/images/1.png',
  'EMP007': '/images/rajesh.png',
  'EMP008': '/images/viji1.png',
  'EMP009': '/images/chithra.png',
  'EMP010': '/images/3.png',
  'suresh kumar': '/images/2.png',
  'suresh': '/images/2.png',
  'sakthivel': '/images/1.png',
  'rajesh': '/images/rajesh.png',
  'viji': '/images/viji1.png',
  'chithra': '/images/chithra.png',
  'sreekumar': '/images/3.png',
};

const DEFAULT_EMPLOYEE_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80',
];

const getEmployeePhoto = (emp: Employee) => {
  if (emp.photo) return emp.photo;
  if ((emp as any).avatar) return (emp as any).avatar;
  if ((emp as any).photoUrl) return (emp as any).photoUrl;

  const idKey = emp.id.toUpperCase().replace('#', '');
  if (LOCAL_EMPLOYEE_PHOTOS[idKey]) return LOCAL_EMPLOYEE_PHOTOS[idKey];

  const nameKey = emp.name.toLowerCase().trim();
  if (LOCAL_EMPLOYEE_PHOTOS[nameKey]) return LOCAL_EMPLOYEE_PHOTOS[nameKey];

  for (const [key, val] of Object.entries(LOCAL_EMPLOYEE_PHOTOS)) {
    if (nameKey.includes(key) || key.includes(nameKey)) {
      return val;
    }
  }

  let hash = 0;
  for (let i = 0; i < emp.id.length; i++) {
    hash += emp.id.charCodeAt(i);
  }
  return DEFAULT_EMPLOYEE_PHOTOS[hash % DEFAULT_EMPLOYEE_PHOTOS.length];
};

interface PerformanceModuleProps {
  defaultTab?: '360' | 'leaderboard';
  showDirectoryTab?: boolean;
}

export const PerformanceModule: React.FC<PerformanceModuleProps> = ({
  defaultTab = '360',
  showDirectoryTab = true
}) => {
  const { 
    pointHistory, 
    employees, 
    tasks, 
    serviceTasks,
    serviceTickets,
    serviceReports,
    installationReports,
    invoices,
    allInvoicesKpi,
    expenses,
    currentUser: activeUser,
    attendanceRecords,
    holidays,
    prizePool,
    updatePrizePool
  } = useData();

  // Tab State: '360' for Employee Directory & Dashboard, 'leaderboard' for Gamification
  const [activeTab, setActiveTab] = useState<'360' | 'leaderboard'>(defaultTab);
  
  // Search & Filter state for Employee Performance Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Leaderboard Modals
  const [showRules, setShowRules] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditingPrize, setIsEditingPrize] = useState(false);
  const [tempPrize, setTempPrize] = useState('');

  const isAdmin = activeUser?.role === 'SYSTEM_ADMIN' || activeUser?.email === 'sreekumar.career@gmail.com';

  // ---------------------------------------------------------
  // Helper: Position-Based Dynamic Target Resolver
  // ---------------------------------------------------------
  const getEmployeePositionTarget = (emp: Employee): number => {
    // 1. Explicit target set on employee object
    if ((emp as any).targetAmount && Number((emp as any).targetAmount) > 0) {
      return Number((emp as any).targetAmount);
    }
    if ((emp as any).monthlyTarget && Number((emp as any).monthlyTarget) > 0) {
      return Number((emp as any).monthlyTarget);
    }

    // 2. Position match from SALARY_SCALE
    const empPos = (emp.position || emp.role || '').trim();
    if (empPos) {
      const scaleRule = SALARY_SCALE.find(s => 
        s.position.toLowerCase() === empPos.toLowerCase() ||
        s.position.toLowerCase().includes(empPos.toLowerCase()) ||
        empPos.toLowerCase().includes(s.position.toLowerCase())
      );
      if (scaleRule && scaleRule.monthlyTarget && scaleRule.monthlyTarget > 0) {
        return scaleRule.monthlyTarget;
      }
    }

    // 3. Fallback based on department / role
    const dept = (emp.department || '').toLowerCase();
    const role = (emp.role || '').toLowerCase();

    if (dept.includes('sales') || role.includes('sales')) {
      if (empPos.toLowerCase().includes('head') || empPos.toLowerCase().includes('gm') || empPos.toLowerCase().includes('director') || empPos.toLowerCase().includes('ceo')) {
        return 1425000;
      }
      if (empPos.toLowerCase().includes('regional') || empPos.toLowerCase().includes('manager')) {
        return 820000;
      }
      if (empPos.toLowerCase().includes('area')) {
        return 600000;
      }
      if (empPos.toLowerCase().includes('territory')) {
        return 400000;
      }
      return 300000;
    }

    if (dept.includes('service') || role.includes('service') || role.includes('engineer')) {
      if (empPos.toLowerCase().includes('head') || empPos.toLowerCase().includes('manager')) {
        return 1030000;
      }
      return 275000;
    }

    return 500000;
  };

  // ---------------------------------------------------------
  // 1. Dynamic Leaderboard Generation
  // ---------------------------------------------------------
  const dynamicLeaderboard = useMemo(() => {
    const currentMonthId = new Date().toISOString().slice(0, 7);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const todayDate = today.getDate();

    let workingDaysSoFar = 0;
    for (let d = 1; d <= todayDate; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dateStr = date.toISOString().split('T')[0];
      const isSunday = date.getDay() === 0;
      const isHoliday = holidays.some(h => h.date === dateStr);
      if (!isSunday && !isHoliday) {
        workingDaysSoFar++;
      }
    }

    const list = employees
      .filter(emp => {
        if (emp.status === 'Resigned') return false;
        if (isAdmin) return true;
        return !emp.hideFromLeaderboard;
      })
      .map(emp => {
        const empPoints = pointHistory
          .filter(p => p.userId === emp.id && p.date?.startsWith(currentMonthId))
          .reduce((sum, p) => sum + p.points, 0);
        
        const empTasks = pointHistory.filter(p => 
          p.userId === emp.id && 
          p.category === 'Task' && 
          p.date?.startsWith(currentMonthId)
        ).length;
        
        const empAttendanceCount = attendanceRecords.filter(r => 
          r.userId === emp.id && 
          r.date.startsWith(currentMonthId) && 
          (r.status === 'Completed' || r.status === 'CheckedIn' || r.status === 'Paused')
        ).length;

        const attendancePercentage = workingDaysSoFar > 0 
          ? Math.min(100, Math.round((empAttendanceCount / workingDaysSoFar) * 100)) 
          : 0;
        
        return {
          id: emp.id,
          name: emp.name,
          points: empPoints,
          tasks: empTasks,
          attendance: `${attendancePercentage}%`,
          badge: empPoints > 1000 ? 'gold' : 'none',
          isHidden: !!emp.hideFromLeaderboard,
          rank: 0
        };
      });

    const visibleList = list.filter(u => !u.isHidden);
    const hiddenList = list.filter(u => u.isHidden);

    const sortedVisible = [...visibleList].sort((a, b) => b.points - a.points);
    const rankedVisible = sortedVisible.map((user, index) => ({ ...user, rank: index + 1 }));
    const rankedHidden = hiddenList.map(user => ({ ...user, rank: 0 }));

    return [...rankedVisible, ...rankedHidden].sort((a, b) => b.points - a.points);
  }, [employees, pointHistory, tasks, activeUser, holidays, attendanceRecords, isAdmin]);

  const getRankStyle = (rank: number) => {
    switch(rank) {
      case 1: return { bg: 'bg-amber-100 text-amber-600 border-amber-200', icon: <Trophy size={14} className="fill-current"/>, label: 'Champion', card: 'border-amber-400/50 bg-amber-50/10' };
      case 2: return { bg: 'bg-slate-100 text-slate-500 border-slate-300', icon: <Medal size={14} />, label: 'Runner Up', card: 'border-slate-300/50 bg-slate-50/10' };
      case 3: return { bg: 'bg-orange-100 text-orange-600 border-orange-200', icon: <Award size={14} />, label: 'Top 3', card: 'border-orange-300/50 bg-orange-50/10' };
      default: return { bg: 'bg-slate-50 text-slate-400 border-slate-300', icon: null, label: `#${rank}`, card: 'border-slate-300 bg-white dark:bg-slate-800' };
    }
  };

  // ---------------------------------------------------------
  // 2. Comprehensive 360° Metrics Calculator for Employees
  // ---------------------------------------------------------
  const invoiceList = useMemo(() => {
    const map = new Map<string, any>();
    [...(allInvoicesKpi || []), ...(invoices || [])].forEach(inv => {
      if (inv) {
        const key = inv.id || inv.invoiceNumber || (inv as any).refNo;
        if (key && !map.has(key)) {
          map.set(key, inv);
        }
      }
    });
    return Array.from(map.values());
  }, [allInvoicesKpi, invoices]);

  // Overall Company Sales (for contribution percentage)
  const totalCompanySales = useMemo(() => {
    return invoiceList
      .filter(inv => inv.documentType === 'Invoice' || !inv.documentType)
      .reduce((sum, inv) => sum + (Number(inv.grandTotal || 0)), 0);
  }, [invoiceList]);

  // Unique Department List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered Employee List (Excludes Resigned Employees)
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Exclude resigned employees from 360 performance directory cards
      if (emp.status === 'Resigned' || (emp.status || '').toLowerCase() === 'resigned') return false;

      const matchSearch = !searchQuery || 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.position && emp.position.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchDept = departmentFilter === 'ALL' || emp.department === departmentFilter;

      return matchSearch && matchDept;
    });
  }, [employees, searchQuery, departmentFilter]);

  // Single Employee Metrics Computation Function
  const calculateEmployee360Metrics = (emp: Employee) => {
    // Ultra-robust fuzzy employee matcher function
    const isEmployeeMatch = (fieldVal: string | undefined | null) => {
      if (!fieldVal) return false;
      const val = fieldVal.trim().toLowerCase();
      if (!val || val === 'direct' || val === 'none' || val === 'unknown') return false;

      const empName = emp.name.trim().toLowerCase();
      const empId = emp.id.trim().toLowerCase();
      const empCode = (emp.employeeId || '').trim().toLowerCase();
      const cleanId = empId.replace(/[^a-z0-9]/g, '');
      const cleanCode = empCode.replace(/[^a-z0-9]/g, '');
      const firstName = empName.split(' ')[0];
      const email = (emp.email || '').trim().toLowerCase();
      const cleanVal = val.replace(/[^a-z0-9]/g, '');

      if (val === empName || val === empId || val === empCode || (email && val === email)) return true;
      if (cleanId && cleanId.length >= 3 && cleanVal.includes(cleanId)) return true;
      if (cleanCode && cleanCode.length >= 3 && cleanVal.includes(cleanCode)) return true;
      if (firstName && firstName.length >= 3 && (val.includes(firstName) || val.startsWith(firstName))) return true;
      if (val.includes(empId) || val.includes(empName) || empName.includes(val)) return true;
      if (empCode && (val.includes(empCode) || empCode.includes(val))) return true;
      if (email && (val.includes(email) || email.includes(val))) return true;

      return false;
    };

    // Set of Invoiced Quotations (invoices referencing a quotation ID or No)
    const invoicedQuoteIds = new Set(
      invoiceList
        .filter(i => (i.documentType === 'Invoice' || !i.documentType) && (i.refQuotationId || i.refQuotationNo))
        .flatMap(i => [i.refQuotationId, i.refQuotationNo].filter(Boolean))
    );

    // 1. Quotations Performance
    const quotesGiven = invoiceList.filter(inv => {
      const isQuoteDoc = inv.documentType === 'Quotation' || 
        (inv.invoiceNumber && (inv.invoiceNumber.startsWith('QT') || inv.invoiceNumber.startsWith('QUOT') || inv.invoiceNumber.includes('QT') || inv.invoiceNumber.includes('SMQ'))) &&
        inv.documentType !== 'Invoice';
      
      if (!isQuoteDoc) return false;

      const closed = inv.closedBy || (inv as any).createdBy || (inv as any).salesPerson || (inv as any).author || '';
      const handling = inv.handlingEmployee || '';
      return isEmployeeMatch(closed) || isEmployeeMatch(handling) || handling === emp.id || handling === emp.employeeId;
    });

    const quotesConverted = quotesGiven.filter(q => {
      const st = (q.status || '').toLowerCase();
      const isExplicitInvoiced = st === 'completed' || st === 'invoiced' || st === 'converted' || st === 'accepted' || st === 'finalized' || st === 'paid' || st === 'approved';
      if (isExplicitInvoiced) return true;
      const isReferencedByInvoice = invoicedQuoteIds.has(q.id) || invoicedQuoteIds.has(q.invoiceNumber);
      return isReferencedByInvoice;
    });

    const totalQuotesCount = quotesGiven.length;
    const convertedQuotesCount = quotesConverted.length;
    const quotationConversionRate = totalQuotesCount > 0 
      ? Math.round((convertedQuotesCount / totalQuotesCount) * 100) 
      : 0;
    const totalQuotedAmount = quotesGiven.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);

    // 2. Sales & Revenue Closed
    const salesInvoices = invoiceList.filter(inv => {
      const isInvoiceDoc = inv.documentType === 'Invoice' || (!inv.documentType && !inv.invoiceNumber?.startsWith('QT') && !inv.invoiceNumber?.startsWith('QUOT') && !inv.invoiceNumber?.startsWith('SMQ'));
      if (!isInvoiceDoc || inv.status === 'Draft' || inv.status === 'Cancelled') return false;
      const closed = inv.closedBy || (inv as any).createdBy || (inv as any).salesPerson || (inv as any).author || '';
      const handling = inv.handlingEmployee || '';
      return isEmployeeMatch(closed) || isEmployeeMatch(handling) || handling === emp.id || handling === emp.employeeId;
    });
    const totalSalesRevenue = salesInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);
    const averageDealSize = salesInvoices.length > 0 ? Math.round(totalSalesRevenue / salesInvoices.length) : 0;
    
    // Dynamic Sales Target based on Employee Position Scale
    const salesTarget = getEmployeePositionTarget(emp);
    const targetAchievementPercent = Math.min(100, Math.round((totalSalesRevenue / salesTarget) * 100));

    // 3. Expenses Breakdown
    const empExpenses = expenses.filter(exp => {
      const sub = exp.employeeName || (exp as any).submittedBy || (exp as any).paidTo || (exp as any).employeeId || '';
      return isEmployeeMatch(sub);
    });
    const totalExpensesClaimed = empExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const approvedExpenses = empExpenses
      .filter(exp => (exp.status || '').toLowerCase() === 'approved' || (exp.status || '').toLowerCase() === 'paid')
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const pendingExpenses = empExpenses
      .filter(exp => (exp.status || '').toLowerCase() === 'pending')
      .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

    // 4. Dual Task Engine (General Tasks + Field Service Tasks)
    const empGeneralTasks = tasks.filter(t => {
      const assigned = t.assignedTo || (t as any).assigneeId || (t as any).assignedToName || t.createdBy || (t as any).submittedBy || '';
      return isEmployeeMatch(assigned);
    });

    const completedGeneralTasks = empGeneralTasks.filter(t => {
      const st = (t.status || '').toLowerCase();
      return st === 'done' || st === 'completed' || st === 'closed' || st === 'finished' || st === 'verified' || (t as any).pointsAwarded === true || (t as any).isCompleted === true;
    }).length;

    const totalGeneralTasks = empGeneralTasks.length;
    const generalTaskCompletionRate = totalGeneralTasks > 0 ? Math.round((completedGeneralTasks / totalGeneralTasks) * 100) : 0;

    // FIELD SERVICE TASKS & SERVICE REPORTS
    const combinedServiceTasks = [...(serviceTasks || []), ...(serviceTickets || [])];
    let empServiceTasks = combinedServiceTasks.filter(st => {
      const assigned = (st as any).assignedTo || (st as any).assignedToId || (st as any).serviceEngineer || (st as any).technician || (st as any).claimedBy || (st as any).createdBy || '';
      return isEmployeeMatch(assigned);
    });

    if (empServiceTasks.length === 0) {
      const generalServiceTasks = tasks.filter(t => {
        const titleCat = `${t.title || ''} ${(t as any).category || ''}`.toLowerCase();
        const isService = titleCat.includes('service') || titleCat.includes('field') || titleCat.includes('demo') || titleCat.includes('installation') || titleCat.includes('maintenance') || titleCat.includes('repair');
        if (!isService) return false;
        const assigned = t.assignedTo || (t as any).assigneeId || (t as any).assignedToName || t.createdBy || (t as any).submittedBy || '';
        return isEmployeeMatch(assigned);
      });

      if (generalServiceTasks.length > 0) {
        empServiceTasks = generalServiceTasks as any[];
      }
    }

    const completedServiceTasks = empServiceTasks.filter(st => {
      const s = ((st as any).status || '').toLowerCase();
      return s === 'completed' || s === 'resolved' || s === 'closed' || s === 'done' || s === 'billed' || s === 'non billed';
    }).length;

    const totalServiceTasks = empServiceTasks.length;
    const serviceTaskCompletionRate = totalServiceTasks > 0 ? Math.round((completedServiceTasks / totalServiceTasks) * 100) : 0;

    // Service Visit Reports
    const combinedReports = [...(serviceReports || []), ...(installationReports || [])];
    const empServiceReports = combinedReports.filter(sr => {
      const eng = sr.engineerName || (sr as any).serviceEngineer || (sr as any).createdBy || (sr as any).author || (sr as any).employeeName || (sr as any).closedBy || '';
      return isEmployeeMatch(eng);
    });

    const totalAllTasks = totalGeneralTasks + totalServiceTasks;
    const completedAllTasks = completedGeneralTasks + completedServiceTasks;
    const overallTaskRate = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 100;

    // 5. Company Contribution Share
    const revenueContributionPercent = totalCompanySales > 0 
      ? Math.min(100, Number(((totalSalesRevenue / totalCompanySales) * 100).toFixed(1))) 
      : 0;

    // 6. Leaderboard & Gamification Stats
    const rankIndex = dynamicLeaderboard.findIndex(r => r.id === emp.id || r.name.toLowerCase().includes(emp.name.toLowerCase()));
    const rankEntry = rankIndex !== -1 ? dynamicLeaderboard[rankIndex] : null;
    const leaderboardPoints = rankEntry ? rankEntry.points : 0;
    const leaderboardRank = rankEntry && rankEntry.rank > 0 ? rankEntry.rank : (rankIndex !== -1 ? rankIndex + 1 : 1);
    const attendancePercentageStr = rankEntry ? rankEntry.attendance : '85%';

    // 7. Composite 360° Rating Score (0 to 100)
    const attendanceNum = parseInt(attendancePercentageStr) || 85;
    const compositeScore = Math.min(100, Math.round(
      (targetAchievementPercent * 0.35) + 
      (overallTaskRate * 0.30) + 
      (quotationConversionRate * 0.20) + 
      (attendanceNum * 0.15)
    ));

    return {
      totalQuotesCount,
      convertedQuotesCount,
      quotationConversionRate,
      totalQuotedAmount,
      quotesGiven,
      quotesConverted,
      salesInvoices,
      salesInvoicesCount: salesInvoices.length,
      totalSalesRevenue,
      salesTarget,
      targetAchievementPercent,
      averageDealSize,
      empExpenses,
      totalExpensesClaimed,
      approvedExpenses,
      pendingExpenses,
      empGeneralTasks,
      completedGeneralTasks,
      totalGeneralTasks,
      generalTaskCompletionRate,
      empServiceTasks,
      completedServiceTasks,
      totalServiceTasks,
      serviceTaskCompletionRate,
      empServiceReports,
      serviceReportsCount: empServiceReports.length,
      revenueContributionPercent,
      leaderboardPoints,
      leaderboardRank,
      attendancePercentageStr,
      compositeScore,
      empPointLogs: (pointHistory || []).filter(ph => isEmployeeMatch((ph as any).employeeName || (ph as any).userId || (ph as any).employeeId || (ph as any).name)),
      empAttendanceRecords: (attendanceRecords || []).filter(ar => isEmployeeMatch((ar as any).userName || (ar as any).userId || (ar as any).employeeId))
    };
  };

  // State for 360° Employee Detail Modal
  const [targetFilter, setTargetFilter] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [activeDrilldown, setActiveDrilldown] = useState<'none' | 'quotes_given' | 'quotes_converted' | 'sales_invoices' | 'general_tasks' | 'service_tasks' | 'expenses' | 'gamification'>('none');
  const [drillSubFilter, setDrillSubFilter] = useState<string>('all');

  // Helper: List of available months for selection
  const availableMonths = useMemo(() => {
    const months: { id: string; label: string }[] = [{ id: 'all', label: 'All Months (YTD)' }];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthId = d.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      months.push({ id: monthId, label: monthLabel });
    }
    return months;
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 md:gap-5 overflow-y-auto custom-scrollbar p-1 md:p-2 relative">
      {showConfetti && <ReactConfetti numberOfPieces={200} recycle={false} style={{ position: 'fixed', zIndex: 1000 }} />}

      {/* TOP MODULE HEADER BANNER */}
      <div className="bg-[#01261d] p-4 md:p-5 rounded-3xl border border-emerald-800/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 shrink-0">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
              Employee Performance Portal
            </h2>
            <p className="text-emerald-200/80 text-xs font-semibold">
              360° Company Performance Dashboard & Directory
            </p>
          </div>
        </div>

        {/* Directory Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/80 border border-emerald-700/60 rounded-2xl text-xs font-black uppercase text-emerald-300 tracking-wider shadow-inner">
          <User size={15} className="text-emerald-400" /> 360° Employee Directory
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 360° EMPLOYEE PERFORMANCE DIRECTORY & CARDS */}
      {/* ========================================================================= */}
      {activeTab === '360' && (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* SEARCH & FILTER CONTROLS BAR */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Employee Name, ID, Role, Department..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                <Filter size={14} /> Department:
              </div>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {/* EMPLOYEE CARDS GRID (FULL PHOTO CARDS WITH OVERLAY BANNER) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-6">
              {filteredEmployees.map(emp => {
                const isSelected = selectedEmployee?.id === emp.id;

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setActiveDrilldown('none');
                    }}
                    className={`relative group rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-slate-100 dark:bg-slate-800 border aspect-[4/5] flex flex-col justify-end ${
                      isSelected 
                        ? 'ring-4 ring-indigo-500 border-indigo-500 shadow-xl' 
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    {/* Portrait Photo Background */}
                    <img
                      src={getEmployeePhoto(emp)}
                      alt={emp.name}
                      className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=6366f1&color=fff&size=512`;
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Top Status & ID Pills */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-10">
                      <span className="px-2.5 py-1 bg-slate-900/70 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] font-black tracking-wider">
                        #{emp.id}
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-500/90 text-white backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {emp.status}
                      </span>
                    </div>

                    {/* Floating Info Box Banner at Bottom (Matching User's Image) */}
                    <div className="relative z-10 m-3 p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl flex items-center justify-between shadow-xl border border-white/40 dark:border-slate-800 group-hover:border-indigo-400 transition-colors">
                      <div className="min-w-0 pr-2">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {emp.name}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {emp.position || emp.role || 'Staff'}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 p-1.5 shadow-sm border border-slate-200/60 dark:border-slate-700">
                        <img src="/images/sreemeditec-logo.png" alt="Sreemeditec" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredEmployees.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <User size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    No Employees Found
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your search query or department filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 360° EMPLOYEE DETAILED PERFORMANCE MODAL VIEW */}
      {/* ========================================================================= */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#01261d] text-white shrink-0 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center font-black text-xl text-white shadow-md">
                  {selectedEmployee.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-xs text-emerald-300/90 font-semibold flex items-center gap-2 mt-0.5">
                    <span className="font-mono bg-emerald-950/90 border border-emerald-700/50 px-2 py-0.5 rounded text-[10px] text-emerald-300">#{selectedEmployee.id}</span>
                    • {selectedEmployee.position || selectedEmployee.role || 'Staff'} ({selectedEmployee.department || 'General'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 text-emerald-200/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}
            {(() => {
              const m = calculateEmployee360Metrics(selectedEmployee);

              // Filter Sales Invoices by selected month if monthly filter is active
              const activeInvoices = targetFilter === 'monthly' && selectedMonth !== 'all'
                ? m.salesInvoices.filter(inv => {
                    const invDate = inv.date || inv.invoiceDate || (inv as any).createdAt || '';
                    return invDate.startsWith(selectedMonth);
                  })
                : m.salesInvoices;

              const activeRevenue = activeInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal || 0), 0);

              // Calculate Target based on Monthly vs Yearly toggle filter
              const targetVal = targetFilter === 'monthly' ? m.salesTarget : m.salesTarget * 12;
              const targetAchievementPercent = targetVal > 0 
                ? Math.min(100, Math.round((activeRevenue / targetVal) * 100)) 
                : 0;

              return (
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
                  {/* DRILL-DOWN BACK BUTTON & NAVIGATION HEADER IF ACTIVE */}
                  {activeDrilldown !== 'none' && (
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => {
                          setActiveDrilldown('none');
                          setDrillSubFilter('all');
                        }}
                        className="flex items-center gap-2 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        <ArrowLeft size={16} /> Back to 360° Overview
                      </button>

                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {activeDrilldown === 'quotes_given' && 'Quotes Given Details'}
                        {activeDrilldown === 'quotes_converted' && 'Converted to Sales Quotes Details'}
                        {activeDrilldown === 'sales_invoices' && 'Sales Invoices & Target Breakdown'}
                        {activeDrilldown === 'general_tasks' && 'General Tasks Execution Details'}
                        {activeDrilldown === 'service_tasks' && 'Field Service Tasks & Visit Reports'}
                        {activeDrilldown === 'expenses' && 'Financial Expense Claims Breakdown'}
                        {activeDrilldown === 'gamification' && 'Gamification & Attendance Details'}
                      </span>
                    </div>
                  )}

                  {/* TOP COMPOSITE RATING SCORE & OVERVIEW BANNER */}
                  {activeDrilldown === 'none' && (
                    <div className="bg-gradient-to-r from-[#01261d] via-[#023d30] to-slate-900 p-5 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-5 border border-emerald-800/40">
                      <div className="space-y-1.5 text-center md:text-left">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-800 inline-block">
                          Overall Performance Index
                        </span>
                        <h4 className="text-xl font-black text-white">
                          360° Company Contribution Rating
                        </h4>
                        <p className="text-xs text-emerald-200/80 font-medium max-w-md">
                          Calculated from position target fulfillment (35%), task execution (30%), quotation conversion efficiency (20%), and attendance (15%).
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
                        <div className="text-center">
                          <span className="text-3xl font-black text-amber-400 flex items-center justify-center gap-1">
                            <Star size={24} className="fill-amber-400" /> {m.compositeScore}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-200 block mt-0.5">
                            Out of 100 Points
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* MAIN OVERVIEW 4 METRIC PANELS GRID */}
                  {/* ========================================================================= */}
                  {activeDrilldown === 'none' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* PANEL 1: QUOTATIONS PERFORMANCE */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" /> Quotations Performance
                          </h4>
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
                            {m.quotationConversionRate}% Conversion
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {/* QUOTES GIVEN CARD */}
                          <div 
                            onClick={() => { setActiveDrilldown('quotes_given'); setDrillSubFilter('all'); }}
                            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-blue-500 transition-colors">Quotes Given</span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                              {m.totalQuotesCount} Quotes
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block">₹{m.totalQuotedAmount.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 block mt-1">Click to view quotes →</span>
                          </div>

                          {/* CONVERTED TO SALES CARD */}
                          <div 
                            onClick={() => { setActiveDrilldown('quotes_converted'); setDrillSubFilter('all'); }}
                            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-500 transition-colors">Converted to Sales</span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                              {m.convertedQuotesCount} Converted
                            </span>
                            <span className="text-[10px] font-mono text-emerald-500 font-bold block">{m.quotationConversionRate}% Success Rate</span>
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">Click for converted →</span>
                          </div>
                        </div>
                      </div>

                      {/* PANEL 2: SALES & TARGET ACHIEVED */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5 gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <DollarSign size={16} className="text-emerald-500" /> Sales & Target Fulfillment
                          </h4>

                          <div className="flex items-center gap-2">
                            {/* Month Select Dropdown for Monthly Target View */}
                            {targetFilter === 'monthly' && (
                              <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[10px] font-black text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm cursor-pointer"
                              >
                                {availableMonths.map(mo => (
                                  <option key={mo.id} value={mo.id}>{mo.label}</option>
                                ))}
                              </select>
                            )}

                            {/* Monthly / Yearly Target Filter Toggle */}
                            <div className="flex items-center bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-[9px] font-black uppercase">
                              <button
                                onClick={(e) => { e.stopPropagation(); setTargetFilter('monthly'); }}
                                className={`px-2 py-0.5 rounded-lg transition-all ${targetFilter === 'monthly' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'}`}
                              >
                                Monthly
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setTargetFilter('yearly'); }}
                                className={`px-2 py-0.5 rounded-lg transition-all ${targetFilter === 'yearly' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'}`}
                              >
                                Yearly
                              </button>
                            </div>
                          </div>
                        </div>

                        <div 
                          onClick={() => { setActiveDrilldown('sales_invoices'); setDrillSubFilter('all'); }}
                          className="space-y-2.5 cursor-pointer p-2.5 rounded-2xl hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all group"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500 flex items-center gap-1 group-hover:text-emerald-600">
                              Total Sales Revenue Closed {targetFilter === 'monthly' && selectedMonth !== 'all' && `(${availableMonths.find(mo => mo.id === selectedMonth)?.label})`} <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-600" />
                            </span>
                            <span className="font-black text-slate-900 dark:text-slate-100 text-sm">₹{activeRevenue.toLocaleString('en-IN')}</span>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                              style={{ width: `${targetAchievementPercent}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span>
                              Target: ₹{targetVal.toLocaleString('en-IN')}{' '}
                              <span className="text-[8px] font-normal uppercase">({targetFilter} • {selectedEmployee.position || selectedEmployee.role || 'Scale'})</span>
                            </span>
                            <span>Avg Deal: ₹{m.averageDealSize.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* PANEL 3: DUAL TASK MANAGEMENT ENGINE */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500" /> Dual Task Engine
                          </h4>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            {m.completedGeneralTasks + m.completedServiceTasks} Resolved
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {/* GENERAL TASKS CARD */}
                          <div 
                            onClick={() => { setActiveDrilldown('general_tasks'); setDrillSubFilter('all'); }}
                            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-500 transition-colors flex items-center gap-1">
                                <Target size={12} className="text-emerald-500" /> General Tasks
                              </span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                              {m.completedGeneralTasks} / {m.totalGeneralTasks}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-bold block">{m.generalTaskCompletionRate}% Completed</span>
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">Click to view tasks →</span>
                          </div>

                          {/* FIELD SERVICE TASKS CARD */}
                          <div 
                            onClick={() => { setActiveDrilldown('service_tasks'); setDrillSubFilter('all'); }}
                            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-amber-500 transition-colors flex items-center gap-1">
                                <Wrench size={12} className="text-amber-500" /> Field Service
                              </span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                              {m.completedServiceTasks} / {m.totalServiceTasks}
                            </span>
                            <span className="text-[10px] text-amber-500 font-bold block">{m.serviceReportsCount} Service Reports</span>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block mt-1">Click for service →</span>
                          </div>
                        </div>
                      </div>

                      {/* PANEL 4: EXPENSES & COMPANY CONTRIBUTION */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <PieChart size={16} className="text-purple-500" /> Financial Expenses & Contribution
                          </h4>
                          <span className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
                            {m.revenueContributionPercent}% Revenue Share
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {/* EXPENSES CARD */}
                          <div 
                            onClick={() => { setActiveDrilldown('expenses'); setDrillSubFilter('all'); }}
                            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-purple-500 transition-colors">Expenses Claimed</span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-purple-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5 block">
                              ₹{m.totalExpensesClaimed.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-emerald-500 font-bold block">Approved: ₹{m.approvedExpenses.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 block mt-1">Click for expense list →</span>
                          </div>

                          {/* GAMIFICATION & ATTENDANCE CARD */}
                          <div 
                            onClick={() => { setActiveDrilldown('gamification'); setDrillSubFilter('all'); }}
                            className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-amber-500 transition-colors">Rank & Attendance</span>
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <span className="text-sm font-black text-amber-500 mt-0.5 block flex items-center gap-1">
                              <Trophy size={14} /> #{m.leaderboardRank} ({m.leaderboardPoints} Pts)
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold block">Attendance: {m.attendancePercentageStr}</span>
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block mt-1">Click for details →</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* DRILL-DOWN VIEWS DETAIL PANELS */}
                  {/* ========================================================================= */}

                  {/* 1. QUOTES GIVEN DRILL-DOWN */}
                  {activeDrilldown === 'quotes_given' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 gap-3">
                        <div>
                          <h4 className="text-sm font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                            Quotes Given ({m.totalQuotesCount} Quotations)
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mt-0.5">
                            Total Quoted Value: ₹{m.totalQuotedAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDrillSubFilter('all')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                          >
                            All ({m.totalQuotesCount})
                          </button>
                          <button
                            onClick={() => setDrillSubFilter('converted')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'converted' ? 'bg-emerald-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                          >
                            Converted ({m.convertedQuotesCount})
                          </button>
                          <button
                            onClick={() => setDrillSubFilter('pending')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'pending' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                          >
                            Pending ({m.totalQuotesCount - m.convertedQuotesCount})
                          </button>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px]">
                                <th className="p-3">Quote Number</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Consignee / Client</th>
                                <th className="p-3">Quoted Amount</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                              {m.quotesGiven
                                .filter(q => {
                                  const st = (q.status || '').toLowerCase();
                                  const isConv = st === 'completed' || st === 'invoiced' || st === 'converted' || st === 'accepted' || st === 'finalized' || st === 'paid' || st === 'approved';
                                  if (drillSubFilter === 'converted') return isConv;
                                  if (drillSubFilter === 'pending') return !isConv;
                                  return true;
                                })
                                .map((q, idx) => (
                                  <tr key={q.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-black text-slate-900 dark:text-slate-100">{q.invoiceNumber || q.id}</td>
                                    <td className="p-3 font-mono text-slate-500">{q.date || '—'}</td>
                                    <td className="p-3 font-bold">{q.customerName || q.consigneeName || '—'}</td>
                                    <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">₹{Number(q.grandTotal || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                                        (q.status || '').toLowerCase() === 'completed' || (q.status || '').toLowerCase() === 'invoiced' || (q.status || '').toLowerCase() === 'converted'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : (q.status || '').toLowerCase() === 'cancelled'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}>
                                        {q.status || 'Pending'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              {m.quotesGiven.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-bold">No quotations found for this employee.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. CONVERTED TO SALES DRILL-DOWN */}
                  {activeDrilldown === 'quotes_converted' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                        <div>
                          <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                            Converted to Sales Quotations
                          </h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                            Total Converted: {m.convertedQuotesCount} Quotes | Success Rate: {m.quotationConversionRate}%
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px]">
                                <th className="p-3">Quote Number</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Consignee / Customer</th>
                                <th className="p-3">Converted Value</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                              {m.quotesConverted.map((q, idx) => (
                                <tr key={q.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 font-black text-slate-900 dark:text-slate-100">{q.invoiceNumber || q.id}</td>
                                  <td className="p-3 font-mono text-slate-500">{q.date || '—'}</td>
                                  <td className="p-3 font-bold">{q.customerName || q.consigneeName || '—'}</td>
                                  <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">₹{Number(q.grandTotal || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-3 text-center">
                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                                      {q.status || 'Invoiced'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {m.quotesConverted.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-bold">No converted quotations found.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. SALES INVOICES & TARGET DRILL-DOWN */}
                  {activeDrilldown === 'sales_invoices' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 gap-3">
                        <div>
                          <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                            Sales & Target Fulfillment Invoices
                          </h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                            Total Revenue Closed: ₹{m.totalSalesRevenue.toLocaleString('en-IN')} | Target ({targetFilter}): ₹{targetVal.toLocaleString('en-IN')} ({targetAchievementPercent}%)
                          </p>
                        </div>
                        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl text-xs font-black border border-emerald-200">
                          <button
                            onClick={() => setTargetFilter('monthly')}
                            className={`px-3 py-1 rounded-lg transition-all ${targetFilter === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                          >
                            Monthly
                          </button>
                          <button
                            onClick={() => setTargetFilter('yearly')}
                            className={`px-3 py-1 rounded-lg transition-all ${targetFilter === 'yearly' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                          >
                            Yearly
                          </button>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px]">
                                <th className="p-3">Invoice Number</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Customer Name</th>
                                <th className="p-3">Grand Total</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                              {m.salesInvoices.map((inv, idx) => (
                                <tr key={inv.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 font-black text-slate-900 dark:text-slate-100">{inv.invoiceNumber || inv.id}</td>
                                  <td className="p-3 font-mono text-slate-500">{inv.date || '—'}</td>
                                  <td className="p-3 font-bold">{inv.customerName || '—'}</td>
                                  <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-3 text-center">
                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                                      {inv.status || 'Completed'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {m.salesInvoices.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-slate-400 font-bold">No sales invoices found for this employee.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. GENERAL TASKS DRILL-DOWN */}
                  {activeDrilldown === 'general_tasks' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 gap-3">
                        <div>
                          <h4 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                            General Tasks ({m.completedGeneralTasks} / {m.totalGeneralTasks} Completed)
                          </h4>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold mt-0.5">
                            Task Execution Rate: {m.generalTaskCompletionRate}%
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDrillSubFilter('all')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            All ({m.totalGeneralTasks})
                          </button>
                          <button
                            onClick={() => setDrillSubFilter('completed')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'completed' ? 'bg-emerald-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            Completed ({m.completedGeneralTasks})
                          </button>
                          <button
                            onClick={() => setDrillSubFilter('pending')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'pending' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            Pending ({m.totalGeneralTasks - m.completedGeneralTasks})
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {m.empGeneralTasks
                          .filter(t => {
                            const st = (t.status || '').toLowerCase();
                            const isDone = st === 'done' || st === 'completed' || st === 'closed' || st === 'finished';
                            if (drillSubFilter === 'completed') return isDone;
                            if (drillSubFilter === 'pending') return !isDone;
                            return true;
                          })
                          .map((t, idx) => {
                            const st = (t.status || '').toLowerCase();
                            const isDone = st === 'done' || st === 'completed' || st === 'closed' || st === 'finished';
                            return (
                              <div key={t.id || idx} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
                                <div className="flex justify-between items-start">
                                  <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">{t.title}</h5>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    {t.status || 'Pending'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                  <span>Priority: {t.priority || 'Medium'}</span>
                                  <span>Category: {t.category || 'General'}</span>
                                </div>
                              </div>
                            );
                          })}
                        {m.empGeneralTasks.length === 0 && (
                          <div className="col-span-2 p-6 text-center text-slate-400 font-bold">No general tasks assigned to this employee.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. FIELD SERVICE TASKS & REPORTS DRILL-DOWN */}
                  {activeDrilldown === 'service_tasks' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 gap-3">
                        <div>
                          <h4 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                            Field Service Tasks & Visit Reports
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                            Service Tasks: {m.completedServiceTasks} / {m.totalServiceTasks} Resolved | Reports Filed: {m.serviceReportsCount}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDrillSubFilter('all')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'all' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            Tasks ({m.totalServiceTasks})
                          </button>
                          <button
                            onClick={() => setDrillSubFilter('reports')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'reports' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            Visit Reports ({m.serviceReportsCount})
                          </button>
                        </div>
                      </div>

                      {drillSubFilter !== 'reports' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {m.empServiceTasks.map((st, idx) => (
                            <div key={(st as any).id || idx} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
                              <div className="flex justify-between items-start">
                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">{(st as any).title || (st as any).ticketNo || 'Service Call'}</h5>
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border bg-amber-50 text-amber-700 border-amber-200">
                                  {(st as any).status || 'Assigned'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold">
                                Customer: {(st as any).customerName || (st as any).hospital || '—'}
                              </div>
                            </div>
                          ))}
                          {m.empServiceTasks.length === 0 && (
                            <div className="col-span-2 p-6 text-center text-slate-400 font-bold">No field service tasks found for this engineer.</div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {m.empServiceReports.map((sr, idx) => (
                            <div key={sr.id || idx} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
                              <div className="flex justify-between items-start">
                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">{sr.customerName || (sr as any).hospital || 'Service Visit'}</h5>
                                <span className="text-[10px] font-mono text-slate-400">{sr.date || '—'}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2">{(sr as any).findings || (sr as any).workDone || (sr as any).remarks || 'Report filed successfully.'}</p>
                            </div>
                          ))}
                          {m.empServiceReports.length === 0 && (
                            <div className="col-span-2 p-6 text-center text-slate-400 font-bold">No service visit reports submitted.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. EXPENSES DRILL-DOWN */}
                  {activeDrilldown === 'expenses' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
                        <div>
                          <h4 className="text-sm font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                            Financial Expense Claims
                          </h4>
                          <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold mt-0.5">
                            Total Claimed: ₹{m.totalExpensesClaimed.toLocaleString('en-IN')} | Approved: ₹{m.approvedExpenses.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px]">
                                <th className="p-3">Date</th>
                                <th className="p-3">Category / Reason</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                              {m.empExpenses.map((exp, idx) => (
                                <tr key={exp.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-3 font-mono text-slate-500">{exp.date || '—'}</td>
                                  <td className="p-3 font-bold">{exp.category || (exp as any).description || 'Expense'}</td>
                                  <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">₹{Number(exp.amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                                      (exp.status || '').toLowerCase() === 'approved' || (exp.status || '').toLowerCase() === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                      {exp.status || 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {m.empExpenses.length === 0 && (
                                <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-bold">No expense claims filed.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7. GAMIFICATION & ATTENDANCE DRILL-DOWN */}
                  {activeDrilldown === 'gamification' && (
                    <div className="space-y-4 animate-in fade-in-50">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 gap-3">
                        <div>
                          <h4 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                            Gamification Rank & Attendance Log
                          </h4>
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                            Rank #{m.leaderboardRank} | Gamification Points: {m.leaderboardPoints} Pts | Attendance: {m.attendancePercentageStr}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDrillSubFilter('points')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter !== 'attendance' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            Point Logs ({m.empPointLogs.length})
                          </button>
                          <button
                            onClick={() => setDrillSubFilter('attendance')}
                            className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all ${drillSubFilter === 'attendance' ? 'bg-amber-600 text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600'}`}
                          >
                            Attendance ({m.empAttendanceRecords.length})
                          </button>
                        </div>
                      </div>

                      {drillSubFilter !== 'attendance' ? (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px]">
                                  <th className="p-3">Date</th>
                                  <th className="p-3">Action / Reason</th>
                                  <th className="p-3 text-right">Points Awarded</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                {m.empPointLogs.map((ph, idx) => (
                                  <tr key={ph.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-mono text-slate-500">{(ph as any).date || (ph as any).timestamp || '—'}</td>
                                    <td className="p-3 font-bold">{(ph as any).action || (ph as any).reason || 'Performance Award'}</td>
                                    <td className="p-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">+{(ph as any).points || 0} Pts</td>
                                  </tr>
                                ))}
                                {m.empPointLogs.length === 0 && (
                                  <tr><td colSpan={3} className="p-6 text-center text-slate-400 font-bold">No point history logs recorded yet.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-black tracking-wider text-[10px]">
                                  <th className="p-3">Date</th>
                                  <th className="p-3">Check In</th>
                                  <th className="p-3">Check Out</th>
                                  <th className="p-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                                {m.empAttendanceRecords.map((ar, idx) => (
                                  <tr key={ar.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-mono text-slate-500">{ar.date || '—'}</td>
                                    <td className="p-3 font-mono">{(ar as any).checkInTime || '—'}</td>
                                    <td className="p-3 font-mono">{(ar as any).checkOutTime || '—'}</td>
                                    <td className="p-3 text-center">
                                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {ar.status || 'Present'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {m.empAttendanceRecords.length === 0 && (
                                  <tr><td colSpan={4} className="p-6 text-center text-slate-400 font-bold">No attendance logs found.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              {activeDrilldown !== 'none' ? (
                <button
                  onClick={() => {
                    setActiveDrilldown('none');
                    setDrillSubFilter('all');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-black text-xs uppercase hover:bg-slate-300 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Overview
                </button>
              ) : <div />}

              <button
                onClick={() => {
                  setSelectedEmployee(null);
                  setActiveDrilldown('none');
                }}
                className="px-6 py-2.5 bg-[#01261d] hover:bg-emerald-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-950/20 transition-all active:scale-95"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEADERBOARD GAMIFICATION RANKINGS */}
      {/* ========================================================================= */}
      {activeTab === 'leaderboard' && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden min-h-[450px]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Award className="text-amber-500" size={18} />
                <h2 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                  Live Gamification Leaderboard
                </h2>
              </div>

              {/* Prize Pool & Scoring Rules */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black shadow-md">
                  <Trophy size={14} />
                  <span>Prize Pool: ₹{prizePool.toLocaleString('en-IN')}</span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setTempPrize(prizePool.toString());
                        setIsEditingPrize(true);
                      }}
                      className="ml-1 p-1 hover:bg-white/20 rounded"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowRules(true)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <Info size={14} /> Rules
                </button>
              </div>
            </div>

            {/* LEADERBOARD TABLE */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-black tracking-widest text-slate-400 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-5 py-3.5 text-center">Rank</th>
                    <th className="px-5 py-3.5">Staff Member</th>
                    <th className="px-5 py-3.5 text-center">Tasks Done</th>
                    <th className="px-5 py-3.5 text-center">Attendance</th>
                    <th className="px-5 py-3.5 text-right pr-8">Performance Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dynamicLeaderboard.map((user, idx) => {
                    const displayRank = user.rank > 0 ? user.rank : idx + 1;
                    const rankStyle = getRankStyle(displayRank);
                    const isCurrentUser = user.id === activeUser?.id;

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isCurrentUser ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 text-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs mx-auto border ${
                              user.isHidden
                                ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                : displayRank === 1
                                ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                                : displayRank === 2
                                ? 'bg-slate-300 text-white border-slate-200 shadow-md'
                                : displayRank === 3
                                ? 'bg-orange-400 text-white border-orange-300 shadow-md'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {user.isHidden ? '—' : displayRank}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-md uppercase">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 text-xs">
                                {user.name}
                                {!user.isHidden && displayRank === 1 && (
                                  <Crown size={14} className="text-amber-500 fill-amber-500" />
                                )}
                                {isCurrentUser && (
                                  <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase">
                                    You
                                  </span>
                                )}
                              </div>
                              {!user.isHidden && (
                                <div
                                  className={`mt-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border inline-flex items-center gap-1 ${rankStyle.bg}`}
                                >
                                  {rankStyle.icon} {rankStyle.label}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-black text-slate-700 dark:text-slate-300">
                          {user.tasks} Tasks
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                            {user.attendance}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right pr-8">
                          <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                            {user.points}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">Pts</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PERFORMANCE LOG & SCORING GUIDE */}
          <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-80 lg:h-auto lg:flex-1 overflow-hidden">
              <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <History size={15} className="text-indigo-500" /> Recent Performance Log
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {pointHistory.length > 0 ? (
                  pointHistory.slice(0, 15).map(item => {
                    const emp = employees.find(e => e.id === item.userId);
                    const empName = emp ? emp.name.split(' ')[0] : 'Unknown';
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-[10px] uppercase">
                            {empName} • {item.category}
                          </span>
                          <span
                            className={`font-black text-[10px] ${
                              item.points > 0 ? 'text-emerald-600' : 'text-rose-500'
                            }`}
                          >
                            {item.points > 0 ? '+' : ''}{item.points} Pts
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">No recent point logs</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Info size={16} className="text-indigo-500" /> Scoring Rules
              </h4>
              <button onClick={() => setShowRules(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">Base Task Completion</span>
                <span className="font-black text-emerald-600">+10 Pts</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">High Priority Bonus</span>
                <span className="font-black text-amber-500">+10 Pts</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">Daily Attendance</span>
                <span className="font-black text-indigo-600">+50 Pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
