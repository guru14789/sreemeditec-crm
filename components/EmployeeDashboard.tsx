
import React from 'react';
import { 
  CheckCircle2, Clock, Zap, Target, 
  Calendar, ArrowRight, ClipboardList, 
  Star, TrendingUp, Timer, MapPin
} from 'lucide-react';
import { useData } from './DataContext';
import { Task } from '../types';

interface EmployeeDashboardProps {
  currentUser: string;
  tasks: Task[];
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ currentUser, tasks }) => {
  const { pointHistory, currentUser: authUser, invoices, userStats } = useData();

  const myPointHistory = React.useMemo(() => 
    pointHistory.filter(p => p.userId === authUser?.id),
  [pointHistory, authUser?.id]);

  const tasksCompletedMonthly = React.useMemo(() => {
    const currentMonthId = new Date().toISOString().slice(0, 7);
    return myPointHistory.filter(p => 
      p.category === 'Task' && 
      p.date?.startsWith(currentMonthId)
    ).length;
  }, [myPointHistory]);

  const myInvoices = React.useMemo(() => {
    return invoices.filter(inv => 
      inv.createdBy === authUser?.name &&
      (inv.documentType === 'Invoice' || !inv.documentType) &&
      inv.status !== 'Draft' &&
      inv.status !== 'Cancelled'
    );
  }, [invoices, authUser?.name]);

  const salesImpact = React.useMemo(() => {
    return myInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }, [myInvoices]);
  
  const totalPoints = React.useMemo(() => 
    myPointHistory.reduce((sum, p) => sum + (p.points || 0), 0),
  [myPointHistory]);

  const todayStr = new Date().toISOString().split('T')[0];
  const myTasksToday = tasks.filter(t => 
    (t.assignedTo || '').toLowerCase() === (currentUser || '').toLowerCase() && 
    t.dueDate === todayStr
  );
  const pendingTasks = myTasksToday.filter(t => t.status !== 'Done');
  const completedToday = myTasksToday.length - pendingTasks.length;

  return (
    <div className="h-full overflow-y-auto space-y-5 pb-8 pr-1 custom-scrollbar">
      {/* Header Toolbar */}
      <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-1 md:m-3 lg:m-4 rounded-[1.5rem] md:rounded-[2rem]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-[1.5rem] md:rounded-[2rem]"></div>
        
        {/* Top Row: Title & Stats */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
            <div className="hidden lg:flex items-center gap-4 group">
                <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                    <ClipboardList size={20} className="hidden xl:block" />
                    <ClipboardList size={16} className="xl:hidden" />
                </div>
                <div className="flex flex-col">
                    <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Task Manager</h2>
                    <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">Track Checklist And Project Items</p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                    <Target size={16} />
                </div>
                <div className="flex flex-col truncate">
                    <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Status</p>
                    <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                        Active Shift
                    </p>
                </div>
            </div>
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 w-full">
            <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-base font-playfair font-bold tracking-tight text-white uppercase leading-none truncate">
                    HELLO, {currentUser.split(' ')[0]}!
                </h1>
                <p className="text-[9px] font-black text-emerald-100/80 uppercase tracking-widest mt-1">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
            </div>
        </div>
      </div>

      {/* Personal KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-gradient-to-br from-emerald-950 to-green-900 m-1 md:m-3 lg:m-4 p-7 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(6,78,59,0.5)] group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(6,78,59,0.6)] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-900/50 text-emerald-100 rounded-[2rem] group-hover:scale-110 transition-transform">
              <Zap size={22} fill="currentColor" />
            </div>
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <p className="text-[10px] font-black text-emerald-100/80 uppercase tracking-[0.15em]">Total Points</p>
 <h3 className="text-4xl font-bold tracking-tight text-white mt-1 tracking-tighter">{totalPoints}</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 m-1 md:m-3 lg:m-4 p-7 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)] group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(16,185,129,0.5)] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-700/50 text-emerald-50 rounded-[2rem] group-hover:scale-110 transition-transform">
              <CheckCircle2 size={22} />
            </div>
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-100/80 px-2 py-0.5 rounded-lg">Best</span>
          </div>
          <p className="text-[10px] font-black text-emerald-100/80 uppercase tracking-[0.15em]">Tasks Completed</p>
 <h3 className="text-4xl font-bold tracking-tight text-white mt-1 tracking-tighter">{tasksCompletedMonthly}</h3>
        </div>

        <div className="bg-gradient-to-br from-[#c5a059] to-[#e5c185] m-1 md:m-3 lg:m-4 p-7 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(197,160,89,0.5)] group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(197,160,89,0.6)] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-900/10 text-amber-950 rounded-[2rem] group-hover:scale-110 transition-transform">
              <TrendingUp size={22} />
            </div>
          </div>
          <p className="text-[10px] font-black text-amber-950/80 uppercase tracking-[0.15em]">Sales Impact</p>
          <h3 className="text-4xl font-playfair font-bold tracking-tight text-amber-950 mt-1 tracking-tighter">
            ₹{(salesImpact / 100000).toFixed(1)}L
          </h3>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 m-1 md:m-3 lg:m-4 p-7 rounded-[2.5rem] text-white shadow-[0_20px_40px_-10px_rgba(15,23,42,0.5)] relative overflow-hidden group hover:scale-[1.02] hover:shadow-[0_25px_45px_-5px_rgba(15,23,42,0.6)] transition-all duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Timer size={100} />
          </div>
          <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1 relative z-10">Today's Progress</p>
 <h3 className="text-4xl font-bold tracking-tight relative z-10 tracking-tighter">{completedToday}/{myTasksToday.length}</h3>
          <div className="mt-5 h-2 bg-white/10 rounded-full overflow-hidden relative z-10 shadow-inner">
            <div 
              className="h-full bg-emerald-400 transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
              style={{ width: `${myTasksToday.length > 0 ? (completedToday / myTasksToday.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-xs md:text-sm text-slate-800 dark:text-slate-100 uppercase tracking-[0.25em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-medical-500"></div>
              Today's Agenda
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingTasks.length} Pending Actions</span>
          </div>
          
          <div className="space-y-3">
            {myTasksToday.length > 0 ? (
              myTasksToday.map(task => (
                <div key={task.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.2rem] border border-slate-300 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-medical-400 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-start gap-5">
                    <div className={`p-3.5 rounded-[2rem] shrink-0 transition-colors ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-300'}`}>
                      {task.status === 'Done' ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                    </div>
                    <div>
                      <h4 className={`font-black text-sm uppercase tracking-tight leading-tight ${task.status === 'Done' ? 'text-slate-300 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <MapPin size={12} className="text-medical-400" /> {task.locationName || 'Main Office'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border tracking-tighter ${
                          task.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-300'
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[2rem] bg-slate-50 dark:bg-slate-800 group-hover:bg-medical-50 group-hover:text-medical-600 transition-all">
                    <ArrowRight size={20} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 bg-slate-50/50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center px-10">
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-xl mb-6">
                  <Calendar size={40} className="text-slate-200" />
                </div>
                <h4 className="font-black text-slate-400 uppercase tracking-[0.2em] text-sm">Registry is clear</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">All tasks synchronized or pending assignment</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Performance & Points */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
              <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-[0.3em] flex items-center gap-2">
                <Star size={16} className="text-amber-500" /> Performance Feed
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {myPointHistory.slice(0, 5).map(log => (
                <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-300 dark:border-slate-800/50 flex items-center justify-between hover:border-medical-200 transition-colors">
                  <div className="min-w-0 pr-4">
                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase truncate leading-tight tracking-tight">{log.description}</p>
                    <p className="text-[8px] font-bold text-slate-300 uppercase mt-1.5 tracking-widest">{log.date}</p>
                  </div>
                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg shrink-0">
                    +{log.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-medical-600 to-medical-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-medical-950/30 relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 opacity-10 rotate-12">
              <Target size={150} />
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-[2rem] flex items-center justify-center mb-4 backdrop-blur-md">
                <Zap size={20} className="text-amber-300" fill="currentColor" />
              </div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-3">Tactical Insight</h4>
              <p className="text-sm font-medium text-medical-100 leading-relaxed italic">
              "Speed determines success. High-priority tasks resolved before 12:00 PM trigger a 1.5x Multiplier."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
