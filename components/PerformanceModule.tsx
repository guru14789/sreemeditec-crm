
import React, { useState } from 'react';
import { Trophy, Star, TrendingUp, Target, Award, Users, CheckCircle, Zap, Crown, Gift, Info, ChevronDown, ChevronUp, History } from 'lucide-react';
import { useData } from './DataContext';

const LEADERBOARD_DATA = [
  { rank: 1, name: 'Rahul Sharma', points: 0, tasks: 45, attendance: '98%', badge: 'gold' }, // Will be overwritten by context
  { rank: 2, name: 'Priya Patel', points: 2100, tasks: 38, attendance: '95%', badge: 'none' },
  { rank: 3, name: 'Mike Ross', points: 1950, tasks: 42, attendance: '92%', badge: 'none' },
  { rank: 4, name: 'Sarah Jenkins', points: 1800, tasks: 35, attendance: '90%', badge: 'none' },
  { rank: 5, name: 'David Kim', points: 1650, tasks: 30, attendance: '88%', badge: 'none' },
];

export const PerformanceModule: React.FC = () => {
  const { userStats, pointHistory } = useData();
  const [showRules, setShowRules] = useState(false);

  // Sync current user (Rahul) with live context stats
  const dynamicLeaderboard = LEADERBOARD_DATA.map(user => {
      if (user.rank === 1) {
          return { ...user, points: userStats.points, tasks: userStats.tasksCompleted };
      }
      return user;
  }).sort((a, b) => b.points - a.points); // Re-sort based on dynamic points

  // Re-assign ranks after sort
  dynamicLeaderboard.forEach((user, index) => {
      user.rank = index + 1;
  });

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* My Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 shrink-0">
          
          {/* Total Points Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Zap size={20} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">My Points</span>
              </div>
              <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{userStats.points}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Leading the chart</p>
              </div>
              <button 
                onClick={() => setShowRules(!showRules)}
                className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 transition-colors"
                title="How points work">
                <Info size={18} />
              </button>
          </div>

          {/* Tasks Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Target size={20} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Tasks</span>
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-800">{userStats.tasksCompleted}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Completed total</p>
              </div>
          </div>

          {/* Attendance Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={20} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Streak</span>
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-800">{userStats.attendanceStreak} Days</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Perfect attendance</p>
              </div>
          </div>

          {/* Prize Card */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-3xl text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500"><Trophy size={80} /></div>
              <div className="relative z-10">
                  <p className="text-xs font-bold text-amber-100 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Gift size={14} /> Monthly Reward
                  </p>
                  <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">₹1,500</span>
                  </div>
                  <div className="mt-3 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm inline-block">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wide flex items-center gap-1">
                        <Crown size={12} fill="currentColor" /> Only 1 Winner
                      </span>
                  </div>
              </div>
          </div>
      </div>

      {/* Rules Accordion / Modal */}
      {showRules && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 shrink-0 animate-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-indigo-900 flex items-center gap-2">
                      <Info size={18} /> Point System Breakdown
                  </h4>
                  <button onClick={() => setShowRules(false)} className="text-indigo-400 hover:text-indigo-700">
                      <ChevronUp size={20} />
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <h5 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Task Completion</h5>
                      <ul className="space-y-1 text-slate-600 text-xs">
                          <li className="flex justify-between"><span>Base Reward</span> <span className="font-bold text-green-600">+10 pts</span></li>
                          <li className="flex justify-between"><span>On-Time Bonus</span> <span className="font-bold text-green-600">+5 pts</span></li>
                          <li className="flex justify-between"><span>High Priority</span> <span className="font-bold text-green-600">+10 pts</span></li>
                      </ul>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <h5 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Attendance</h5>
                      <ul className="space-y-1 text-slate-600 text-xs">
                          <li className="flex justify-between"><span>Early Check-in</span> <span className="font-bold text-green-600">+10 pts</span></li>
                          <li className="flex justify-between"><span>Late Check-in</span> <span className="font-bold text-red-500">-10 pts</span></li>
                          <li className="flex justify-between"><span>Perfect Week</span> <span className="font-bold text-amber-500">+100 pts</span></li>
                      </ul>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-indigo-100">
                      <h5 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">Sales & Billing</h5>
                      <ul className="space-y-1 text-slate-600 text-xs">
                          <li className="flex justify-between"><span>Revenue Gen</span> <span className="font-bold text-green-600">2pts / ₹1k</span></li>
                          <li className="flex justify-between"><span>Lead Won</span> <span className="font-bold text-green-600">+50 pts</span></li>
                      </ul>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[400px]">
          
          {/* Leaderboard Table */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                      <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Award className="text-amber-500" size={20} /> Company Leaderboard
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-1">Real-time rankings</p>
                  </div>
                  <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      Live
                  </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar p-0">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4 w-20 text-center">Rank</th>
                              <th className="px-6 py-4">Employee</th>
                              <th className="px-6 py-4 text-center">Tasks Done</th>
                              <th className="px-6 py-4 text-center">Attendance</th>
                              <th className="px-6 py-4 text-right">Total Points</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {dynamicLeaderboard.map((user) => (
                              <tr key={user.rank} className={`hover:bg-slate-50 transition-colors ${user.rank === 1 ? 'bg-amber-50/30' : ''}`}>
                                  <td className="px-6 py-4 text-center">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mx-auto ${
                                          user.rank === 1 ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 
                                          'bg-slate-100 text-slate-500'
                                      }`}>
                                          {user.rank}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                                              user.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-300'
                                          }`}>
                                              {user.name.charAt(0)}
                                          </div>
                                          <div>
                                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                                  {user.name}
                                                  {user.rank === 1 && (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 animate-pulse">
                                                        <Crown size={10} fill="currentColor"/> Winner
                                                    </span>
                                                  )}
                                              </div>
                                              {user.rank === 1 ? (
                                                  <div className="text-xs text-amber-600 font-bold mt-0.5">Prize: ₹1,500</div>
                                              ) : (
                                                  <div className="text-xs text-slate-400 font-medium">Sales Team</div>
                                              )}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-center font-bold text-slate-600">{user.tasks}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-bold border border-green-100">
                                          {user.attendance}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <span className="text-lg font-black text-indigo-600">{user.points}</span>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Pts</span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Point History Log */}
          <div className="w-full lg:w-80 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden shrink-0">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <History size={18} className="text-slate-400" /> Recent Activity
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {pointHistory.length > 0 ? (
                      pointHistory.map((item) => (
                          <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.points > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <div>
                                  <p className="text-xs font-bold text-slate-700">{item.description}</p>
                                  <div className="flex justify-between items-center mt-1 w-full gap-4">
                                      <span className="text-[10px] text-slate-400">{item.date}</span>
                                      <span className={`text-xs font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                          {item.points > 0 ? '+' : ''}{item.points} pts
                                      </span>
                                  </div>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="text-center text-slate-400 py-8 text-xs">No recent activity.</div>
                  )}
              </div>
          </div>

      </div>
    </div>
  );
};
