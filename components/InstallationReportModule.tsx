import React, { useState, useEffect } from 'react';
import { ServiceReport } from '../types';
import { 
    History, Download, Edit, Eye, PenTool, MoreVertical, Building2, Calendar, ClipboardCheck, User, Shield, Info, CheckCircle2, Save, Trash2
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

interface SimpleInstallationReport extends Partial<ServiceReport> {
    smirNo?: string;
    installationOf?: string;
    trainedPersons?: string;
}

export const InstallationReportModule: React.FC = () => {
    const { clients, products, addNotification, installationReports, addInstallationReport, updateInstallationReport, financialYear, currentUser } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [report, setReport] = useState<SimpleInstallationReport>({
        smirNo: '',
        date: new Date().toISOString().split('T')[0],
        installationOf: '',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        trainedPersons: '',
        serialNumber: '',
        engineerName: currentUser?.name || 'S. Suresh Kumar',
        status: 'Completed'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !report.smirNo) {
            const currentYearReports = installationReports.filter(r => (r as any).smirNo && (r as any).smirNo.includes(`/${financialYear}/`));
            const nextNum = currentYearReports.length + 1;
            setReport(prev => ({
                ...prev,
                smirNo: `SMIR/${financialYear}/${nextNum}`
            }));
        }
    }, [viewState, installationReports, editingId, report.smirNo, financialYear]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleDownloadPDF = async (data: SimpleInstallationReport) => {
        try {
            const blob = await PDFService.generateInstallationReportPDF(data);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.smirNo || 'InstallationReport'}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download PDF", err);
            addNotification('Download Failed', 'Could not generate PDF file.', 'alert');
        }
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!report.customerName || !report.installationOf) {
            addNotification('Incomplete Form', 'Customer and Machine names are required.', 'alert');
            return;
        }
        const finalData: any = {
            ...report,
            id: editingId || `INS-${Date.now()}`,
            status: status === 'Draft' ? 'Draft' : 'Completed',
            documentType: 'InstallationReport'
        };
        
        try {
            if (editingId) {
                await updateInstallationReport(editingId, finalData);
            } else {
                await addInstallationReport(finalData);
            }
            setViewState('history');
            setEditingId(null);
            addNotification('Registry Updated', `Installation Report ${finalData.smirNo} archived.`, 'success');
        } catch (err) {
            console.error("Save error:", err);
            addNotification('Save Failed', 'Could not persist report.', 'alert');
        }
    };

    const renderReportTemplate = (data: SimpleInstallationReport) => (
        <div className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col mx-auto overflow-hidden border border-slate-200" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black uppercase mb-1">SREE MEDITEC</h1>
                <p className="text-[11px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[11px] font-bold">Mob: 9884818398</p>
            </div>

            <div className="text-center mb-8 py-2 bg-slate-50 border border-black font-black text-lg tracking-widest uppercase">
                INSTALLATION REPORT
            </div>

            <div className="flex justify-between font-black text-xs mb-4 px-1 uppercase">
                <div className="flex gap-2"><span>SMIR No:</span><span className="text-medical-600">{data.smirNo}</span></div>
                <div className="flex gap-2"><span>DATE:</span><span className="font-bold">{formatDateDDMMYYYY(data.date)}</span></div>
            </div>

            <div className="border border-black">
                <div className="border-b border-black p-4 font-black text-xs bg-slate-50/50 flex gap-4">
                    <span className="uppercase tracking-tighter">Installation Report Of:</span>
                    <span className="font-black text-medical-600 uppercase underline decoration-2">{data.installationOf}</span>
                </div>

                {[
                    { id: '1', label: 'Name of the Customer (As Per Invoice)', value: data.customerName },
                    { id: '2', label: 'Name of the Hospital/Clinic/Diagnostic Centre', value: data.customerHospital },
                    { id: '3', label: 'Address of the site of Installation', value: data.customerAddress },
                    { id: '4', label: 'Date of Installation', value: formatDateDDMMYYYY(data.date) },
                    { id: '5', label: 'Persons trained to operate the machine', value: data.trainedPersons },
                    { id: '6', label: 'Serial No of Machine', value: data.serialNumber }
                ].map((row, idx) => (
                    <div key={idx} className="flex border-b last:border-b-0 border-black min-h-[60px]">
                        <div className="w-12 border-r border-black flex items-center justify-center font-black text-sm bg-slate-50/30">{row.id}</div>
                        <div className="w-[280px] border-r border-black p-4 font-bold text-[10px] leading-tight flex items-center uppercase tracking-tight">{row.label}</div>
                        <div className="flex-1 p-4 text-[11px] font-black flex items-center uppercase italic">{row.value || '---'}</div>
                    </div>
                ))}
            </div>

            <div className="border-x border-b border-black p-5 text-[11px] leading-relaxed bg-slate-50/20 font-medium">
                The above referred unit has been supplied in good condition and installed successfully. 
                The same is functioning satisfactorily. The required training on the use of the said machine has been given to us.
            </div>

            <div className="border-x border-b border-black p-4 text-[10px] grid grid-cols-2">
                <div className="font-black italic uppercase text-rose-600">Note: Training will be given only once</div>
                <div className="text-right font-bold text-slate-400">All disputes are subject to Chennai jurisdiction only.</div>
            </div>

            <div className="border-x border-b border-black grid grid-cols-2 min-h-[160px] flex-1">
                <div className="border-r border-black p-6 flex flex-col justify-between">
                    <p className="font-black text-[10px] text-center uppercase tracking-widest text-medical-600">Service engineer Signature</p>
                    <div className="text-center">
                        <p className="font-bold text-[10px] uppercase">{data.engineerName}</p>
                        <p className="text-[8px] font-black text-slate-300 mt-1">FOR SREE MEDITEC</p>
                    </div>
                </div>
                <div className="p-6 flex flex-col justify-between">
                    <p className="font-black text-[10px] text-center uppercase tracking-widest">Customer Seal and Signature</p>
                    <div className="text-center">
                         <p className="text-[8px] font-black text-slate-300 uppercase">Hospital Authority</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setReport({ date: new Date().toISOString().split('T')[0], engineerName: currentUser?.name || 'S. Suresh Kumar', status: 'Completed' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New SMIR</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center bg-slate-50/30"><h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Installation Archive</h3></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">SMIR #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4">Engineer</th>
                                    <th className="px-6 py-4">Equipment</th>
                                    <th className="px-6 py-4 text-center">Execution</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {installationReports.map((r: any) => (
                                    <tr key={r.id} onClick={() => { setReport(r); setEditingId(r.id!); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-black">{r.smirNo}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{r.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div title={r.engineerName} className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                {r.engineerName?.charAt(0) || 'E'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-bold uppercase text-[10px] truncate max-w-[150px]">{r.installationOf}</td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-400">{formatDateDDMMYYYY(r.date)}</td>
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
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <ClipboardCheck size={14} className="text-medical-500" />
                                            1. Registry Identity
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="SMIR No. *">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={report.smirNo || ''} onChange={e => setReport({...report, smirNo: e.target.value})} placeholder="SMIR-001" />
                                            </FormRow>
                                            <FormRow label="Installation Date">
                                                <input type="date" className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.date || ''} onChange={e => setReport({...report, date: e.target.value})} />
                                            </FormRow>
                                            <div className="lg:col-span-2">
                                                <FormRow label="Equipment Model *">
                                                    <AutoSuggest
                                                        value={report.installationOf || ''}
                                                        onChange={(val) => setReport({ ...report, installationOf: val })}
                                                        onSelect={(p) => setReport({ ...report, installationOf: p.name })}
                                                        suggestions={products}
                                                        filterKey="name"
                                                        placeholder="Select machine model..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none uppercase"
                                                    />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Building2 size={14} className="text-medical-500" />
                                            2. Consignee / Site Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <FormRow label="Customer (As Per Invoice) *">
                                                    <AutoSuggest
                                                        value={report.customerName || ''}
                                                        onChange={(val) => setReport({ ...report, customerName: val })}
                                                        onSelect={(c) => setReport({ ...report, customerName: c.name, customerHospital: c.hospital || c.name, customerAddress: c.address || '' })}
                                                        suggestions={clients}
                                                        filterKey="name"
                                                        placeholder="Billing entity..."
                                                        className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <FormRow label="Facility / Site Name">
                                                    <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.customerHospital || ''} onChange={e => setReport({...report, customerHospital: e.target.value})} placeholder="Hospital name..." />
                                                </FormRow>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                                <FormRow label="Full Site Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-medium outline-none h-[115px] resize-none uppercase" value={report.customerAddress || ''} onChange={e => setReport({...report, customerAddress: e.target.value})} placeholder="Complete delivery location..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4 pb-20">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Shield size={14} className="text-medical-500" />
                                            3. Machine Identity & Training
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="Machine Serial #">
                                                <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-black outline-none" value={report.serialNumber || ''} onChange={e => setReport({...report, serialNumber: e.target.value})} placeholder="SN-123456" />
                                            </FormRow>
                                            <FormRow label="Assigned Engineer">
                                                <input type="text" className="w-full h-[42px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black text-slate-500" value={report.engineerName || ''} readOnly />
                                            </FormRow>
                                            <div className="sm:col-span-2">
                                                <FormRow label="Trained Personnel (Site Doctors/Staff)">
                                                    <input type="text" className="w-full h-[42px] bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.trainedPersons || ''} onChange={e => setReport({...report, trainedPersons: e.target.value})} placeholder="Name of persons trained..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4 items-start">
                                            <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm shrink-0"><CheckCircle2 size={16}/></div>
                                            <div className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase tracking-tight">
                                                The above referred unit has been supplied in good condition and installed successfully. 
                                                The same is functioning satisfactorily. The required training on the use of the said machine has been given to us.
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                                    <button 
                                        onClick={() => { setViewState('history'); setEditingId(null); }}
                                        className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-300 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors order-2 sm:order-1"
                                    >
                                        Discard
                                    </button>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button 
                                            onClick={() => handleSave('Draft')}
                                            className="flex-1 px-8 py-3.5 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 active:scale-95"
                                        >
                                            Save Draft
                                        </button>
                                        <button 
                                            onClick={() => { handleSave('Finalized'); handleDownloadPDF(report); }}
                                            className="flex-1 px-8 py-3.5 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:from-medical-700 hover:to-teal-600 transition-all shadow-xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Finalize & Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderReportTemplate(report)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};