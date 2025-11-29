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
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-1">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full text-red-600"><AlertTriangle size={20}/></div>
            <div><div className="text-2xl font-bold">2</div><div className="text-sm text-slate-500">Critical Breakdowns</div></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Wrench size={20}/></div>
            <div><div className="text-2xl font-bold">5</div><div className="text-sm text-slate-500">Techs in Field</div></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600"><Calendar size={20}/></div>
            <div><div className="text-2xl font-bold">12</div><div className="text-sm text-slate-500">AMC Renewals (Oct)</div></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
        <div className="border-b border-slate-100">
            <nav className="flex gap-6 px-6 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('tickets')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tickets' ? 'border-medical-500 text-medical-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    Active Tickets
                </button>
                <button 
                    onClick={() => setActiveTab('amc')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'amc' ? 'border-medical-500 text-medical-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    AMC Contracts
                </button>
            </nav>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
            {activeTab === 'tickets' ? (
                <div className="space-y-4">
                    {MOCK_TICKETS.map(ticket => (
                        <div key={ticket.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ticket.priority === 'High' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                        {ticket.priority}
                                    </span>
                                    <span className="text-xs text-slate-400">#{ticket.id}</span>
                                    <span className="text-xs text-slate-400">• {ticket.type}</span>
                                </div>
                                <h3 className="font-semibold text-slate-800">{ticket.customer} - {ticket.equipment}</h3>
                                <p className="text-sm text-slate-600 mt-1">{ticket.issue}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                                    <div className="flex items-center gap-1"><MapPin size={12}/> {ticket.assignedTo}</div>
                                    <div className="flex items-center gap-1"><Clock size={12}/> Due: {ticket.dueDate}</div>
                                </div>

                                {analysis && analysis.id === ticket.id && (
                                    <div className="mt-3 bg-indigo-50 p-3 rounded text-sm text-indigo-900 border border-indigo-100">
                                        <div className="font-semibold flex items-center gap-1 mb-1"><Cpu size={14}/> AI Diagnostics:</div>
                                        <div className="whitespace-pre-wrap text-xs leading-relaxed">{analysis.text}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col justify-between items-end gap-2">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium">{ticket.status}</span>
                                <button 
                                    onClick={() => handleAnalyze(ticket)}
                                    disabled={loadingAnalysis}
                                    className="text-xs bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50">
                                    {loadingAnalysis && analysis?.id !== ticket.id ? 'Thinking...' : <><Cpu size={12}/> AI Diagnose</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                     {MOCK_AMC.map(amc => (
                        <div key={amc.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <h4 className="font-medium text-slate-800">{amc.hospital}</h4>
                                <p className="text-sm text-slate-500">{amc.equipment}</p>
                            </div>
                            <div className="text-left sm:text-right w-full sm:w-auto">
                                <div className="text-sm font-medium text-slate-900">Expires: {amc.expiryDate}</div>
                                <span className={`text-xs font-medium ${amc.status === 'Expiring Soon' ? 'text-red-600' : 'text-green-600'}`}>
                                    {amc.status}
                                </span>
                            </div>
                            <button className="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-sm">
                                Create Quote
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