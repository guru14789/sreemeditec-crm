
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
  const { userStats, pointHistory } = useData();
  
  const todayStr = new Date().toISOString().split('T')[0];
  const myTasksToday = tasks.filter(t => t.assignedTo === currentUser && t.dueDate === todayStr);
  const pendingTasks = myTasksToday.filter(t => t.status !== 'Done');
  const completedToday = myTasksToday.length - pendingTasks.length;

  return (
    <div className="h-full overflow-y-auto space-y-8 pb-8 pr-1 custom-scrollbar">
      {/* Welcome Section - Aligned for Hierarchy */}
      <div className="flex flex-col items-start gap-4 mt-4 pl-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter uppercase leading-none">
            HELLO, {currentUser.split(' ')[0]}!
          </h1>
          <p className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Shift Active</span>
        </div>
      </div>

      {/* Personal KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Zap size={22} fill="currentColor" />
            </div>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Total Points</p>
          <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">{userStats.points}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
              <CheckCircle2 size={22} />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">Best</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Tasks Completed</p>
          <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">{userStats.tasksCompleted}</h3>
        </div>

        <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
              <Star size={22} />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">App Streak</p>
          <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-1 tracking-tighter">{userStats.attendanceStreak}D</h3>
        </div>

        <div className="bg-[#022c22] p-7 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-950/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Timer size={100} />
          </div>
          <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1 relative z-10">Today's Progress</p>
          <h3 className="text-4xl font-black relative z-10 tracking-tighter">{completedToday}/{myTasksToday.length}</h3>
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
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
              Today's Agenda
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pendingTasks.length} Pending Actions</span>
          </div>
          
          <div className="space-y-3">
            {myTasksToday.length > 0 ? (
              myTasksToday.map(task => (
                <div key={task.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-medical-400 hover:shadow-lg transition-all cursor-pointer">
                  <div className="flex items-start gap-5">
                    <div className={`p-3.5 rounded-2xl shrink-0 transition-colors ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                      {task.status === 'Done' ? <CheckCircle2 size={22} /> : <Clock size={22} />}
                    </div>
                    <div>
                      <h4 className={`font-black text-sm uppercase tracking-tight leading-tight ${task.status === 'Done' ? 'text-slate-300 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <MapPin size={12} className="text-indigo-400" /> {task.locationName || 'Main Office'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border tracking-tighter ${
                          task.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-medical-50 group-hover:text-medical-600 transition-all">
                    <ArrowRight size={20} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 bg-slate-50/50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center px-10">
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
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50">
              <h3 className="font-black text-[10px] text-slate-800 dark:text-slate-100 uppercase tracking-[0.3em] flex items-center gap-2">
                <Star size={16} className="text-amber-500" /> Performance Feed
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {pointHistory.slice(0, 5).map(log => (
                <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center justify-between hover:border-indigo-200 transition-colors">
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

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-950/30 relative overflow-hidden">
            <div className="absolute -bottom-10 -left-10 opacity-10 rotate-12">
              <Target size={150} />
            </div>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                <Zap size={20} className="text-amber-300" fill="currentColor" />
              </div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-3">Tactical Insight</h4>
              <p className="text-sm font-medium text-indigo-100 leading-relaxed italic">
                "Speed determines success. High-priority tasks resolved before 12:00 PM trigger a 1.5x Multiplier."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
