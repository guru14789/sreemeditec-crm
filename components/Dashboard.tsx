import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, Users, Wrench } from 'lucide-react';

const dataSales = [
  { name: 'Mon', sales: 4000 },
  { name: 'Tue', sales: 3000 },
  { name: 'Wed', sales: 2000 },
  { name: 'Thu', sales: 2780 },
  { name: 'Fri', sales: 1890 },
  { name: 'Sat', sales: 2390 },
];

const dataTickets = [
  { name: 'Open', value: 5 },
  { name: 'In Progress', value: 3 },
  { name: 'Resolved', value: 12 },
];

const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

export const Dashboard: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto space-y-6 pr-1 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-slate-800">$124,500</h3>
                </div>
                <div className="bg-green-100 p-3 rounded-full text-green-600">
                    <TrendingUp size={20} />
                </div>
            </div>
            <p className="text-xs text-green-600 mt-2">+12% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Active Leads</p>
                    <h3 className="text-2xl font-bold text-slate-800">42</h3>
                </div>
                <div className="bg-teal-100 p-3 rounded-full text-teal-600">
                    <Users size={20} />
                </div>
            </div>
             <p className="text-xs text-teal-600 mt-2">5 new from IndiaMART</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">Pending Service</p>
                    <h3 className="text-2xl font-bold text-slate-800">8</h3>
                </div>
                <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                    <Wrench size={20} />
                </div>
            </div>
             <p className="text-xs text-orange-600 mt-2">2 High Priority</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500">AMC Expiring</p>
                    <h3 className="text-2xl font-bold text-slate-800">3</h3>
                </div>
                <div className="bg-red-100 p-3 rounded-full text-red-600">
                    <AlertCircle size={20} />
                </div>
            </div>
             <p className="text-xs text-red-600 mt-2">Within 7 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col">
            <h3 className="font-semibold mb-4 text-slate-700 shrink-0">Weekly Sales Performance</h3>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataSales}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="sales" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80 flex flex-col">
            <h3 className="font-semibold mb-4 text-slate-700 shrink-0">Service Ticket Status</h3>
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dataTickets}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {dataTickets.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
             <div className="flex flex-wrap justify-center gap-4 text-xs mt-2 shrink-0">
                {dataTickets.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                        <span>{entry.name} ({entry.value})</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};