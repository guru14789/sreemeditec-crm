import React, { useState, useMemo } from 'react';
import { Trophy, Star, Target, Award, CheckCircle, Crown, Info, History, Medal, HelpCircle, X, PartyPopper, Clock, Edit2 } from 'lucide-react';
import { useData } from './DataContext';
import ReactConfetti from 'react-confetti';


export const PerformanceModule: React.FC = () => {
  const { 
    pointHistory, 
    employees, 
    tasks, 
    currentUser: activeUser,
    attendanceRecords,
    holidays,
    prizePool,
    updatePrizePool
  } = useData();
  
  const [showRules, setShowRules] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isEditingPrize, setIsEditingPrize] = useState(false);
  const [tempPrize, setTempPrize] = useState('');
  const isAdmin = activeUser?.role === 'SYSTEM_ADMIN' || activeUser?.email === 'sreekumar.career@gmail.com';

  // FIX: Dynamic Leaderboard Generation
  // Calculates real-time rankings by summing point history for the CURRENT month only.
  const dynamicLeaderboard = useMemo(() => {
      const currentMonthId = new Date().toISOString().slice(0, 7);
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const todayDate = today.getDate();

      // Calculate working days in current month so far (Excluding Sundays and Holidays)
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

      // Split visible and hidden
      const visibleList = list.filter(u => !u.isHidden);
      const hiddenList = list.filter(u => u.isHidden);

      // Sort visible ones to assign their ranks
      const sortedVisible = [...visibleList].sort((a, b) => b.points - a.points);
      const rankedVisible = sortedVisible.map((user, index) => ({ ...user, rank: index + 1 }));

      // Hidden ones are not ranked (rank remains 0)
      const rankedHidden = hiddenList.map(user => ({ ...user, rank: 0 }));

      // Merge and sort everything by points descending for display
      const combined = [...rankedVisible, ...rankedHidden].sort((a, b) => b.points - a.points);
      return combined;
  }, [employees, pointHistory, tasks, activeUser]);

  const top3 = dynamicLeaderboard.filter(u => !u.isHidden).slice(0, 3);

  const getRankStyle = (rank: number) => {
    switch(rank) {
        case 1: return { bg: 'bg-amber-100 text-amber-600 border-amber-200', icon: <Trophy size={14} className="fill-current"/>, label: 'Champion', card: 'border-amber-400/50 bg-amber-50/10' };
        case 2: return { bg: 'bg-slate-100 text-slate-500 border-slate-300', icon: <Medal size={14} />, label: 'Runner Up', card: 'border-slate-300/50 bg-slate-50/10' };
        case 3: return { bg: 'bg-orange-100 text-orange-600 border-orange-200', icon: <Award size={14} />, label: 'Top 3', card: 'border-orange-300/50 bg-orange-50/10' };
        default: return { bg: 'bg-slate-50 text-slate-400 border-slate-300', icon: null, label: `#${rank}`, card: 'border-slate-300 bg-white dark:bg-slate-800' };
    }
  };


  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 overflow-y-auto custom-scrollbar p-0 md:p-1 relative">
      {showConfetti && <ReactConfetti numberOfPieces={200} recycle={false} style={{ position: 'fixed', zIndex: 1000 }} />}
      
      {/* Header Section */}
      <div className="hidden md:flex bg-gradient-to-br from-emerald-950 to-green-900 flex-col md:flex-row justify-between items-center gap-6 m-1 md:m-3 lg:m-4 p-6 lg:pr-24 rounded-[36px] shadow-[0_30px_60px_-15px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="hidden md:flex items-center gap-5 relative z-10 w-full md:w-auto">
          <div className="w-14 h-14 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Leaderboard</h2>
            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">Employee Gamification Metrics</p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto relative z-10">
            <div className={`flex shrink-0 items-center gap-2.5 px-5 py-2.5 rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-500 to-orange-500 shadow-[0_8px_20px_-6px_rgba(245,158,11,0.6)] transition-all group relative overflow-hidden`}>
               <div className="absolute top-0 right-0 p-1 opacity-20"><Trophy size={32} /></div>
               <div className="text-white relative z-10 flex items-center gap-3">
                   <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-100 leading-none mb-1.5">Prize Pool</p>
                     {isEditingPrize ? (
                       <div className="flex items-center gap-1">
                          <span className="text-sm font-black">₹</span>
                          <input 
                             autoFocus
                             type="number" 
                             className="bg-white/20 border-b border-white/40 text-sm font-black outline-none w-20 text-white placeholder:text-white/50"
                             value={tempPrize}
                             onChange={(e) => setTempPrize(e.target.value)}
                             onKeyDown={(e) => {
                                 if (e.key === 'Enter') { updatePrizePool(Number(tempPrize)); setIsEditingPrize(false); }
                                 if (e.key === 'Escape') setIsEditingPrize(false);
                             }}
                          />
                       </div>
                     ) : (
                       <div className="flex items-baseline gap-1">
                         <span className="text-lg font-black tracking-tight leading-none">₹{prizePool.toLocaleString('en-IN')}</span>
                         {isAdmin && (
                           <button type="button" onClick={() => { setTempPrize(prizePool.toString()); setIsEditingPrize(true); }} className="p-1 hover:bg-white/20 rounded ml-1 transition-colors"><Edit2 size={12} /></button>
                         )}
                       </div>
                     )}
                   </div>
               </div>
            </div>

            <button onClick={() => setShowRules(true)} className="flex-1 sm:flex-none px-6 py-3.5 md:py-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 rounded-[2rem] font-black text-[10px] md:text-[11px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_-6px_rgba(197,160,89,0.6)] active:scale-95 border border-[#d4af37]/50">
                <Info size={16} /> Scoring Rules
            </button>
            {isAdmin && (
                <button 
                  onClick={() => {
                      setShowConfetti(true);
                      setTimeout(() => setShowConfetti(false), 5000);
                  }}
                  className="flex-1 sm:flex-none px-6 py-3.5 md:py-4 bg-white text-emerald-700 rounded-[2rem] font-black text-[10px] md:text-[11px] uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 group"
                >
                    <PartyPopper size={16} className="group-hover:rotate-12 transition-transform" /> Test Celebration
                </button>
            )}
        </div>
      </div>

      {/* Main Leaderboard Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-white dark:bg-slate-900 md:rounded-3xl shadow-sm md:border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden min-h-[450px]">
              <div className="px-4 py-3 md:px-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                      <Award className="text-amber-500" size={16} />
                      <h2 className="font-black text-[11px] text-slate-800 dark:text-slate-100 uppercase tracking-widest">Team Rankings</h2>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 ml-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live Updates</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-2">
                  {/* MOBILE VIEW */}
                  <div className="lg:hidden space-y-2">
                      <div className="flex items-end justify-center gap-1.5 px-2 pt-6 pb-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-300 dark:border-slate-800/50 mb-1 shadow-inner">
                          {/* 2nd Place */}
                          <div className="flex flex-col items-center flex-1">
                              <div className="relative mb-1.5">
                                  <div className="w-10 h-10 rounded-[1.5rem] bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-playfair font-bold text-base tracking-tight text-slate-400 border-2 border-white dark:border-slate-600 shadow-sm uppercase">
                                      {top3[1]?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="absolute -top-1 -right-1 bg-slate-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-white shadow-sm">2</div>
                              </div>
                              <p className="text-[8px] font-black text-slate-700 dark:text-slate-300 truncate w-full text-center">{top3[1]?.name.split(' ')[0] || '---'}</p>
                              <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{top3[1]?.points || 0}</p>
                          </div>
                          
                          {/* 1st Place */}
                          <div className="flex flex-col items-center flex-1 transform scale-110 pb-1">
                              <div className="relative mb-1.5">
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500">
                                      <Crown size={20} fill="currentColor" className="drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)] animate-pulse" />
                                  </div>
                                  <div className="w-12 h-12 rounded-[1.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-playfair font-bold text-lg tracking-tight text-white border-2 border-white dark:border-slate-800 shadow-xl shadow-orange-500/20 uppercase relative z-10">
                                      {top3[0]?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="absolute -top-1 -right-1 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-white shadow-sm z-20">1</div>
                              </div>
                              <p className="text-[9px] font-black text-slate-900 dark:text-white truncate w-full text-center">{top3[0]?.name.split(' ')[0] || '---'}</p>
                              <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 mt-0.5">{top3[0]?.points || 0}</p>
                          </div>

                          {/* 3rd Place */}
                          <div className="flex flex-col items-center flex-1">
                              <div className="relative mb-1.5">
                                  <div className="w-10 h-10 rounded-[1.5rem] bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center font-playfair font-bold text-base tracking-tight text-orange-600 border-2 border-white dark:border-slate-700 shadow-sm uppercase">
                                      {top3[2]?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="absolute -top-1 -right-1 bg-orange-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border border-white shadow-sm">3</div>
                              </div>
                              <p className="text-[8px] font-black text-slate-700 dark:text-slate-300 truncate w-full text-center">{top3[2]?.name.split(' ')[0] || '---'}</p>
                              <p className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{top3[2]?.points || 0}</p>
                          </div>
                      </div>

                      <div className="space-y-1.5 pb-4">
                          {dynamicLeaderboard.map((user) => {
                              const isCurrentUser = user.id === activeUser?.id;
                              return (
                                  <div key={user.id} className={`flex items-center gap-2 p-2.5 rounded-[1.25rem] border transition-all ${isCurrentUser ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800 ring-1 ring-indigo-500/10 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'}`}>
                                      <div className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] shrink-0 ${
                                          user.isHidden ? 'bg-slate-50 text-slate-400' :
                                          user.rank === 1 ? 'bg-amber-100 text-amber-700' : 
                                          user.rank === 2 ? 'bg-slate-100 text-slate-600' :
                                          user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                          'bg-slate-50 text-slate-400'
                                      }`}>
                                          {user.isHidden ? '—' : user.rank}
                                      </div>
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-xs shrink-0 uppercase">
                                          {user.name.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1 flex-wrap">
                                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate leading-none">{user.name}</p>
                                              {isCurrentUser && <span className="text-[7px] bg-indigo-600 text-white px-1 py-0.5 rounded uppercase font-black tracking-tighter">You</span>}
                                              {user.isHidden && <span className="text-[7px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded uppercase font-black tracking-tighter">Hidden</span>}
                                          </div>
                                          <div className="flex items-center gap-1.5 mt-1">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">{user.tasks} Tasks</span>
                                              <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                                              <span className="text-[8px] font-bold text-emerald-500 uppercase leading-none">{user.attendance} Attnd.</span>
                                          </div>
                                      </div>
                                      <div className="text-right shrink-0 pr-1">
                                          <p className="text-[13px] font-black tracking-tight text-indigo-600 dark:text-indigo-400 leading-none">{user.points}</p>
                                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-0.5">Points</p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* DESKTOP VIEW */}
                  <table className="hidden lg:table w-full text-left text-[11px] text-slate-600">
                      <thead className="bg-[#fcfdfd] dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-800 text-[9px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                              <th className="px-5 py-3 w-20 text-center">Rank</th>
                              <th className="px-5 py-3">Staff Member</th>
                              <th className="px-5 py-3 text-center">Tasks Done</th>
                              <th className="px-5 py-3 text-center">Attendance</th>
                              <th className="px-5 py-3 text-right pr-10">Performance Points</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {dynamicLeaderboard.map((user) => {
                              const rankStyle = getRankStyle(user.rank);
                              const isCurrentUser = user.id === activeUser?.id;
                              
                              return (
                                  <tr key={user.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${isCurrentUser ? 'bg-indigo-50/10 dark:bg-indigo-900/5' : ''} cursor-default`}>
                                      <td className="px-5 py-3 text-center">
                                          <div className={`w-8 h-8 rounded-[2rem] flex items-center justify-center font-black text-sm mx-auto border ${
                                              user.isHidden ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700' :
                                              user.rank === 1 ? 'bg-amber-500 text-white border-white shadow-lg shadow-amber-500/10' : 
                                              user.rank === 2 ? 'bg-slate-300 text-white border-white shadow-lg shadow-slate-300/10' :
                                              user.rank === 3 ? 'bg-orange-400 text-white border-white shadow-lg shadow-orange-400/10' :
                                              'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                          }`}>
                                              {user.isHidden ? '—' : user.rank}
                                          </div>
                                      </td>
                                      <td className="px-5 py-3">
                                          <div className="flex items-center gap-3">
                                              <div className={`w-10 h-10 rounded-[2rem] flex items-center justify-center font-playfair font-bold text-lg tracking-tight tracking-tight text-white shadow-inner uppercase ${
                                                  !user.isHidden && user.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                              }`}>
                                                  {user.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 text-[12px] leading-none">
                                                      {user.name}
                                                      {!user.isHidden && user.rank === 1 && <span className="text-amber-500"><Crown size={12} fill="currentColor"/></span>}
                                                      {isCurrentUser && <span className="text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">You</span>}
                                                      {user.isHidden && <span className="text-[8px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Hidden</span>}
                                                  </div>
                                                  {!user.isHidden && (
                                                      <div className={`mt-1 px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5 ${rankStyle.bg}`}>
                                                          {rankStyle.icon} {rankStyle.label}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-5 py-3 text-center font-black text-slate-600 dark:text-slate-400">{user.tasks}</td>
                                      <td className="px-5 py-3 text-center">
                                          <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-[9px] font-black border border-emerald-100 dark:border-emerald-800">
                                              {user.attendance}
                                          </span>
                                      </td>
                                      <td className="px-5 py-3 text-right pr-10">
 <span className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">{user.points}</span>
                                          <span className="text-[9px] text-slate-400 font-black uppercase ml-1.5 tracking-tighter">Pts</span>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Side Panel: Log */}
          <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden h-[350px] lg:h-auto lg:flex-1">
                  <div className="px-5 py-3 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 shrink-0">
                      <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase text-[9px] tracking-widest">
                          <History size={14} className="text-slate-400" /> Performance Log
                      </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                      {pointHistory.length > 0 ? (
                          pointHistory.map((item) => {
                              const emp = employees.find(e => e.id === item.userId);
                              const empName = emp ? emp.name.split(' ')[0] : 'Unknown';
                              return (
                                  <div key={item.id} className="p-3 bg-slate-50/30 dark:bg-slate-800/20 rounded-[2rem] border border-slate-200/50 dark:border-slate-800/80 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all">
                                      <div className="flex gap-2.5">
                                          <div className={`mt-1 w-1 h-8 rounded-full shrink-0 ${item.points > 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'}`}></div>
                                          <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between mb-1.5">
                                                  <span className="text-[8px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md tracking-wider border border-indigo-100/50">
                                                      {empName} · {item.category}
                                                  </span>
                                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${item.points > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/20'}`}>
                                                      {item.points > 0 ? '+' : ''}{item.points} Pts
                                                  </span>
                                              </div>
                                              <p className="text-[9.5px] font-bold text-slate-700 dark:text-slate-200 leading-normal lowercase tracking-tight line-clamp-3 first-letter:uppercase">{item.description}</p>
                                              <p className="text-[7.5px] font-bold text-slate-400 uppercase mt-2">
                                                  {(() => {
                                                      if (!item.date) return '—';
                                                      // Parse any ISO or standard date formats
                                                      const d = new Date(item.date);
                                                      if (!isNaN(d.getTime())) {
                                                          return d.toLocaleString('en-US', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                              second: '2-digit',
                                                              hour12: true
                                                          });
                                                      }
                                                      return item.date;
                                                  })()}
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
                              <History size={32} className="mb-2 text-slate-200" />
                              <p className="text-[9px] font-black uppercase tracking-widest">Registry is Empty</p>
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-6 text-slate-900 shadow-xl shadow-slate-200/50 relative overflow-hidden shrink-0 border border-slate-200">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                   <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full translate-y-12 -translate-x-12 blur-2xl"></div>
                   
                   <h3 className="font-black text-[10px] uppercase tracking-[0.3em] mb-6 flex items-center gap-2.5 text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"></div>
                        Scoring Guide
                   </h3>
                   
                   <div className="space-y-5 relative z-10">
                        <div className="flex items-start gap-4 group/item">
                            <div className="w-9 h-9 bg-slate-50 rounded-[2rem] flex items-center justify-center text-indigo-500 border border-slate-100 group-hover/item:border-indigo-500/30 transition-colors shrink-0">
                                <Target size={18}/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">Tasks Matrix</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-slate-500">Base Rate</span>
                                    <span className="text-[10px] font-black text-emerald-600">+10</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-500">High Priority</span>
                                    <span className="text-[10px] font-black text-amber-600">+10</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                    <span className="text-[9px] font-bold text-slate-500">Overdue Penalty</span>
                                    <span className="text-[10px] font-black text-rose-500">-5</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 group/item">
                            <div className="w-9 h-9 bg-slate-50 rounded-[2rem] flex items-center justify-center text-emerald-500 border border-slate-100 group-hover/item:border-emerald-500/30 transition-colors shrink-0">
                                <CheckCircle size={18}/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-wider text-slate-800">Attendance</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-slate-500">Early Check-in</span>
                                    <span className="text-[10px] font-black text-emerald-600">+10</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-500">Daily Shift</span>
                                    <span className="text-[10px] font-black text-indigo-600">+50</span>
                                </div>
                            </div>
                        </div>
                   </div>
              </div>
          </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95">
                  <div className="p-4 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[10px] flex items-center gap-2">
                          <Info size={14} className="text-indigo-500" /> Point Criteria
                      </h4>
                      <button onClick={() => setShowRules(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar">
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                           <h5 className="font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                               <Target size={14} className="text-indigo-500" /> Task Performance
                           </h5>
                           <div className="space-y-3">
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Completion</span>
                                   <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">+10 Points</span>
                               </div>
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High Priority Bonus</span>
                                   <span className="text-[11px] font-black text-amber-500">+10 Points</span>
                               </div>
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm opacity-60">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overdue Penalty</span>
                                   <span className="text-[11px] font-black text-rose-500">-5 Points</span>
                               </div>
                           </div>

                           <h5 className="font-black text-slate-800 dark:text-slate-200 text-[11px] uppercase mt-8 mb-4 tracking-[0.2em] flex items-center gap-2">
                               <Clock size={14} className="text-emerald-500" /> Attendance Rewards
                           </h5>
                           <div className="space-y-3">
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Early Check-in</span>
                                   <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">+10 Points</span>
                               </div>
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Shift Completed</span>
                                   <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">+50 Points</span>
                               </div>
                           </div>
                       </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
