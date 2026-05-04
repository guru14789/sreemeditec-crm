import React, { useState, useMemo, useEffect } from 'react';
import { ServiceReport, ServiceReportItem } from '../types';
import { 
    Plus, Search, Trash2, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Save, Clock, User, Settings, CreditCard, DollarSign, MoreVertical, Shield, Wrench, Activity, MessageSquare
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';
import { AutoSuggest } from './AutoSuggest';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

interface DetailedServiceReport extends Partial<ServiceReport> {
    office?: string;
    time?: string;
    machineStatus?: 'Warranty' | 'Out Of Warranty' | 'AMC';
    softwareVersion?: string;
    engineerObservations?: string;
    poWoNumber?: string;
    actionHardware?: string;
    actionOperational?: string;
    actionSoftware?: string;
    pastBalance?: number;
    visitCharges?: number;
    sparesCharges?: number;
    amountReceived?: number;
    memoNumber?: string;
    queriesRemarks?: string;
}

export const ServiceReportModule: React.FC = () => {
    const { clients, products, addNotification, serviceReports, addServiceReport, updateServiceReport, financialYear, currentUser } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [report, setReport] = useState<DetailedServiceReport>({
        reportNumber: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        office: 'Chennai',
        customerName: '',
        customerAddress: '',
        equipmentName: '',
        machineStatus: 'Warranty',
        softwareVersion: '',
        problemReported: '',
        engineerObservations: '',
        poWoNumber: '',
        actionHardware: '',
        actionOperational: '',
        actionSoftware: '',
        engineerName: currentUser?.name || 'S. Suresh Kumar',
        status: 'Completed',
        itemsUsed: [],
        pastBalance: 0,
        visitCharges: 0,
        sparesCharges: 0,
        amountReceived: 0,
        memoNumber: '',
        queriesRemarks: ''
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !report.reportNumber) {
            const currentYearReports = serviceReports.filter(r => r.reportNumber && r.reportNumber.includes(`/${financialYear}/`));
            const nextNum = currentYearReports.length + 1;
            setReport(prev => ({
                ...prev,
                reportNumber: `SMSR/${financialYear}/${nextNum}`
            }));
        }
    }, [viewState, serviceReports, editingId, report.reportNumber, financialYear]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const finTotals = useMemo(() => {
        const sparesSum = (report.itemsUsed || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const a = report.pastBalance || 0;
        const b = report.visitCharges || 0;
        const c = sparesSum || report.sparesCharges || 0;
        const d = a + b + c;
        const e = report.amountReceived || 0;
        const netBalance = d - e;
        return { sparesTotal: c, totalReceivable: d, netBalance };
    }, [report]);

    const handleDownloadPDF = async (data: DetailedServiceReport) => {
        try {
            const blob = await PDFService.generateServiceReportPDF(data as ServiceReport);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.reportNumber || 'ServiceReport'}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF", err);
            addNotification('Download Failed', 'Could not generate PDF file.', 'alert');
        }
    };

    const handleClientSelect = (client: any) => {
        setReport(prev => ({
            ...prev,
            customerName: client.hospital || client.name,
            customerAddress: client.address || ''
        }));
    };

    const handleAddItem = (prod?: any) => {
        const newItem: ServiceReportItem = {
            id: `PART-${Date.now()}`,
            description: prod?.name || '',
            quantity: 1,
            unitPrice: prod?.sellingPrice || 0,
            amount: prod?.sellingPrice || 0
        };
        setReport(prev => ({ ...prev, itemsUsed: [...(prev.itemsUsed || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const updateItem = (id: string, field: keyof ServiceReportItem, value: any) => {
        setReport(prev => {
            const updatedItems = (prev.itemsUsed || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) updated.unitPrice = masterProd.sellingPrice;
                    }
                    updated.amount = updated.quantity * updated.unitPrice;
                    return updated;
                }
                return item;
            });
            return { ...prev, itemsUsed: updatedItems };
        });
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!report.customerName || !report.equipmentName) {
            addNotification('Invalid Data', 'Fill facility and equipment details.', 'alert');
            return;
        }
        const finalData: ServiceReport = {
            ...report as ServiceReport,
            id: editingId || `SR-${Date.now()}`,
            status: status === 'Draft' ? 'Draft' : 'Completed',
            documentType: 'ServiceReport'
        };

        try {
            if (editingId) {
                await updateServiceReport(editingId, finalData);
            } else {
                await addServiceReport(finalData);
            }
            setViewState('history');
            setEditingId(null);
            addNotification('Registry Updated', `Service Report ${finalData.reportNumber} archived.`, 'success');
        } catch (err) {
            console.error("Save error:", err);
            addNotification('Save Failed', 'Could not persist report.', 'alert');
        }
    };

    const renderReportTemplate = (data: DetailedServiceReport, fin: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="text-center mb-6">
                <h1 className="text-4xl font-black uppercase mb-1">SREE MEDITEC</h1>
                <p className="text-[11px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[11px] font-bold">Mob: 9884818398</p>
            </div>
            
            <div className="text-center py-2 font-black text-sm uppercase tracking-widest border border-black bg-slate-50 mb-0">SERVICE REPORT</div>

            <div className="grid grid-cols-5 border-x border-b border-black text-[10px] font-bold">
                <div className="border-r border-black p-1.5 flex gap-1"><span>Sr No:</span><span className="font-black text-medical-600">{data.reportNumber}</span></div>
                <div className="border-r border-black p-1.5 flex gap-1"><span>Office:</span><span className="font-normal">{data.office}</span></div>
                <div className="border-r border-black p-1.5 flex gap-1"><span>Engineer:</span><span className="font-normal uppercase">{data.engineerName}</span></div>
                <div className="border-r border-black p-1.5 flex gap-1"><span>Date:</span><span className="font-normal">{formatDateDDMMYYYY(data.date)}</span></div>
                <div className="p-1.5 flex gap-1"><span>Time:</span><span className="font-normal">{data.time}</span></div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[11px] font-bold">
                <div className="border-r border-black p-2 flex gap-2"><span>Customer:</span><span className="font-black uppercase">{data.customerName}</span></div>
                <div className="p-2 flex gap-2"><span>Machine:</span><span className="font-black uppercase">{data.equipmentName}</span></div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[11px]">
                <div className="border-r border-black p-2 min-h-[80px]">
                    <p className="font-bold underline mb-1">Address:</p>
                    <p className="whitespace-pre-wrap leading-tight font-medium uppercase text-[10px]">{data.customerAddress}</p>
                </div>
                <div className="p-0 flex flex-col">
                    <div className="p-2 border-b border-black flex-1">
                        <p className="font-bold text-[10px] mb-2 uppercase tracking-tighter">Machine Status:</p>
                        <div className="flex gap-4">
                            {['Warranty', 'Out Of Warranty', 'AMC'].map(s => (
                                <div key={s} className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 border border-black rounded-sm ${data.machineStatus === s ? 'bg-black' : ''}`}></div>
                                    <span className="text-[10px] font-bold">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-2 flex items-center gap-2">
                        <p className="font-bold text-[10px] uppercase">Software version:</p>
                        <span className="font-black">{data.softwareVersion || '---'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black text-[11px] min-h-[80px]">
                <div className="border-r border-black p-2">
                    <p className="font-bold underline mb-1 text-[10px] uppercase tracking-tighter">Complaint Summary:</p>
                    <p className="whitespace-pre-wrap leading-tight font-medium italic">{data.problemReported || '---'}</p>
                </div>
                <div className="p-2">
                    <p className="font-bold underline mb-1 text-[10px] uppercase tracking-tighter">Engineer's observations:</p>
                    <p className="whitespace-pre-wrap leading-tight font-medium italic">{data.engineerObservations || '---'}</p>
                </div>
            </div>

            <div className="border-x border-b border-black p-2 text-[11px] font-bold">
                <span>PO/WO Number from Customer:</span>
                <span className="ml-4 font-black">{data.poWoNumber || '---'}</span>
            </div>

            <div className="border-x border-black bg-slate-50 text-center font-black text-[10px] py-1.5 border-b uppercase tracking-widest">
                Action taken by Engineer
            </div>

            <div className="grid grid-cols-[40mm_1fr] border-x border-b border-black text-[11px]">
                <div className="border-r border-black p-2 font-bold bg-slate-50/50 flex items-center">Hardware/Spares:</div>
                <div className="p-2 min-h-[30px] font-medium">{data.actionHardware || '---'}</div>
            </div>
            <div className="grid grid-cols-[40mm_1fr] border-x border-b border-black text-[11px]">
                <div className="border-r border-black p-2 font-bold bg-slate-50/50 flex items-center">Operational Fix:</div>
                <div className="p-2 min-h-[30px] font-medium">{data.actionOperational || '---'}</div>
            </div>
            <div className="grid grid-cols-[40mm_1fr] border-x border-b border-black text-[11px]">
                <div className="border-r border-black p-2 font-bold bg-slate-50/50 flex items-center">Software Update:</div>
                <div className="p-2 min-h-[30px] font-medium">{data.actionSoftware || '---'}</div>
            </div>

            <div className="grid grid-cols-2 border-x border-b border-black flex-1 min-h-[140px]">
                <div className="border-r border-black p-4 flex flex-col">
                    <div className="flex-1">
                        <p className="font-bold text-[10px] underline mb-1 uppercase">Follow up / Remarks:</p>
                        <p className="text-[10px] font-medium italic leading-relaxed whitespace-pre-wrap">{data.queriesRemarks || '---'}</p>
                    </div>
                    <div className="mt-8 border-t border-dotted border-black pt-2 text-center">
                        <p className="font-black text-[11px] uppercase">Customer Signature</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1">(Seal & Stamp Required)</p>
                    </div>
                </div>
                <div className="p-0 flex flex-col">
                    <table className="w-full text-[10px] border-collapse">
                        <tbody>
                            <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Past balance (A):</td><td className="p-2 text-right font-black w-28">{(data.pastBalance || 0).toFixed(2)}</td></tr>
                            <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Visit Charges (B):</td><td className="p-2 text-right font-black w-28">{(data.visitCharges || 0).toFixed(2)}</td></tr>
                            <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Spares Charges (C):</td><td className="p-2 text-right font-black w-28">{fin.sparesTotal.toFixed(2)}</td></tr>
                            <tr className="border-b border-black bg-slate-50"><td className="p-2 border-r border-black font-black uppercase">Total receivable (A+B+C):</td><td className="p-2 text-right font-black w-28 text-lg">{fin.totalReceivable.toFixed(2)}</td></tr>
                            <tr className="border-b border-black"><td className="p-2 border-r border-black font-bold">Amount received (D):</td><td className="p-2 text-right font-black w-28 text-medical-600">{(data.amountReceived || 0).toFixed(2)}</td></tr>
                            <tr className="border-b border-black bg-slate-100"><td className="p-2 border-r border-black font-black uppercase">Balance (Total-D):</td><td className="p-2 text-right font-black w-28 text-rose-600">{fin.netBalance.toFixed(2)}</td></tr>
                            <tr><td className="p-2 border-r border-black italic">Memo No:</td><td className="p-2 text-right font-bold w-28">{data.memoNumber || '---'}</td></tr>
                        </tbody>
                    </table>
                    <div className="flex-1 flex items-end justify-center p-4 border-t border-black">
                        <div className="w-full text-center">
                            <p className="font-black text-[11px] uppercase">Engineer Signature</p>
                            <p className="text-[9px] font-bold text-medical-600 mt-1">FOR SREE MEDITEC</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setReport({ date: new Date().toISOString().split('T')[0], engineerName: currentUser?.name || 'S. Suresh Kumar', status: 'Completed', machineStatus: 'Warranty', pastBalance: 0, visitCharges: 0, sparesCharges: 0, amountReceived: 0, itemsUsed: [] }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Visit</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Service Archive</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Report #</th>
                                    <th className="px-6 py-4">Facility</th>
                                    <th className="px-6 py-4">Engineer</th>
                                    <th className="px-6 py-4">Machine</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {serviceReports
                                    .sort((a, b) => (b.reportNumber || '').localeCompare(a.reportNumber || '', undefined, { numeric: true }))
                                    .map((r: any) => (
                                    <tr key={r.id} onClick={() => { setReport(r); setEditingId(r.id!); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-black">{r.reportNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{r.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div title={r.engineerName} className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                {r.engineerName?.charAt(0) || 'E'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-tight truncate max-w-[150px]">{r.equipmentName}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span></td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === r.id! ? null : r.id!); }} className={`p-2 rounded-xl transition-all ${activeMenuId === r.id! ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeMenuId === r.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button onClick={(e) => { e.stopPropagation(); setReport(r); setEditingId(r.id!); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"><Edit size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(r); setActiveMenuId(null); }} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex-1 flex justify-center"><Download size={18} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-300 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><ListIcon size={18}/> Spares</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-8 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Clock size={14} className="text-medical-500" />
                                            1. Registry Details
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="Report No. *">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={report.reportNumber || ''} onChange={e => setReport({...report, reportNumber: e.target.value})} placeholder="SMSR-001" />
                                            </FormRow>
                                            <FormRow label="Execution Date">
                                                <input type="date" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.date || ''} onChange={e => setReport({...report, date: e.target.value})} />
                                            </FormRow>
                                            <FormRow label="Time of Visit">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.time || ''} onChange={e => setReport({...report, time: e.target.value})} placeholder="10:30 AM" />
                                            </FormRow>
                                            <FormRow label="Service Office">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.office || 'Chennai'} onChange={e => setReport({...report, office: e.target.value})} />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Shield size={14} className="text-medical-500" />
                                            2. Equipment & Facility
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Facility / Client *">
                                                    <AutoSuggest
                                                        value={report.customerName || ''}
                                                        onChange={(val) => setReport({ ...report, customerName: val })}
                                                        onSelect={handleClientSelect}
                                                        suggestions={clients}
                                                        filterKey="hospital"
                                                        placeholder="Search facility registry..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <FormRow label="Machine Model *">
                                                    <AutoSuggest
                                                        value={report.equipmentName || ''}
                                                        onChange={(val) => setReport({ ...report, equipmentName: val })}
                                                        onSelect={(prod) => setReport({ ...report, equipmentName: prod.name })}
                                                        suggestions={products}
                                                        filterKey="name"
                                                        placeholder="Select equipment..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <FormRow label="Machine Status">
                                                    <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200">
                                                        {['Warranty', 'Out Of Warranty', 'AMC'].map(s => (
                                                            <button key={s} onClick={() => setReport({...report, machineStatus: s as any})} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${report.machineStatus === s ? 'bg-medical-600 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{s}</button>
                                                        ))}
                                                    </div>
                                                </FormRow>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Full Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[120px] resize-none uppercase" value={report.customerAddress || ''} onChange={e => setReport({...report, customerAddress: e.target.value})} placeholder="Hospital location..." />
                                                </FormRow>
                                                <FormRow label="Software Version">
                                                    <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.softwareVersion || ''} onChange={e => setReport({...report, softwareVersion: e.target.value})} placeholder="V1.0.2" />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Activity size={14} className="text-medical-500" />
                                            3. Diagnosis & Findings
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormRow label="Complaint Reported">
                                                <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[80px] resize-none" value={report.problemReported || ''} onChange={e => setReport({...report, problemReported: e.target.value})} placeholder="Details from customer..." />
                                            </FormRow>
                                            <FormRow label="Engineer's Observations">
                                                <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[80px] resize-none" value={report.engineerObservations || ''} onChange={e => setReport({...report, engineerObservations: e.target.value})} placeholder="Technical findings..." />
                                            </FormRow>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormRow label="Hardware / Consumables Action">
                                                <textarea className="w-full h-[60px] border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold resize-none" value={report.actionHardware || ''} onChange={e => setReport({...report, actionHardware: e.target.value})} placeholder="Spares replaced..." />
                                            </FormRow>
                                            <FormRow label="Operational / Service Action">
                                                <textarea className="w-full h-[60px] border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold resize-none" value={report.actionOperational || ''} onChange={e => setReport({...report, actionOperational: e.target.value})} placeholder="Testing/Calibration..." />
                                            </FormRow>
                                            <FormRow label="Software / Config Action">
                                                <textarea className="w-full h-[60px] border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold resize-none" value={report.actionSoftware || ''} onChange={e => setReport({...report, actionSoftware: e.target.value})} placeholder="Patching/Updates..." />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Wrench size={14} className="text-medical-500" />
                                                4. Spares Manifest
                                            </h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => setBuilderTab('catalog')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Store</button>
                                                <button onClick={() => handleAddItem()} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pb-4">
                                            {report.itemsUsed?.map((item, idx) => (
                                                <div key={item.id} className="group relative bg-slate-50 hover:bg-medical-50/20 p-4 rounded-xl border border-slate-200 hover:border-medical-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-medical-500 group-hover:text-white transition-all shrink-0 shadow-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0 w-full">
                                                        <AutoSuggest
                                                            value={item.description || ''}
                                                            onChange={(val) => updateItem(item.id, 'description', val)}
                                                            onSelect={(prod) => {
                                                                updateItem(item.id, 'description', prod.name);
                                                                updateItem(item.id, 'unitPrice', prod.sellingPrice || 0);
                                                            }}
                                                            suggestions={products}
                                                            filterKey="name"
                                                            className="w-full bg-transparent font-black text-slate-800 outline-none uppercase placeholder:text-slate-300 text-sm h-[24px]"
                                                            placeholder="Select Spare..."
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
                                                        <input 
                                                            type="number"
                                                            value={item.quantity || ''}
                                                            onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                            className="w-10 bg-transparent text-center font-black text-medical-600 outline-none text-sm"
                                                        />
                                                        <span className="text-[9px] font-black text-slate-300">×</span>
                                                        <input 
                                                            type="number"
                                                            value={item.unitPrice || ''}
                                                            onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                            className="w-24 bg-transparent font-black text-slate-700 outline-none text-sm"
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => setReport(prev => ({ ...prev, itemsUsed: prev.itemsUsed?.filter(it => it.id !== item.id) }))}
                                                        className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all self-end sm:self-center"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4 pb-20">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <CreditCard size={14} className="text-medical-500" />
                                            5. Settlement & Remarks
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <FormRow label="Visit Charges (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={report.visitCharges || ''} onChange={e => setReport({...report, visitCharges: Number(e.target.value)})} />
                                            </FormRow>
                                            <FormRow label="Past Balance (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={report.pastBalance || ''} onChange={e => setReport({...report, pastBalance: Number(e.target.value)})} />
                                            </FormRow>
                                            <FormRow label="Collected Amount (₹)">
                                                <input type="number" className="w-full h-[42px] bg-white border border-emerald-300 rounded-xl px-4 py-2 text-sm font-black text-emerald-600 outline-none shadow-sm" value={report.amountReceived || ''} onChange={e => setReport({...report, amountReceived: Number(e.target.value)})} />
                                            </FormRow>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormRow label="Memo / Receipt Number">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.memoNumber || ''} onChange={e => setReport({...report, memoNumber: e.target.value})} placeholder="SM-REC-001" />
                                            </FormRow>
                                            <FormRow label="Author / Engineer">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-500" value={report.engineerName || ''} readOnly />
                                            </FormRow>
                                        </div>
                                        <FormRow label="Engineer's Queries / Follow-up">
                                            <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[80px] resize-none" value={report.queriesRemarks || ''} onChange={e => setReport({...report, queriesRemarks: e.target.value})} placeholder="Next steps..." />
                                        </FormRow>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                                    <div className="flex-1 flex items-center justify-between px-2 order-2 sm:order-1">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Receivable</span>
                                            <span className="text-xl font-black text-medical-600 tracking-tight">₹{finTotals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <button 
                                            onClick={() => { setViewState('history'); setEditingId(null); }}
                                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button 
                                            onClick={() => handleSave('Draft')}
                                            className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 active:scale-95"
                                        >
                                            Save Draft
                                        </button>
                                        <button 
                                            onClick={() => { handleSave('Finalized'); handleDownloadPDF(report); }}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:from-medical-700 hover:to-teal-600 transition-all shadow-xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Finalize & Print
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderReportTemplate(report, finTotals)}
                                </div>
                            </div>
                        )}
                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Service Spares</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Select hardware used during visit</p>
                                    </div>
                                    <div className="relative w-full sm:w-80">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Filter Spares..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {products.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(prod => (
                                        <div key={prod.id} className="p-5 bg-white border border-slate-300 rounded-[1.5rem] hover:border-medical-400 transition-all cursor-pointer flex flex-col justify-between group shadow-sm" onClick={() => handleAddItem(prod)}>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">{prod.category || 'N/A'}</span>
                                                    <span className="text-[9px] font-mono text-slate-400 tracking-tighter uppercase ml-auto">{prod.sku}</span>
                                                </div>
                                                <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors uppercase truncate">{prod.name}</h4>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase">Selling Price</p>
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">₹{(prod.sellingPrice || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-medical-600 group-hover:text-white transition-all shadow-sm">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
