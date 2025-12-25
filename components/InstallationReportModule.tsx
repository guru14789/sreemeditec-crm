
import React, { useState, useEffect } from 'react';
import { ServiceReport } from '../types';
import { 
    Plus, History, Download, Edit, Eye, PenTool, Save, X, ArrowLeft, Building2, User, FileText
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
};

interface SimpleInstallationReport extends Partial<ServiceReport> {
    smirNo?: string;
    installationOf?: string;
    trainedPersons?: string;
}

export const InstallationReportModule: React.FC = () => {
    const { clients, products } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview'>('form');
    const [reports, setReports] = useState<SimpleInstallationReport[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [report, setReport] = useState<SimpleInstallationReport>({
        smirNo: '',
        date: new Date().toISOString().split('T')[0],
        installationOf: '',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        trainedPersons: '',
        serialNumber: '',
        engineerName: 'S. Suresh Kumar'
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !report.smirNo) {
            setReport(prev => ({
                ...prev,
                smirNo: `${String(reports.length + 20).padStart(3, '0')}`
            }));
        }
    }, [viewState, reports.length, editingId, report.smirNo]);

    const handleDownloadPDF = (data: SimpleInstallationReport) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('SREE MEDITEC', pageWidth / 2, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 32, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 38, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('INSTALLATION REPORT', pageWidth / 2, 48, { align: 'center' });

        // SMIR & Date
        doc.setFontSize(11);
        doc.text(`SMIR No: ${data.smirNo || ''}`, margin, 58);
        doc.text(`DATE: ${formatDateDDMMYYYY(data.date)}`, pageWidth - margin - 40, 58);

        // Structured Table
        autoTable(doc, {
            startY: 62,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { 
                fontSize: 10, 
                cellPadding: 4, 
                lineColor: [0, 0, 0], 
                lineWidth: 0.2, 
                textColor: [0, 0, 0],
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 70, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            body: [
                [{ content: `Installation Report Of: ${data.installationOf || ''}`, colSpan: 3, styles: { fontStyle: 'bold' } }],
                ['1', 'Name of the Customer\n(As Per Invoice)', data.customerName || ''],
                ['2', 'Name of the Hospital/Clinic/Diagnostic\nCentre', data.customerHospital || ''],
                ['3', 'Address of the site of Installation', data.customerAddress || ''],
                ['4', 'Date of Installation', formatDateDDMMYYYY(data.date)],
                ['5', 'Name of the Persons trained to use and\noperate the above said machine', data.trainedPersons || ''],
                ['6', 'Serial No of Machine', data.serialNumber || '']
            ]
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // Confirmation Text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const confirmationText = "The above referred unit has been supplied in good condition and installed successfully\nThe same is functioning satisfactorily. The required training on the use of the said machine has been given to us.";
        doc.rect(margin, finalY, pageWidth - (margin * 2), 20);
        doc.text(confirmationText, margin + 2, finalY + 8);

        // Note
        const noteY = finalY + 20;
        doc.rect(margin, noteY, pageWidth - (margin * 2), 15);
        doc.setFont('helvetica', 'bold');
        doc.text('Note: Training will be given only once', margin + 2, noteY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text('All disputes are subject to Chennai jurisdiction only.', margin + 2, noteY + 11);

        // Signatures
        const sigY = noteY + 15;
        doc.rect(margin, sigY, pageWidth - (margin * 2), 35);
        doc.line(pageWidth / 2, sigY, pageWidth / 2, sigY + 35);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Company Service engineer Signature', margin + 15, sigY + 8);
        doc.text('Customer Seal and Signature', (pageWidth / 2) + 15, sigY + 8);

        doc.save(`Installation_Report_${data.smirNo}.pdf`);
    };

    const handleSave = () => {
        if (!report.customerName || !report.installationOf) {
            alert("Customer Name and Machine Name are required.");
            return;
        }
        const finalData: SimpleInstallationReport = {
            ...report,
            id: editingId || `INS-${Date.now()}`,
            documentType: 'InstallationReport'
        };
        if (editingId) setReports(prev => prev.map(r => r.id === editingId ? finalData : r));
        else setReports(prev => [finalData, ...prev]);
        setViewState('history');
        setEditingId(null);
    };

    const renderReportTemplate = (data: SimpleInstallationReport) => (
        <div className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col shadow-2xl mx-auto overflow-hidden select-none border border-slate-300" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-5xl font-bold uppercase mb-2 tracking-tight">SREE MEDITEC</h1>
                <p className="text-[12px]">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[12px] font-bold">Mob: 9884818398</p>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-xl font-bold border-b-2 border-black inline-block pb-0.5 uppercase tracking-wider">INSTALLATION REPORT</h2>
            </div>

            {/* SMIR & Date Header */}
            <div className="flex justify-between font-bold text-base mb-2 px-1">
                <div>SMIR No: {data.smirNo}</div>
                <div>DATE: {formatDateDDMMYYYY(data.date)}</div>
            </div>

            {/* Structured Main Table */}
            <div className="border-[0.5px] border-black">
                {/* Installation Of merged row */}
                <div className="border-b border-black p-3 font-bold text-sm bg-slate-50/50">
                    Installation Report Of: <span className="font-normal ml-2">{data.installationOf}</span>
                </div>

                {/* Data Rows */}
                {[
                    { id: '1', label: 'Name of the Customer\n(As Per Invoice)', value: data.customerName },
                    { id: '2', label: 'Name of the Hospital/Clinic/Diagnostic\nCentre', value: data.customerHospital },
                    { id: '3', label: 'Address of the site of Installation', value: data.customerAddress },
                    { id: '4', label: 'Date of Installation', value: formatDateDDMMYYYY(data.date) },
                    { id: '5', label: 'Name of the Persons trained to use and\noperate the above said machine', value: data.trainedPersons },
                    { id: '6', label: 'Serial No of Machine', value: data.serialNumber }
                ].map((row, idx) => (
                    <div key={idx} className="flex border-b last:border-b-0 border-black min-h-[50px]">
                        <div className="w-10 border-r border-black flex items-center justify-center font-bold text-sm bg-slate-50/30">{row.id}</div>
                        <div className="w-[280px] border-r border-black p-3 font-bold text-[11px] leading-tight flex items-center">{row.label.split('\n').map((l, i) => <div key={i}>{l}</div>)}</div>
                        <div className="flex-1 p-3 text-[12px] flex items-center uppercase">{row.value}</div>
                    </div>
                ))}
            </div>

            {/* Confirmation Box */}
            <div className="border-x border-b border-black p-4 text-[12px] leading-relaxed bg-slate-50/20">
                The above referred unit has been supplied in good condition and installed successfully<br/>
                The same is functioning satisfactorily. The required training on the use of the said machine has been given to us.
            </div>

            {/* Note Box */}
            <div className="border-x border-b border-black p-4 text-[11px]">
                <p className="font-bold mb-1">Note: Training will be given only once</p>
                <p>All disputes are subject to Chennai jurisdiction only.</p>
            </div>

            {/* Signature Area */}
            <div className="border-x border-b border-black grid grid-cols-2 min-h-[140px]">
                <div className="border-r border-black p-4 flex flex-col">
                    <p className="font-bold text-[11px] text-center">Company Service engineer Signature</p>
                    <div className="flex-1 flex items-end justify-center pb-2">
                        <span className="text-[10px] font-mono opacity-20">__________________________</span>
                    </div>
                </div>
                <div className="p-4 flex flex-col">
                    <p className="font-bold text-[11px] text-center">Customer Seal and Signature</p>
                    <div className="flex-1 flex items-end justify-center pb-2">
                         <span className="text-[10px] font-mono opacity-20">__________________________</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Registry</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setReport({ date: new Date().toISOString().split('T')[0], engineerName: 'S. Suresh Kumar' }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Report</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Installation History</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">SMIR #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Machine</th>
                                    <th className="px-6 py-4 text-center">Date</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.length > 0 ? reports.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black text-indigo-600">{r.smirNo}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{r.customerName}</td>
                                        <td className="px-6 py-4 text-slate-600">{r.installationOf}</td>
                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{formatDateDDMMYYYY(r.date)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setReport(r); setEditingId(r.id!); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(r)} className="p-2 text-slate-400 hover:text-emerald-500"><Download size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest opacity-20 italic">No reports found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400'}`}><Eye size={18}/> Print Preview</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Registry</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">SMIR No.</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.smirNo} onChange={e => setReport({...report, smirNo: e.target.value})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.date} onChange={e => setReport({...report, date: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Installation Report Of (Machine Name)</label>
                                        <input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={report.installationOf} onChange={e => setReport({...report, installationOf: e.target.value})} placeholder="e.g. OT light LED TMI Nova 4+4" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer Information</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Customer Name (As Per Invoice)</label>
                                            <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.customerName} onChange={e => setReport({...report, customerName: e.target.value})} placeholder="Billing Entity Name" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hospital / Clinic / Centre Name</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.customerHospital} onChange={e => setReport({...report, customerHospital: e.target.value})} placeholder="Site Facility Name" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Installation Address</label>
                                            <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.customerAddress} onChange={e => setReport({...report, customerAddress: e.target.value})} placeholder="Exact Site Location Details" />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Machine & Training</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Persons Trained</label>
                                            <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.trainedPersons} onChange={e => setReport({...report, trainedPersons: e.target.value})} placeholder="List of doctors/technicians trained" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Serial No. of Machine</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.serialNumber} onChange={e => setReport({...report, serialNumber: e.target.value})} placeholder="Serial Number" />
                                        </div>
                                    </div>
                                </section>

                                <div className="flex gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50">
                                    <button onClick={() => setViewState('history')} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                                    <button onClick={() => { handleSave(); handleDownloadPDF(report); }} className="flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Download PDF & Save</button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderReportTemplate(report)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};
