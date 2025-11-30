
import React, { useState } from 'react';
import { ServiceTicket, AMCReminder } from '../types';
import { Wrench, Calendar, MapPin, CheckCircle, Clock, AlertTriangle, Cpu } from 'lucide-react';
import { analyzeServiceTicket } from '../geminiService';

const MOCK_TICKETS: ServiceTicket[] = [
  { id: 'T-101', customer: 'Mercy Hospital', equipment: 'Philips MRI 1.5T', issue: 'Helium level warning showing sporadically.', priority: 'High', status: 'Open', assignedTo: 'Tech Mike', dueDate: '2023-10-27', type: 'Breakdown' },
  { id: 'T-102', customer: 'Dr. Reddy Dental', equipment: 'Dental Chair Unit', issue: 'Hydraulic lift stuck.', priority: 'Medium', status: 'In Progress', assignedTo: 'Tech Sarah', dueDate: '2023-10-28', type: 'Breakdown' },
];

const MOCK_AMC: AMCReminder[] = [
  { id: 'A-55', hospital: 'City General', equipment: 'CT Scanner', expiryDate: '2023-10-30', status: 'Expiring Soon' },
  { id: 'A-56', hospital: 'Westview Clinic', equipment: 'X-Ray Machine', expiryDate: '2023-11-15', status: 'Active' },
];

export const ServiceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'amc'>('tickets');
  const [analysis, setAnalysis] = useState<{id: string, text: string} | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const handleAnalyze = async (ticket: ServiceTicket) => {
    setLoadingAnalysis(true);
    setAnalysis(null);
    const result = await analyzeServiceTicket(ticket.issue + " on " + ticket.equipment);
    setAnalysis({ id: ticket.id, text: result });
    setLoadingAnalysis(false);
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-gradient-to-br from-white to-red-50 p-5 rounded-3xl border border-red-100 shadow-sm flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl text-red-600 shadow-sm"><AlertTriangle size={24}/></div>
            <div><div className="text-3xl font-bold text-slate-800">2</div><div className="text-xs font-bold text-red-400 uppercase tracking-wide">Critical Breakdowns</div></div>
        </div>
        <div className="bg-gradient-to-br from-white to-blue-50 p-5 rounded-3xl border border-blue-100 shadow-sm flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl text-blue-600 shadow-sm"><Wrench size={24}/></div>
            <div><div className="text-3xl font-bold text-slate-800">5</div><div className="text-xs font-bold text-blue-400 uppercase tracking-wide">Techs in Field</div></div>
        </div>
        <div className="bg-gradient-to-br from-white to-emerald-50 p-5 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl text-emerald-600 shadow-sm"><Calendar size={24}/></div>
            <div><div className="text-3xl font-bold text-slate-800">12</div><div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">AMC Renewals (Oct)</div></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
        <div className="p-4 border-b border-slate-100">
            <div className="flex bg-slate-100/50 p-1.5 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab('tickets')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tickets' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    Active Tickets
                </button>
                <button 
                    onClick={() => setActiveTab('amc')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'amc' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    AMC Contracts
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 custom-scrollbar">
            {activeTab === 'tickets' ? (
                <div className="space-y-4">
                    {MOCK_TICKETS.map(ticket => (
                        <div key={ticket.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${ticket.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="text-xs font-mono text-slate-400">#{ticket.id}</span>
                                    <span className="text-xs font-bold text-slate-400">• {ticket.type}</span>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800">{ticket.customer} <span className="text-slate-400 font-normal mx-1">|</span> {ticket.equipment}</h3>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{ticket.issue}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg"><MapPin size={14}/> {ticket.assignedTo}</div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg"><Clock size={14}/> Due: {ticket.dueDate}</div>
                                </div>

                                {analysis && analysis.id === ticket.id && (
                                    <div className="mt-4 bg-indigo-50/50 p-4 rounded-2xl text-sm text-indigo-900 border border-indigo-100 animate-in fade-in">
                                        <div className="font-bold flex items-center gap-2 mb-2 text-indigo-700"><Cpu size={16}/> AI Diagnostics</div>
                                        <div className="whitespace-pre-wrap text-xs leading-relaxed opacity-90">{analysis.text}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-between items-end gap-3 pl-4 border-l border-slate-100">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{ticket.status}</span>
                                <button 
                                    onClick={() => handleAnalyze(ticket)}
                                    disabled={loadingAnalysis}
                                    className="text-xs bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 font-bold">
                                    {loadingAnalysis && analysis?.id !== ticket.id ? 'Thinking...' : <><Cpu size={14}/> AI Diagnose</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {MOCK_AMC.map(amc => (
                        <div key={amc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:border-medical-200 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800">{amc.hospital}</h4>
                                    <p className="text-sm text-slate-500 font-medium">{amc.equipment}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-slate-900">{amc.expiryDate}</div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${amc.status === 'Expiring Soon' ? 'text-red-500' : 'text-green-500'}`}>
                                        {amc.status}
                                    </span>
                                </div>
                            </div>
                            <button className="w-full bg-slate-50 border border-slate-200 hover:bg-white hover:border-medical-300 hover:text-medical-700 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                                Create Renewal Quote
                            </button>
                        </div>
                     ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};