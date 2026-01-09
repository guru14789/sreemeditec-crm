
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
            body: [
                [`PO/WO No: received from the customer: ${data.poWoNumber || ''}`]
            ]
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
            unitPrice: prod?.sellingPrice || 0, // USE sellingPrice for Service Charge
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
                        if (masterProd) updated.unitPrice = masterProd.sellingPrice; // USE sellingPrice
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
                        <label className="flex items