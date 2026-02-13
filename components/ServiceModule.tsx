
import React, { useState } from 'react';
import { ServiceTicket, AMCReminder, ServiceReport } from '../types';
// Fix: Added missing 'Download' icon to imports
import { Wrench, Calendar, MapPin, Clock, AlertTriangle, FileText, Plus, X, Search, CheckCircle, Download } from 'lucide-react';
import { useData } from './DataContext';

export const ServiceModule: React.FC = () => {
  const { serviceTickets, addServiceTicket, updateServiceTicket, clients, products, addClient } = useData();
  const [activeTab, setActiveTab] = useState<'tickets' | 'amc' | 'reports'>('tickets');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [newReport, setNewReport] = useState<Partial<ServiceReport>>({ date: new Date().toISOString().split('T')[0], status: 'Completed' });

  const handleSaveReport = () => {
      if(!newReport.customerName || !newReport.equipmentName) return;

      const report: ServiceReport = {
          id: `SR-${Date.now()}`,
          reportNumber: `SRN-${Date.now().toString().slice(-6)}`,
          date: newReport.date!,
          customerName: newReport.customerName!,
          equipmentName: newReport.equipmentName!,
          problemReported: newReport.problemReported || '',
          actionTaken: newReport.actionTaken || '',
          engineerName: newReport.engineerName || 'Field Tech',
          status: newReport.status as any
      };
      setReports([report, ...reports]);
      setShowReportModal(false);
      setNewReport({ date: new Date().toISOString().split('T')[0], status: 'Completed' });
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto lg:overflow-hidden p-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-sm flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600 shadow-sm"><AlertTriangle size={24}/></div>
            <div><div className="text-3xl font-black text-slate-800">{serviceTickets.filter(t => t.priority === 'High').length}</div><div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Active Breakdowns</div></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 shadow-sm"><Wrench size={24}/></div>
            <div><div className="text-3xl font-black text-slate-800">{serviceTickets.filter(t => t.status !== 'Resolved').length}</div><div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Tickets In Queue</div></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 shadow-sm"><Calendar size={24}/></div>
            <div><div className="text-3xl font-black text-slate-800">12</div><div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AMC Renewals (Oct)</div></div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden min-h-[500px]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setActiveTab('tickets')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tickets' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-400'}`}>Tickets</button>
                <button onClick={() => setActiveTab('amc')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'amc' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-400'}`}>Renewals</button>
                <button onClick={() => setActiveTab('reports')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-400'}`}>Reports</button>
            </div>
            {activeTab === 'reports' && (
                 <button onClick={() => setShowReportModal(true)} className="bg-medical-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Plus size={16} /> New Visit
                </button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-4 custom-scrollbar">
            {activeTab === 'tickets' && (
                <div className="space-y-4">
                    {serviceTickets.map(ticket => (
                        <div key={ticket.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row gap-4 group">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${ticket.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>{ticket.priority} Priority</span>
                                    <span className="text-[10px] font-mono text-slate-300">#{ticket.id}</span>
                                </div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight">{ticket.customer} • {ticket.equipment}</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ticket.issue}</p>
                                <div className="flex items-center gap-4 mt-4 text-[10px] font-black uppercase text-slate-400">
                                    <div className="flex items-center gap-1.5"><MapPin size={12}/> {ticket.assignedTo}</div>
                                    <div className="flex items-center gap-1.5"><Clock size={12}/> Due {ticket.dueDate}</div>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between items-end border-l border-slate-50 pl-4">
                                <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-xl text-[10px] font-black uppercase border border-slate-100">{ticket.status}</span>
                            </div>
                        </div>
                    ))}
                    {serviceTickets.length === 0 && <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest opacity-30 italic">Cloud Job Queue is Empty</div>}
                </div>
            )}
            
            {activeTab === 'reports' && (
                <div className="grid grid-cols-1 gap-4">
                    {reports.map(report => (
                         <div key={report.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl text-medical-600"><FileText size={24}/></div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800 uppercase tracking-tight">{report.customerName}</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{report.equipmentName} • {report.date}</p>
                            </div>
                            <button className="p-2 text-slate-300 hover:text-medical-600"><Download size={20}/></button>
                         </div>
                    ))}
                    {reports.length === 0 && <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest opacity-30 italic">No Visit Reports indexed</div>}
                </div>
            )}
        </div>
      </div>

      {showReportModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2rem]">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Technical Visit Log</h3>
                      <button onClick={() => setShowReportModal(false)}><X size={24} className="text-slate-400"/></button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <input type="text" list="sr-clients" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" value={newReport.customerName || ''} onChange={e => setNewReport({...newReport, customerName: e.target.value})} placeholder="Customer Search *" />
                        <datalist id="sr-clients">{clients.map(c => <option key={c.id} value={c.name}>{c.hospital}</option>)}</datalist>
                        <input type="text" list="sr-products" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold" value={newReport.equipmentName || ''} onChange={e => setNewReport({...newReport, equipmentName: e.target.value})} placeholder="Machine Name *" />
                        <datalist id="sr-products">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
                        <textarea className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold resize-none" rows={3} placeholder="Describe technical actions taken..." value={newReport.actionTaken || ''} onChange={e => setNewReport({...newReport, actionTaken: e.target.value})} />
                  </div>
                  <div className="p-6 border-t border-slate-100 flex gap-3">
                      <button onClick={() => setShowReportModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                      <button onClick={handleSaveReport} className="flex-1 bg-medical-600 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg">Save Report</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
