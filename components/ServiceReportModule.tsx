import React, { useState, useMemo, useEffect } from 'react';
import { ServiceReport, ServiceReportItem } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, 
    History, FileText, Download, Wrench, Edit, Eye, List as ListIcon, Calendar, Building2, MapPin, User, Settings, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import { useData } from './DataContext';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

export const ServiceReportModule: React.FC = () => {
    const { clients, products, invoices } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [reports, setReports] = useState<ServiceReport[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [report, setReport] = useState<Partial<ServiceReport>>({
        reportNumber: '',
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        equipmentName: '',
        modelNumber: '',
        serialNumber: '',
        problemReported: '',
        actionTaken: '',
        engineerName: 'S. Suresh Kumar',
        status: 'Completed',
        itemsUsed: [],
        customerRemarks: ''
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !report.reportNumber) {
            setReport(prev => ({
                ...prev,
                reportNumber: `SMR ${String(reports.length + 201).padStart(3, '0')}`
            }));
        }
    }, [viewState, reports.length, editingId]);

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name === inputValue || c.hospital === inputValue);
        if (client) {
            setReport(prev => ({
                ...prev,
                customerName: client.name,
                customerHospital: client.hospital || '',
                customerAddress: client.address || ''
            }));
        } else {
            setReport(prev => ({ ...prev, customerName: inputValue }));
        }
    };

    const handleAddItem = (prod?: any) => {
        const newItem: ServiceReportItem = {
            id: `PART-${Date.now()}`,
            description: prod?.name || '',
            quantity: 1,
            unitPrice: prod?.price || 0,
            amount: prod?.price || 0
        };
        setReport(prev => ({ ...prev, itemsUsed: [...(prev.itemsUsed || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const updateItem = (id: string, field: keyof ServiceReportItem, value: any) => {
        setReport(prev => {
            const updatedItems = (prev.itemsUsed || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    
                    // Auto-fill logic from products catalog
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.price;
                        }
                    }

                    updated.amount = updated.quantity * updated.unitPrice;
                    return updated;
                }
                return item;
            });
            return { ...prev, itemsUsed: updatedItems };
        });
    };

    const handleSave = () => {
        if (!report.customerName || !report.equipmentName) {
            alert("Please fill customer and equipment details.");
            return;
        }
        const finalData: ServiceReport = {
            ...report as ServiceReport,
            id: editingId || `SR-${Date.now()}`,
            documentType: 'ServiceReport'
        };
        if (editingId) setReports(prev => prev.map(r => r.id === editingId ? finalData : r));
        else setReports(prev => [finalData, ...prev]);
        setViewState('history');
        setEditingId(null);
    };

    const handleEdit = (r: ServiceReport) => {
        setReport(r);
        setEditingId(r.id);
        setViewState('builder');
        setBuilderTab('form');
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            (p.category === 'Spare Part' || p.category === 'Consumable') &&
            (p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
             p.sku.toLowerCase().includes(catalogSearch.toLowerCase()))
        );
    }, [products, catalogSearch]);

    const renderReportTemplate = (data: Partial<ServiceReport>) => (
        <div className="bg-white p-[15mm] text-black w-full min-h-full flex flex-col border border-slate-300 shadow-sm" style={{ fontFamily: 'Calibri, "Segoe UI", Candara, Segoe, Optima, Arial, sans-serif' }}>
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-black pb-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-1">SREE MEDITEC</h1>
                <p className="text-[14px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[14px] font-bold">Mob: 9884818398 • E-mail: sreemeditec@gmail.com</p>
            </div>

            {/* Document Title */}
            <div className="border border-black text-center py-1.5 mb-6 bg-slate-50">
                <h2 className="text-lg font-black uppercase tracking-[0.2em]">TECHNICAL FIELD SERVICE REPORT</h2>
            </div>

            {/* Registry Info Table */}
            <div className="grid grid-cols-2 border border-black text-[13px] mb-6">
                <div className="border-r border-black p-2 flex justify-between">
                    <span className="font-black uppercase">Report No:</span>
                    <span className="font-bold font-mono">{data.reportNumber}</span>
                </div>
                <div className="p-2 flex justify-between">
                    <span className="font-black uppercase">Date:</span>
                    <span className="font-bold">{formatDateDDMMYYYY(data.date)}</span>
                </div>
            </div>

            {/* Customer & Equipment Grid */}
            <div className="border-x border-t border-black text-[13px]">
                <div className="grid grid-cols-[140px_1fr] border-b border-black">
                    <div className="p-2 bg-slate-50 border-r border-black font-black uppercase">Customer Name</div>
                    <div className="p-2 font-bold uppercase">{data.customerName || '---'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-black min-h-[40px]">
                    <div className="p-2 bg-slate-50 border-r border-black font-black uppercase">Hospital / Lab</div>
                    <div className="p-2">{data.customerHospital || '---'}</div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-black min-h-[60px]">
                    <div className="p-2 bg-slate-50 border-r border-black font-black uppercase">Address</div>
                    <div className="p-2 whitespace-pre-wrap">{data.customerAddress || '---'}</div>
                </div>
                <div className="grid grid-cols-3">
                    <div className="grid grid-cols-[140px_1fr] border-r border-black border-b border-black">
                        <div className="p-2 bg-slate-50 border-r border-black font-black uppercase">Equipment</div>
                        <div className="p-2 font-bold">{data.equipmentName || '---'}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] border-r border-black border-b border-black">
                        <div className="p-2 bg-slate-50 border-r border-black font-black uppercase text-[11px]">Model No</div>
                        <div className="p-2 font-bold">{data.modelNumber || '---'}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] border-b border-black">
                        <div className="p-2 bg-slate-50 border-r border-black font-black uppercase text-[11px]">Serial No</div>
                        <div className="p-2 font-bold">{data.serialNumber || '---'}</div>
                    </div>
                </div>
            </div>

            {/* Problem & Action Sections */}
            <div className="border-x border-black text-[13px]">
                <div className="p-2 bg-slate-50 border-b border-black font-black uppercase tracking-widest text-center">Breakdown Details</div>
                <div className="p-4 border-b border-black min-h-[80px]">
                    <p className="text-[11px] font-black uppercase text-slate-400 mb-1 underline">Nature of Fault Reported:</p>
                    <p className="font-medium italic leading-relaxed">{data.problemReported || 'None recorded.'}</p>
                </div>
                <div className="p-4 border-b border-black min-h-[140px]">
                    <p className="text-[11px] font-black uppercase text-slate-400 mb-1 underline">Action Taken / Service Rendered:</p>
                    <p className="font-medium leading-relaxed whitespace-pre-wrap">{data.actionTaken || 'Regular preventive maintenance performed.'}</p>
                </div>
            </div>

            {/* Spare Parts Table */}
            <div className="border-x border-black">
                <table className="w-full border-collapse text-[12px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-black font-black uppercase">
                            <th className="border-r border-black p-2 text-left w-12">Sl No</th>
                            <th className="border-r border-black p-2 text-left">Spare Parts / Consumables Replaced</th>
                            <th className="border-r border-black p-2 text-center w-24">Part No</th>
                            <th className="p-2 text-center w-20">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.itemsUsed || []).map((item, idx) => (
                            <tr key={idx} className="border-b border-black last:border-b-0">
                                <td className="border-r border-black p-2 text-center">{idx + 1}</td>
                                <td className="border-r border-black p-2 font-bold">{item.description}</td>
                                <td className="border-r border-black p-2 text-center font-mono text-[10px] text-slate-500">---</td>
                                <td className="p-2 text-center font-black">{item.quantity}</td>
                            </tr>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - (data.itemsUsed?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black last:border-b-0">
                                <td className="border-r border-black p-2 h-8"></td>
                                <td className="border-r border-black p-2"></td>
                                <td className="border-r border-black p-2"></td>
                                <td className="p-2"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Remarks and Engineer Info */}
            <div className="border border-black text-[12px] mt-6">
                <div className="grid grid-cols-2">
                    <div className="border-r border-black p-3 min-h-[100px]">
                        <p className="font-black uppercase text-slate-400 mb-1">Client Comments / Remarks:</p>
                        <p className="font-medium italic">{data.customerRemarks || 'Machine working satisfactorily after service.'}</p>
                    </div>
                    <div className="p-3">
                        <p className="font-black uppercase text-slate-400 mb-1">Status of Machine:</p>
                        <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-sm border border-black ${data.status === 'Completed' ? 'bg-black' : 'bg-white'}`}></div>
                                <span className="font-bold">Working</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-sm border border-black ${data.status === 'Pending Spares' ? 'bg-black' : 'bg-white'}`}></div>
                                <span className="font-bold">Under Repair</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-auto grid grid-cols-2 border-x border-b border-black flex-1">
                <div className="border-r border-black p-4 flex flex-col justify-between min-h-[120px]">
                    <p className="font-black uppercase text-xs">Customer's Name & Signature</p>
                    <div className="flex items-end gap-2 pb-2">
                        <div className="w-full border-t border-dotted border-black pt-1 text-[10px] text-slate-400 uppercase">Seal & Signature</div>
                    </div>
                </div>
                <div className="p-4 flex flex-col justify-between min-h-[120px] relative overflow-hidden">
                    <div>
                         <p className="font-black uppercase text-xs">Service Engineer's Name & Signature</p>
                         <p className="mt-2 font-black text-sm">{data.engineerName}</p>
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                        <div className="w-full border-t border-dotted border-black pt-1 text-[10px] text-slate-400 uppercase">Authorised for Sree Meditec</div>
                         <div className="w-24 h-24 border-4 border-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-200 uppercase text-center rotate-12 select-none -mr-4 -mb-4 opacity-40">Official<br/>Company Seal</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setReport({ date: new Date().toISOString().split('T')[0], itemsUsed: [], status: 'Completed', engineerName: 'S. Suresh Kumar' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> Create Report</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Field Service Log</h3>
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64" /></div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">Report #</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4">Equipment</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black">{r.reportNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 uppercase">{r.customerName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{r.customerHospital}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-500">{r.equipmentName}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={18}/></button>
                                                <button className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"><Download size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="lg:hidden flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Spares</button>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className={`flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white ${builderTab === 'form' ? 'block' : 'hidden lg:block'}`}>
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Report Registry</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.reportNumber} onChange={e => setReport({...report, reportNumber: e.target.value})} placeholder="Report No." />
                                    <input type="date" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none font-bold" value={report.date} onChange={e => setReport({...report, date: e.target.value})} />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer & Asset</h3>
                                <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={report.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Customer Name *" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.equipmentName || ''} onChange={e => setReport({...report, equipmentName: e.target.value})} placeholder="Equipment Name *" />
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.modelNumber || ''} onChange={e => setReport({...report, modelNumber: e.target.value})} placeholder="Model No." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.serialNumber || ''} onChange={e => setReport({...report, serialNumber: e.target.value})} placeholder="Serial Number" />
                                    <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.status} onChange={e => setReport({...report, status: e.target.value as any})}>
                                        <option value="Completed">Working Correct / Completed</option>
                                        <option value="Pending Spares">Under Repair / Pending Spares</option>
                                        <option value="Observation">Under Observation</option>
                                    </select>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Technical Diagnosis</h3>
                                <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={report.problemReported || ''} onChange={e => setReport({...report, problemReported: e.target.value})} placeholder="Nature of Fault Reported" />
                                <textarea rows={4} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 resize-none" value={report.actionTaken || ''} onChange={e => setReport({...report, actionTaken: e.target.value})} placeholder="Action Taken / Work Done" />
                            </section>

                            <section className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                     <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Spares Replaced</h3>
                                     <div className="flex gap-2">
                                        <button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ Manual Row</button>
                                        <button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Add Catalog</button>
                                     </div>
                                </div>
                                <div className="space-y-4">
                                    {report.itemsUsed?.map((item) => (
                                        <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                                            <button onClick={() => setReport({...report, itemsUsed: report.itemsUsed?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-12 md:col-span-9">
                                                    <input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} />
                                                </div>
                                                <div className="col-span-12 md:col-span-3">
                                                    <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center" placeholder="Qty" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sign-off Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.engineerName} onChange={e => setReport({...report, engineerName: e.target.value})} placeholder="Engineer Name" />
                                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.customerRemarks || ''} onChange={e => setReport({...report, customerRemarks: e.target.value})} placeholder="Client Feedback" />
                                </div>
                            </section>

                            <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50">
                                <button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={handleSave} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Finalize Service Report</button>
                            </div>
                        </div>

                        <div className={`w-full lg:w-1/2 bg-slate-100 border-l border-slate-200 flex flex-col lg:overflow-hidden ${builderTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
                             <div className="hidden lg:flex bg-[#81D7D3] p-1 shrink-0">
                                <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'preview' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Live Document Preview</button>
                                <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${builderTab === 'catalog' ? 'bg-white text-teal-700 shadow-sm' : 'text-white hover:bg-white/10'}`}>Parts Catalog</button>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                <div className={`h-full overflow-y-auto p-4 md:p-8 flex justify-center custom-scrollbar ${builderTab === 'preview' ? 'flex' : 'hidden'}`}>
                                     <div className="shadow-2xl h-fit w-full max-w-[210mm] transition-all duration-300">
                                        {renderReportTemplate(report)}
                                     </div>
                                </div>

                                <div className={`h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in ${builderTab === 'catalog' ? 'flex' : 'hidden'}`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Spare Parts Inventory</h3>
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Filter Spares..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 gap-4">
                                        {filteredProducts.map(prod => (
                                            <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${prod.category === 'Spare Part' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{prod.category}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{prod.sku}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Available: {prod.stock} units</p>
                                                </div>
                                                <div className="ml-4 p-1.5 bg-white rounded-lg border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.filter(p => p.category !== 'Equipment').map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};