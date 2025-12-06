


import React, { useState } from 'react';
import { ServiceTicket, AMCReminder, ServiceReport } from '../types';
import { Wrench, Calendar, MapPin, Clock, AlertTriangle, FileText, Plus, X, Search, CheckCircle } from 'lucide-react';
import { useData } from './DataContext';

const MOCK_TICKETS: ServiceTicket[] = [
  { id: 'T-101', customer: 'Mercy Hospital', equipment: 'Philips MRI 1.5T', issue: 'Helium level warning showing sporadically.', priority: 'High', status: 'Open', assignedTo: 'Tech Mike', dueDate: '2023-10-27', type: 'Breakdown' },
  { id: 'T-102', customer: 'Dr. Reddy Dental', equipment: 'Dental Chair Unit', issue: 'Hydraulic lift stuck.', priority: 'Medium', status: 'In Progress', assignedTo: 'Tech Sarah', dueDate: '2023-10-28', type: 'Breakdown' },
];

const MOCK_AMC: AMCReminder[] = [
  { id: 'A-55', hospital: 'City General', equipment: 'CT Scanner', expiryDate: '2023-10-30', status: 'Expiring Soon' },
  { id: 'A-56', hospital: 'Westview Clinic', equipment: 'X-Ray Machine', expiryDate: '2023-11-15', status: 'Active' },
];

export const ServiceModule: React.FC = () => {
  const { clients, products, addClient } = useData();
  const [activeTab, setActiveTab] = useState<'tickets' | 'amc' | 'reports'>('tickets');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [newReport, setNewReport] = useState<Partial<ServiceReport>>({
      date: new Date().toISOString().split('T')[0],
      status: 'Completed'
  });

  const handleSaveReport = () => {
      if(!newReport.customerName || !newReport.equipmentName) {
          alert("Please fill customer and equipment details");
          return;
      }

      // Check for new client
      const existingClient = clients.find(c => c.name === newReport.customerName);
      if (!existingClient) {
          addClient({
              id: `CLI-${String(clients.length + 1).padStart(3, '0')}`,
              name: newReport.customerName,
              hospital: '', 
              address: '',
              gstin: ''
          });
      }

      const report: ServiceReport = {
          id: `SR-${Date.now()}`,
          date: newReport.date!,
          customerName: newReport.customerName,
          equipmentName: newReport.equipmentName,
          problemReported: newReport.problemReported || '',
          actionTaken: newReport.actionTaken || '',
          engineerName: newReport.engineerName || 'Current User',
          status: newReport.status as any
      };
      setReports([report, ...reports]);
      setShowReportModal(false);
      setNewReport({ date: new Date().toISOString().split('T')[0], status: 'Completed' });
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
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
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
                <button 
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                    Service Reports
                </button>
            </div>
            {activeTab === 'reports' && (
                 <button 
                    onClick={() => setShowReportModal(true)}
                    className="bg-medical-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                    <Plus size={16} /> New Report
                </button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 custom-scrollbar">
            {activeTab === 'tickets' && (
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
                            </div>
                            <div className="flex flex-col justify-between items-end gap-3 pl-4 border-l border-slate-100">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{ticket.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {activeTab === 'amc' && (
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

            {activeTab === 'reports' && (
                <div className="grid grid-cols-1 gap-4">
                    {reports.length > 0 ? reports.map(report => (
                         <div key={report.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-center shrink-0">
                                <FileText className="text-medical-600" size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-800">{report.customerName}</h4>
                                <p className="text-sm text-slate-500 font-medium">{report.equipmentName}</p>
                                <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="font-bold text-xs text-slate-400 uppercase mr-2">Action Taken:</span>
                                    {report.actionTaken}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-400">{report.date}</span>
                                <div className={`mt-1 px-2.5 py-1 rounded-full text-xs font-bold inline-block border ${
                                    report.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                }`}>{report.status}</div>
                            </div>
                         </div>
                    )) : (
                        <div className="text-center py-12 text-slate-400">
                            <FileText size={48} className="mx-auto mb-3 opacity-20" />
                            <p>No service reports generated yet.</p>
                            <button onClick={() => setShowReportModal(true)} className="mt-2 text-medical-600 font-bold hover:underline">Create First Report</button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* New Service Report Modal */}
      {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white rounded-t-3xl">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="text-medical-600" size={24} /> New Service Report
                      </h3>
                      <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Customer / Hospital</label>
                            <input 
                                type="text" 
                                list="sr-clients"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                value={newReport.customerName || ''}
                                onChange={e => setNewReport({...newReport, customerName: e.target.value})}
                                placeholder="Search Client..."
                            />
                            <datalist id="sr-clients">
                                {clients.map(c => <option key={c.id} value={c.name}>{c.hospital}</option>)}
                            </datalist>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Equipment / Product</label>
                             <input 
                                type="text" 
                                list="sr-products"
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                value={newReport.equipmentName || ''}
                                onChange={e => setNewReport({...newReport, equipmentName: e.target.value})}
                                placeholder="Search Equipment..."
                            />
                            <datalist id="sr-products">
                                {products.map(p => <option key={p.id} value={p.name} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Problem Reported</label>
                            <textarea 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 resize-none"
                                rows={2}
                                value={newReport.problemReported || ''}
                                onChange={e => setNewReport({...newReport, problemReported: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Action Taken</label>
                            <textarea 
                                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500 resize-none"
                                rows={3}
                                value={newReport.actionTaken || ''}
                                onChange={e => setNewReport({...newReport, actionTaken: e.target.value})}
                            />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Visit Date</label>
                                <input 
                                    type="date"
                                    className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                    value={newReport.date}
                                    onChange={e => setNewReport({...newReport, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Status</label>
                                <select 
                                    className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-medical-500"
                                    value={newReport.status}
                                    onChange={e => setNewReport({...newReport, status: e.target.value as any})}
                                >
                                    <option>Completed</option>
                                    <option>Pending Spares</option>
                                    <option>Observation</option>
                                </select>
                            </div>
                        </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
                      <button onClick={() => setShowReportModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200/50 rounded-xl transition-colors">
                          Cancel
                      </button>
                      <button onClick={handleSaveReport} className="px-6 py-2.5 bg-medical-600 text-white font-bold rounded-xl hover:bg-medical-700 shadow-lg shadow-medical-500/30 flex items-center gap-2 transition-all active:scale-95">
                          <CheckCircle size={18} /> Save Report
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};