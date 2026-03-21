
import React, { useState, useMemo } from 'react';
import { Trophy, Star, TrendingUp, Target, Award, CheckCircle, Crown, Info, History, Medal, HelpCircle, X } from 'lucide-react';
import { useData } from './DataContext';


export const PerformanceModule: React.FC = () => {
  const { pointHistory, employees, tasks, currentUser: activeUser } = useData();
  const [showRules, setShowRules] = useState(false);

  // FIX: Dynamic Leaderboard Generation
  // Calculates real-time rankings by summing point history for every employee in the registry.
  const dynamicLeaderboard = useMemo(() => {
      const list = employees.map(emp => {
          const empPoints = pointHistory
              .filter(p => p.userId === emp.id)
              .reduce((sum, p) => sum + p.points, 0);
          
          const empTasks = tasks.filter(t => t.assignedTo === emp.name && t.status === 'Done').length;
          
          return {
              id: emp.id,
              name: emp.name,
              points: empPoints,
              tasks: empTasks,
              attendance: '95%', // Baseline mock for attendance logic
              badge: empPoints > 1000 ? 'gold' : 'none',
              rank: 0 // Placeholder
          };
      });

      // Sort by points descending
      const sorted = [...list].sort((a, b) => b.points - a.points);
      
      // Assign ranks
      return sorted.map((user, index) => ({ ...user, rank: index + 1 }));
  }, [employees, pointHistory, tasks]);

  const top3 = dynamicLeaderboard.slice(0, 3);

  const getRankStyle = (rank: number) => {
    switch(rank) {
        case 1: return { bg: 'bg-amber-100 text-amber-600 border-amber-200', icon: <Trophy size={14} className="fill-current"/>, label: 'Champion', card: 'border-amber-400/50 bg-amber-50/10' };
        case 2: return { bg: 'bg-slate-100 text-slate-500 border-slate-300', icon: <Medal size={14} />, label: 'Runner Up', card: 'border-slate-300/50 bg-slate-50/10' };
        case 3: return { bg: 'bg-orange-100 text-orange-600 border-orange-200', icon: <Award size={14} />, label: 'Top 3', card: 'border-orange-300/50 bg-orange-50/10' };
        default: return { bg: 'bg-slate-50 text-slate-400 border-slate-300', icon: null, label: `#${rank}`, card: 'border-slate-300 bg-white dark:bg-slate-800' };
    }
  };


  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto custom-scrollbar p-2">
      

      {/* Main Leaderboard Content */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden min-h-[450px]">
              <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                      <Award className="text-amber-500" size={18} />
                      <h2 className="font-black text-xs md:text-sm text-slate-800 dark:text-slate-100 uppercase tracking-widest">Team Rankings</h2>
                  </div>
                  <div className="flex items-center gap-3">
                      <button onClick={() => setShowRules(true)} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm">
                          <Info size={14} /> Rules
                      </button>
                      <div className="flex items-center gap-1.5 ml-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Updates</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  {/* MOBILE VIEW */}
                  <div className="lg:hidden space-y-4">
                      <div className="flex items-end justify-center gap-2 px-2 pt-12 pb-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-300 dark:border-slate-800/50 mb-2 shadow-inner">
                          {/* 2nd Place */}
                          <div className="flex flex-col items-center flex-1">
                              <div className="relative mb-2">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-xl text-slate-400 border-2 border-white dark:border-slate-600 shadow-sm uppercase">
                                      {top3[1]?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="absolute -top-1 -right-1 bg-slate-400 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">2</div>
                              </div>
                              <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate w-full text-center">{top3[1]?.name.split(' ')[0] || '---'}</p>
                              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{top3[1]?.points || 0}</p>
                          </div>
                          
                          {/* 1st Place */}
                          <div className="flex flex-col items-center flex-1 transform scale-110 pb-1">
                              <div className="relative mb-2">
                                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-amber-500">
                                      <Crown size={28} fill="currentColor" className="drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)] animate-pulse" />
                                  </div>
                                  <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-black text-2xl text-white border-2 border-white dark:border-slate-800 shadow-xl shadow-orange-500/20 uppercase relative z-10">
                                      {top3[0]?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-sm z-20">1</div>
                              </div>
                              <p className="text-[11px] font-black text-slate-900 dark:text-white truncate w-full text-center">{top3[0]?.name.split(' ')[0] || '---'}</p>
                              <p className="text-[11px] font-black text-orange-600 dark:text-orange-400 mt-0.5">{top3[0]?.points || 0}</p>
                          </div>

                          {/* 3rd Place */}
                          <div className="flex flex-col items-center flex-1">
                              <div className="relative mb-2">
                                  <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center font-black text-xl text-orange-600 border-2 border-white dark:border-slate-700 shadow-sm uppercase">
                                      {top3[2]?.name.charAt(0) || '?'}
                                  </div>
                                  <div className="absolute -top-1 -right-1 bg-orange-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">3</div>
                              </div>
                              <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate w-full text-center">{top3[2]?.name.split(' ')[0] || '---'}</p>
                              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{top3[2]?.points || 0}</p>
                          </div>
                      </div>

                      <div className="space-y-2.5 pb-4">
                          {dynamicLeaderboard.map((user) => {
                              const isCurrentUser = user.id === activeUser?.id;
                              return (
                                  <div key={user.id} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isCurrentUser ? 'bg-indigo-50/50 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-800 ring-2 ring-indigo-500/10 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm'}`}>
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                          user.rank === 1 ? 'bg-amber-100 text-amber-700' : 
                                          user.rank === 2 ? 'bg-slate-100 text-slate-600' :
                                          user.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                          'bg-slate-50 text-slate-400'
                                      }`}>
                                          {user.rank}
                                      </div>
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-sm shrink-0 uppercase">
                                          {user.name.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                              <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                                              {isCurrentUser && <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">You</span>}
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[9px] font-bold text-slate-400 uppercase">{user.tasks} Tasks</span>
                                              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                              <span className="text-[9px] font-bold text-emerald-500 uppercase">{user.attendance} Attnd.</span>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{user.points}</p>
                                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Points</p>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  {/* DESKTOP VIEW */}
                  <table className="hidden lg:table w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-300 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                          <tr>
                              <th className="px-8 py-5 w-24 text-center">Rank</th>
                              <th className="px-8 py-5">Staff Member</th>
                              <th className="px-8 py-5 text-center">Tasks Done</th>
                              <th className="px-8 py-5 text-center">Attendance</th>
                              <th className="px-8 py-5 text-right pr-12">Performance Points</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {dynamicLeaderboard.map((user) => {
                              const rankStyle = getRankStyle(user.rank);
                              const isCurrentUser = user.id === activeUser?.id;
                              
                              return (
                                  <tr key={user.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isCurrentUser ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''}`}>
                                      <td className="px-8 py-6 text-center">
                                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base mx-auto border-2 ${
                                              user.rank === 1 ? 'bg-amber-500 text-white border-white shadow-lg shadow-amber-500/20' : 
                                              user.rank === 2 ? 'bg-slate-300 text-white border-white shadow-lg shadow-slate-300/20' :
                                              user.rank === 3 ? 'bg-orange-400 text-white border-white shadow-lg shadow-orange-400/20' :
                                              'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                                          }`}>
                                              {user.rank}
                                          </div>
                                      </td>
                                      <td className="px-8 py-6">
                                          <div className="flex items-center gap-4">
                                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-inner uppercase ${
                                                  user.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                              }`}>
                                                  {user.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <div className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                      {user.name}
                                                      {user.rank === 1 && <span className="text-amber-500"><Crown size={14} fill="currentColor"/></span>}
                                                      {isCurrentUser && <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-tighter">You</span>}
                                                  </div>
                                                  <div className={`mt-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5 ${rankStyle.bg}`}>
                                                      {rankStyle.icon} {rankStyle.label}
                                                  </div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-8 py-6 text-center font-black text-slate-600 dark:text-slate-400">{user.tasks}</td>
                                      <td className="px-8 py-6 text-center">
                                          <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl text-[10px] font-black border border-emerald-100 dark:border-emerald-800">
                                              {user.attendance}
                                          </span>
                                      </td>
                                      <td className="px-8 py-6 text-right pr-12">
                                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{user.points}</span>
                                          <span className="text-[10px] text-slate-400 font-black uppercase ml-2 tracking-tighter">Pts</span>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Side Panel: Log */}
          <div className="w-full lg:w-80 flex flex-col gap-5 shrink-0">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden h-[350px] lg:h-auto lg:flex-1">
                  <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 shrink-0">
                      <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase text-[10px] tracking-widest">
                          <History size={16} className="text-slate-400" /> Performance Log
                      </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {pointHistory.length > 0 ? (
                          pointHistory.map((item) => (
                              <div key={item.id} className="p-4 rounded-2xl border border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all">
                                  <div className="flex gap-3">
                                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${item.points > 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`}></div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 leading-tight uppercase tracking-tight line-clamp-2">{item.description}</p>
                                          <div className="flex justify-between items-center mt-2.5">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase">{item.date}</span>
                                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${item.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                                                  {item.points > 0 ? '+' : ''}{item.points} PTS
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
                              <History size={40} className="mb-2 text-slate-200" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Registry is Empty</p>
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden shrink-0">
                   <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                        <HelpCircle size={100} />
                   </div>
                   <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-indigo-100">
                        <Star size={14} className="fill-current" /> Scoring System Guide
                   </h3>
                   <div className="space-y-4 relative z-10">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-white/10 rounded-lg text-indigo-100 shrink-0 mt-0.5"><Target size={14}/></div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-tight">Workflows & Tasks</p>
                                <p className="text-[10px] text-indigo-100/70 font-bold leading-tight mt-0.5">+10 Base Completion<br/>+5 On-Time Bonus<br/>+10 High Priority</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-white/10 rounded-lg text-indigo-100 shrink-0 mt-0.5"><CheckCircle size={14}/></div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-tight">Attendance Sync</p>
                                <p className="text-[10px] text-indigo-100/70 font-bold leading-tight mt-0.5">+10 Early Check-in<br/>-10 Late Check-in<br/>+100 Perfect 7D Streak</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-white/10 rounded-lg text-indigo-100 shrink-0 mt-0.5"><TrendingUp size={14}/></div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-tight">Sales & Revenue</p>
                                <p className="text-[10px] text-indigo-100/70 font-bold leading-tight mt-0.5">2 PTS per ₹1k Revenue<br/>+50 Lead Converted</p>
                            </div>
                        </div>
                   </div>
              </div>
          </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h4 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs flex items-center gap-2">
                          <Info size={16} className="text-indigo-500" /> Point Criteria
                      </h4>
                      <button onClick={() => setShowRules(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                          <h5 className="font-black text-indigo-900 dark:text-indigo-300 text-[10px] uppercase mb-4 tracking-widest border-b border-indigo-100 dark:border-indigo-800 pb-2">Workflow & Tasks</h5>
                          <ul className="space-y-3 text-xs">
                              <li className="flex justify-between font-bold items-center"><span className="text-slate-600 dark:text-slate-400">Task Milestone</span> <span className="text-emerald-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">+10 pts</span></li>
                              <li className="flex justify-between font-bold items-center"><span className="text-slate-600 dark:text-slate-400">High Priority Bonus</span> <span className="text-emerald-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">+10 pts</span></li>
                              <li className="flex justify-between font-bold items-center"><span className="text-slate-600 dark:text-slate-400">Early Completion</span> <span className="text-emerald-600 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg">+5 pts</span></li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
