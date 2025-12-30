import React, { useState, useMemo, useEffect } from 'react';
import { ServiceReport, ServiceReportItem } from '../types';
import { 
    Plus, Search, Trash2, PenTool, 
    History, Download, Edit, Eye, List as ListIcon, Calendar, ArrowLeft, Save, Clock, Building2, User, Settings, CreditCard, DollarSign, CheckSquare, Square
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

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
    const { clients, products, invoices, addClient, addNotification } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [reports, setReports] = useState<DetailedServiceReport[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

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
        engineerName: 'S. Suresh Kumar',
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
            setReport(prev => ({
                ...prev,
                reportNumber: `${String(reports.length + 101).padStart(3, '0')}`
            }));
        }
    }, [viewState, reports.length, editingId, report.reportNumber]);

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

    const handleDownloadPDF = (data: DetailedServiceReport) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('SREE MEDITEC', pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai 600 073.', pageWidth / 2, 20, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 24, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SERVICE REPORT', pageWidth / 2, 30, { align: 'center' });

        autoTable(doc, {
            startY: 33,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Sr No: ${data.reportNumber || '000'}.`, `Office: ${data.office || ''}`, `Name of Engineer: ${data.engineerName || ''}`, `Date: ${formatDateDDMMYYYY(data.date)}`, `Time: ${data.time || ''}`]
            ],
            columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 50 }, 3: { cellWidth: 40 }, 4: { cellWidth: 30 } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Customer Name: ${data.customerName || ''}`, `Machine Name: ${data.equipmentName || ''}`]
            ],
            columnStyles: { 0: { cellWidth: (pageWidth - 20) * 0.5 }, 1: { cellWidth: (pageWidth - 20) * 0.5 } }
        });

        const statusBox = (isChecked: boolean) => isChecked ? '[ X ]' : '[   ]';
        const statusText = `Machine Status: (Tick Correct Option)\n\n${statusBox(data.machineStatus === 'Warranty')} Warranty  ${statusBox(data.machineStatus === 'Out Of Warranty')} Out Of Warranty  ${statusBox(data.machineStatus === 'AMC')} AMC`;

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [
                    { content: `Address:\n\n${data.customerAddress || ''}`, rowSpan: 2 },
                    { content: statusText }
                ],
                [`Software version: ${data.softwareVersion || ''}`]
            ],
            columnStyles: { 0: { cellWidth: (pageWidth - 20) * 0.5 }, 1: { cellWidth: (pageWidth - 20) * 0.5 } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 20, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Complaint as received from the customer:\n\n${data.problemReported || ''}`, `Engineer's observations and remarks:\n\n${data.engineerObservations || ''}`]
            ],
            columnStyles: { 0: { cellWidth: (pageWidth - 20) * 0.5 }, 1: { cellWidth: (pageWidth - 20) * 0.5 } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [[`PO/WO No: received from the customer: ${data.poWoNumber || ''}`]]
        });

        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Action taken by Engineer (Give Specific information)', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4, { align: 'center' });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 6,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 12, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Hardware/\nConsumables:`, data.actionHardware || ''],
                [`Operational:`, data.actionOperational || ''],
                [`Software:`, data.actionSoftware || '']
            ],
            columnStyles: { 0: { cellWidth: 30, fontStyle: 'bold' } }
        });

        let currentY = (doc as any).lastAutoTable.finalY;
        const boxHeight = 70;
        
        if (currentY + boxHeight > pageHeight - 10) {
            doc.addPage();
            currentY = margin;
        }

        doc.rect(margin, currentY, pageWidth - 20, boxHeight);
        doc.line(pageWidth * 0.5, currentY, pageWidth * 0.5, currentY + boxHeight);

        const finX = pageWidth * 0.5;
        const rowH = boxHeight / 7;

        const settlement = [
            ['Past balance (A):', (data.pastBalance || 0).toFixed(2)],
            ['Visit Charges Payable (B):', (data.visitCharges || 0).toFixed(2)],
            ['Spares/ Consumables Charges payable (C):', finTotals.sparesTotal.toFixed(2)],
            ['Total receivable(D) (A+B+C):', finTotals.totalReceivable.toFixed(2)],
            ['Amount received(E):', (data.amountReceived || 0).toFixed(2)],
            ['Present net balance (D-E):', finTotals.netBalance.toFixed(2)],
            ['Cash/Credit Memo No (If it is raised):', data.memoNumber || '---']
        ];

        settlement.forEach((row, i) => {
            const y = currentY + (i * rowH);
            doc.line(finX, y + rowH, pageWidth - margin, y + rowH);
            doc.line(pageWidth - 40, y, pageWidth - 40, y + rowH);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.text(row[0], finX + 2, y + (rowH / 2) + 1.5);
            doc.setFont('helvetica', 'bold');
            doc.text(row[1], pageWidth - margin - 2, y + (rowH / 2) + 1.5, { align: 'right' });
        });

        doc.setFontSize(8);
        doc.text('Signature of the customer', margin + 15, currentY + 15);
        doc.setFontSize(7);
        doc.text('(Please affix Stamp)', margin + 19, currentY + 19);

        doc.line(margin, currentY + 30, finX, currentY + 30);
        doc.setFont('helvetica', 'bold');
        doc.text("Engineer's queries/ remarks/ follow up Action etc. If any:", margin + 2, currentY + 34);
        doc.setFont('helvetica', 'normal');
        doc.text(data.queriesRemarks || '', margin + 2, currentY + 40, { maxWidth: finX - margin - 4 });

        doc.setFont('helvetica', 'bold');
        doc.text('Signature of the Engineer', margin + 15, currentY + boxHeight - 4);

        doc.save(`SreeMeditec_SR_${data.reportNumber}.pdf`);
    };

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name === inputValue || c.hospital === inputValue);
        if (client) {
            setReport(prev => ({
                ...prev,
                customerName: client.name,
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
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) updated.unitPrice = masterProd.price;
                    }
                    updated.amount = updated.quantity * updated.unitPrice;
                    return updated;
                }
                return item;
            });
            return { ...prev, itemsUsed: updatedItems };
        });
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!report.customerName || !report.equipmentName) {
            alert("Please fill customer name and machine details.");
            return;
        }
        const finalData: DetailedServiceReport = {
            ...report,
            id: editingId || `SR-${Date.now()}`,
            status: status === 'Draft' ? 'Draft' : 'Completed',
            documentType: 'ServiceReport'
        };
        if (editingId) setReports(prev => prev.map(r => r.id === editingId ? finalData : r));
        else setReports(prev => [finalData, ...prev]);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Service Report ${finalData.reportNumber} saved as ${status}.`, 'success');
    };

    const renderReportTemplate = (data: DetailedServiceReport, fin: any) => (
        <div className="bg-white p-[8mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-xl mx-auto overflow-hidden text-black select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="text-center mb-4">
                <h1 className="text-4xl font-bold uppercase tracking-tight leading-none mb-1">SREE MEDITEC</h1>
                <p className="text-[10px] font-semibold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai 600 073.</p>
                <p className="text-[10px] font-semibold">Mob: 9884818398</p>
            </div>
            
            <div className="text-center py-1 font-bold text-sm uppercase tracking-widest border-y border-black mb-2">SERVICE REPORT</div>

            <div className="grid grid-cols-5 border border-black text-[9px] mb-[-1px] font-bold">
                <div className="border-r border-black p-1.5 flex gap-1"><span>Sr No:</span><span className="font-normal">{data.reportNumber || '000'}</span></div>
                <div className="border-r border-black p-1.5 flex gap-1"><span>Office:</span><span className="font-normal">{data.office}</span></div>
                <div className="border-r border-black p-1.5 flex gap-1"><span>Engineer:</span><span className="font-normal">{data.engineerName}</span></div>
                <div className="border-r border-black p-1.5 flex gap-1"><span>Date:</span><span className="font-normal">{formatDateDDMMYYYY(data.date)}</span></div>
                <div className="p-1.5 flex gap-1"><span>Time:</span><span className="font-normal">{data.time}</span></div>
            </div>

            <div className="grid grid-cols-2 border border-black text-[10px] mb-[-1px] font-bold">
                <div className="border-r border-black p-1.5 flex gap-2"><span>Customer Name:</span><span className="font-normal uppercase">{data.customerName}</span></div>
                <div className="p-1.5 flex gap-2"><span>Machine Name:</span><span className="font-normal">{data.equipmentName}</span></div>
            </div>

            <div className="grid grid-cols-2 border border-black text-[10px] mb-[-1px]">
                <div className="border-r border-black p-2 min-h-[60px] row-span-2">
                    <p className="font-bold underline mb-1">Address:</p>
                    <p className="whitespace-pre-wrap leading-tight">{data.customerAddress}</p>
                </div>
                <div className="p-2 border-b border-black h-1/2">
                    <p className="font-bold text-[9px]">Machine Status: (Tick Correct Option)</p>
                    <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <div className="w-3.5 h-3.5 border border-black flex items-center justify-center font-black text-[10px]">
                                {data.machineStatus === 'Warranty' ? 'X' : ''}
                            </div>
                            <span>Warranty</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <div className="w-3.5 h-3.5 border border-black flex items-center justify-center font-black text-[10px]">
                                {data.machineStatus === 'Out Of Warranty' ? 'X' : ''}
                            </div>
                            <span>Out Of Warranty</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <div className="w-3.5 h-3.5 border border-black flex items-center justify-center font-black text-[10px]">
                                {data.machineStatus === 'AMC' ? 'X' : ''}
                            </div>
                            <span>AMC</span>
                        </label>
                    </div>
                </div>
                <div className="p-2 font-bold h-1/2 flex items-center">
                    <span>Software version:</span>
                    <span className="font-normal ml-2">{data.softwareVersion}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 border border-black text-[10px] mb-[-1px] min-h-[90px]">
                <div className="border-r border-black p-2">
                    <p className="font-bold mb-1 underline">Complaint as received from the customer:</p>
                    <p className="italic text-slate-700 leading-relaxed">{data.problemReported}</p>
                </div>
                <div className="p-2">
                    <p className="font-bold mb-1 underline">Engineer’s observations and remarks:</p>
                    <p className="italic text-slate-700 leading-relaxed">{data.engineerObservations}</p>
                </div>
            </div>

            <div className="border border-black text-[10px] p-2 font-bold mb-[-1px]">
                PO/WO No: received from the customer: <span className="font-normal ml-2">{data.poWoNumber}</span>
            </div>

            <div className="border-x border-black bg-slate-50 text-center py-1 font-bold text-[10px] uppercase tracking-wide">
                Action taken by Engineer (Give Specific information)
            </div>

            <div className="border border-black text-[10px] mb-[-1px]">
                <div className="grid grid-cols-[130px_1fr] border-b border-black min-h-[50px]">
                    <div className="p-2 border-r border-black font-bold flex items-center">Hardware / Consumables:</div>
                    <div className="p-2 italic leading-relaxed">{data.actionHardware}</div>
                </div>
                <div className="grid grid-cols-[130px_1fr] border-b border-black min-h-[50px]">
                    <div className="p-2 border-r border-black font-bold flex items-center">Operational:</div>
                    <div className="p-2 italic leading-relaxed">{data.actionOperational}</div>
                </div>
                <div className="grid grid-cols-[130px_1fr] min-h-[50px]">
                    <div className="p-2 border-r border-black font-bold flex items-center">Software:</div>
                    <div className="p-2 italic leading-relaxed">{data.actionSoftware}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 border border-black text-[10px] flex-1">
                <div className="border-r border-black flex flex-col h-full">
                    <div className="h-[40%] p-6 flex flex-col justify-center items-center text-center">
                        <div className="h-12 border-b border-dotted border-black w-3/4 mb-1 opacity-20"></div>
                        <p className="font-bold">Signature of the customer</p>
                        <p className="text-[8px] italic">(Please affix Stamp)</p>
                    </div>
                    <div className="border-y border-black p-3 flex-1 min-h-[120px]">
                        <p className="font-bold underline mb-1">Engineer’s queries/ remarks/ follow up Action etc. If any:</p>
                        <p className="italic text-slate-700 leading-relaxed">{data.queriesRemarks}</p>
                    </div>
                    <div className="p-6 flex flex-col items-center text-center mt-auto">
                         <div className="h-10 border-b border-dotted border-black w-3/4 mb-1 opacity-20"></div>
                         <p className="font-bold">Signature of the Engineer</p>
                    </div>
                </div>
                <div className="flex flex-col bg-white">
                    {[
                        { l: 'Past balance (A):', v: data.pastBalance, isBold: false },
                        { l: 'Visit Charges Payable (B):', v: data.visitCharges, isBold: false },
                        { l: 'Spares/ Consumables Charges payable (C):', v: fin.sparesTotal, isBold: false },
                        { l: 'Total receivable (D) (A+B+C):', v: fin.totalReceivable, isBold: true },
                        { l: 'Amount received (E):', v: data.amountReceived, isBold: false },
                        { l: 'Present net balance (D-E):', v: fin.netBalance, isBold: true },
                        { l: 'Cash/Credit Memo No (If it is raised):', v: data.memoNumber, isBold: false, isText: true }
                    ].map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_100px] border-b border-black last:border-b-0 h-[42px]">
                            <div className={`p-2.5 border-r border-black flex items-center ${row.isBold ? 'font-bold bg-slate-50' : ''}`}>{row.l}</div>
                            <div className={`p-2.5 text-right flex items-center justify-end font-mono text-sm ${row.isBold ? 'font-black bg-slate-100/50' : ''}`}>
                                {row.isText ? row.v : Number(row.v).toFixed(2)}
                            </div>
                        </div>
                    ))}
                    <div className="flex-1 bg-white"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button onClick={() => { setViewState('builder'); setEditingId(null); setReport({ date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }), itemsUsed: [], status: 'Completed', engineerName: 'S. Suresh Kumar', office: 'Chennai', machineStatus: 'Warranty', softwareVersion: '', pastBalance: 0, visitCharges: 0, amountReceived: 0 }); setBuilderTab('form'); }} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><PenTool size={16} /> New Report</button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xs tracking-widest">Field Service Log</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">ID #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Machine</th>
                                    <th className="px-6 py-4 text-center">Visit Date</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reports.length > 0 ? reports.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 font-black text-indigo-600">{r.reportNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{r.customerName}</td>
                                        <td className="px-6 py-4 text-slate-600">{r.equipmentName}</td>
                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{formatDateDDMMYYYY(r.date)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                r.status === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>{r.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setReport(r); setEditingId(r.id!); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(r)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"><Download size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest opacity-20 italic">No reports found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Form</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><ListIcon size={18}/> Spares</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar bg-white">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Visit Log Details</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Report #</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.reportNumber} onChange={e => setReport({...report, reportNumber: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Office Location</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.office} onChange={e => setReport({...report, office: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Engineer</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.engineerName} onChange={e => setReport({...report, engineerName: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Visit Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.date} onChange={e => setReport({...report, date: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Arrival Time</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.time} onChange={e => setReport({...report, time: e.target.value})} />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer & Machine Info</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={report.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Customer Search..." />
                                        <input type="text" list="prod-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5" value={report.equipmentName || ''} onChange={e => setReport({...report, equipmentName: e.target.value})} placeholder="Machine / Equipment Name *" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.customerAddress || ''} onChange={e => setReport({...report, customerAddress: e.target.value})} placeholder="Service Address" />
                                        <div className="space-y-3">
                                            <select className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.machineStatus} onChange={e => setReport({...report, machineStatus: e.target.value as any})}>
                                                <option value="Warranty">Warranty</option>
                                                <option value="Out Of Warranty">Out Of Warranty</option>
                                                <option value="AMC">AMC</option>
                                            </select>
                                            <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none" value={report.softwareVersion} onChange={e => setReport({...report, softwareVersion: e.target.value})} placeholder="Firmware / Software Version" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.problemReported || ''} onChange={e => setReport({...report, problemReported: e.target.value})} placeholder="Complaint as received from customer..." />
                                        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.engineerObservations || ''} onChange={e => setReport({...report, engineerObservations: e.target.value})} placeholder="Technician observations..." />
                                    </div>
                                    <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.poWoNumber} onChange={e => setReport({...report, poWoNumber: e.target.value})} placeholder="PO/WO Reference Number" />
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Technician Action Summary</h3>
                                    <div className="space-y-4">
                                        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.actionHardware || ''} onChange={e => setReport({...report, actionHardware: e.target.value})} placeholder="Hardware / Component Actions..." />
                                        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.actionOperational || ''} onChange={e => setReport({...report, actionOperational: e.target.value})} placeholder="Operational / Process Actions..." />
                                        <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.actionSoftware || ''} onChange={e => setReport({...report, actionSoftware: e.target.value})} placeholder="Software / Configuration Actions..." />
                                    </div>
                                </section>

                                <section className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Settlement Summary</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Past Balance (A)</label>
                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.pastBalance} onChange={e => setReport({...report, pastBalance: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Visit Charges (B)</label>
                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.visitCharges} onChange={e => setReport({...report, visitCharges: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Amount Received (E)</label>
                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.amountReceived} onChange={e => setReport({...report, amountReceived: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Memo / Receipt #</label>
                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={report.memoNumber} onChange={e => setReport({...report, memoNumber: e.target.value})} placeholder="Voucher Ref" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-200">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Follow up / Remarks</label>
                                        <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={report.queriesRemarks} onChange={e => setReport({...report, queriesRemarks: e.target.value})} placeholder="Next maintenance date, spare parts required, etc..." />
                                    </div>
                                </section>

                                <div className="flex flex-col sm:flex-row gap-3 pt-6 sticky bottom-0 bg-white pb-4 border-t border-slate-50 z-30">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-3 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(report); }} className="w-full sm:flex-[2] py-3 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-lg active:scale-95 transition-all">Finalize & Download</button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderReportTemplate(report, finTotals)}
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-6 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-slate-800 uppercase tracking-tight">Spare Parts Selection</h3>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none w-48" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.filter(p => p.category !== 'Equipment').map(prod => (
                                        <div key={prod.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group" onClick={() => handleAddItem(prod)}>
                                            <div className="flex-1">
                                                <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{prod.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">₹{prod.price.toLocaleString()} • {prod.sku}</p>
                                            </div>
                                            <div className="ml-4 p-1.5 bg-white rounded-lg border border-slate-100 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm"><Plus size={16} /></div>
                                        </div>
                                    ))}
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