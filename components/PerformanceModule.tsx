
import React from 'react';
import { Trophy, Star, TrendingUp, Target, Award, Users, CheckCircle, Zap } from 'lucide-react';

const LEADERBOARD_DATA = [
  { rank: 1, name: 'Rahul Sharma', points: 2450, tasks: 45, attendance: '98%', badge: 'gold' },
  { rank: 2, name: 'Priya Patel', points: 2100, tasks: 38, attendance: '95%', badge: 'silver' },
  { rank: 3, name: 'Mike Ross', points: 1950, tasks: 42, attendance: '92%', badge: 'bronze' },
  { rank: 4, name: 'Sarah Jenkins', points: 1800, tasks: 35, attendance: '90%', badge: 'none' },
  { rank: 5, name: 'David Kim', points: 1650, tasks: 30, attendance: '88%', badge: 'none' },
];

export const PerformanceModule: React.FC = () => {
  const myStats = LEADERBOARD_DATA[0]; // Simulating current user is Rahul

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      
      {/* My Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 shrink-0">
          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-1 rounded-3xl shadow-lg shadow-amber-500/20">
              <div className="bg-white h-full rounded-[20px] p-5 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3 shadow-inner">
                      <Trophy size={32} fill="currentColor" />
                  </div>
                  <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{myStats.points}</h3>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">Total Points</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Target size={20} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Tasks</span>
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-800">{myStats.tasks}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Completed this month</p>
              </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={20} /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Attendance</span>
              </div>
              <div>
                  <h3 className="text-2xl font-black text-slate-800">{myStats.attendance}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">On-time record</p>
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-20"><Zap size={80} /></div>
              <div className="relative z-10">
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Current Rank</p>
                  <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black">#1</span>
                      <span className="text-sm font-bold text-indigo-200">/ 24</span>
                  </div>
                  <div className="mt-3 bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-white h-full w-[95%]"></div>
                  </div>
                  <p className="text-[10px] text-indigo-100 mt-1 font-bold">Top 5% of employees</p>
              </div>
          </div>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                  <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <Award className="text-amber-500" size={20} /> Company Leaderboard
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">Real-time rankings based on performance points</p>
              </div>
              <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  Updated: Just now
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
                      {LEADERBOARD_DATA.map((user) => (
                          <tr key={user.rank} className={`hover:bg-slate-50 transition-colors ${user.rank === 1 ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-6 py-4 text-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mx-auto ${
                                      user.rank === 1 ? 'bg-amber-100 text-amber-700' : 
                                      user.rank === 2 ? 'bg-slate-200 text-slate-700' :
                                      user.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 text-slate-500'
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
                                              {user.rank === 1 && <Trophy size={14} className="text-amber-500" fill="currentColor" />}
                                          </div>
                                          <div className="text-xs text-slate-400 font-medium">Sales Team</div>
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
    </div>
  );
};
