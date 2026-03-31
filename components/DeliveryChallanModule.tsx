import React, { useState, useEffect } from 'react';
import { DeliveryChallan, StockMovement } from '../types';
import { 
    Plus, Download, Search, Trash2, 
    Save, Edit, Eye, List as ListIcon, PenTool, 
    History, FileText, MoreVertical
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

export const DeliveryChallanModule: React.FC = () => {
    const { clients, products, deliveryChallans, addDeliveryChallan, updateDeliveryChallan, updateProduct, recordStockMovement, addNotification } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [challan, setChallan] = useState<Partial<DeliveryChallan>>({
        challanNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Draft',
        customerName: '',
        customerAddress: ''
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !challan.challanNumber) {
            setChallan(prev => ({
                ...prev,
                challanNumber: `SM/DC/${String(deliveryChallans.length + 101).padStart(3, '0')}`
            }));
        }
    }, [viewState, deliveryChallans.length, editingId, challan.challanNumber]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleDownloadPDF = (data: Partial<DeliveryChallan>) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const midX = pageWidth / 2;
        const margin = 10;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Delivery Challan', midX, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('(ORIGINAL FOR RECIPIENT)', pageWidth - margin, 10, { align: 'right' });

        doc.setLineWidth(0.1);
        doc.rect(margin, 12, pageWidth - (margin * 2), 78);
        doc.line(midX, 12, midX, 90);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SREE MEDITEC', margin + 2, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Old No.2 New No.18, Bajanai Koil Street,', margin + 2, 23);
        doc.text('Rajakilpakkam, Chennai -73', margin + 2, 27);
        doc.text('Ph.9884818398/ 7200025642', margin + 2, 31);
        doc.text('GSTIN/UIN: 33APGPS4675G2ZL', margin + 2, 35);
        doc.text('State Name : Tamil Nadu, Code : 33', margin + 2, 39);
        doc.text('E-Mail : sreemeditec@gmail.com', margin + 2, 43);

        const rowH = 13;
        const startY = 12;
        doc.line(midX, startY + rowH, pageWidth - margin, startY + rowH);
        doc.line(midX, startY + (rowH * 2), pageWidth - margin, startY + (rowH * 2));
        doc.line(midX, startY + (rowH * 3), pageWidth - margin, startY + (rowH * 3));
        
        const innerMid = midX + ((pageWidth - margin - midX) / 2);
        doc.line(innerMid, startY, innerMid, startY + (rowH * 2));

        doc.setFontSize(7);
        doc.text('Challan No.', midX + 1, startY + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(data.challanNumber || '', midX + 1, startY + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Dated', innerMid + 1, startY + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(formatDateDDMMYYYY(data.date), innerMid + 1, startY + 9);

        doc.setFont('helvetica', 'normal');
        doc.text('Delivery Note', midX + 1, startY + rowH + 4);
        doc.text('Reference No.', innerMid + 1, startY + rowH + 4);

        doc.text('Subject:', midX + 1, startY + (rowH * 2) + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(data.subject || 'Supply of Medical Equipments', midX + 1, startY + (rowH * 2) + 9);

        doc.line(margin, 46, midX, 46);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Consignee (Ship to)', margin + 2, 49);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 2, 53);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', midX - margin - 5);
        doc.text(addrLines, margin + 2, 57);

        const itemsBody = (data.items || []).map((it, idx) => [
            idx + 1, 
            it.description, 
            `${it.quantity} ${it.unit || 'Nos'}`, 
            it.remarks || ''
        ]);

        autoTable(doc, {
            startY: 90,
            head: [['Sl No.', 'Description of Goods', 'Quantity', 'Remarks']],
            body: itemsBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: { 
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 100 },
                2: { cellWidth: 30, halign: 'center' },
                3: { cellWidth: 45 }
            }
        });

        const tableFinalY = (doc as any).lastAutoTable.finalY || 150;

        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions:', margin, tableFinalY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text('1. Goods once sold will not be taken back.', margin, tableFinalY + 15);
        doc.text('2. Our responsibility ceases as soon as the goods leave our premises.', margin, tableFinalY + 20);

        doc.setFont('helvetica', 'bold');
        doc.text('for SREE MEDITEC', pageWidth - margin - 5, tableFinalY + 30, { align: 'right' });
        doc.text('Authorised Signatory', pageWidth - margin - 5, tableFinalY + 50, { align: 'right' });

        doc.save(`Challan_${data.challanNumber || 'New'}.pdf`);
    };

    const handleSave = async (status: 'Draft' | 'Dispatched') => {
        if (!challan.customerName || !challan.items?.length) {
            alert("Please fill customer details and add at least one item.");
            return;
        }

        const finalData: DeliveryChallan = {
            ...challan as DeliveryChallan,
            id: editingId || `DC-${Date.now()}`,
            status: status
        };

        try {
            if (editingId) {
                await updateDeliveryChallan(editingId, finalData);
            } else {
                await addDeliveryChallan(finalData);
            }

            if (status === 'Dispatched') {
                for (const item of finalData.items) {
                    const product = products.find(p => p.name === item.description);
                    if (product) {
                        const newStock = Math.max(0, product.stock - item.quantity);
                        await updateProduct(product.id, { stock: newStock });
                        
                        const movement: StockMovement = {
                            id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            productId: product.id,
                            productName: product.name,
                            type: 'Out',
                            quantity: item.quantity,
                            date: finalData.date,
                            reference: finalData.challanNumber,
                            purpose: 'Sale'
                        };
                        await recordStockMovement(movement);
                    }
                }
            }

            setViewState('history');
            setEditingId(null);
            addNotification('Registry Updated', `Challan ${finalData.challanNumber} archived.`, 'success');
        } catch (err) {
            console.error("Save error:", err);
            addNotification('Save Failed', 'Could not persist data.', 'alert');
        }
    };

    const filteredCatalog = products.filter(p => 
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
        p.category.toLowerCase().includes(catalogSearch.toLowerCase())
    );

    const handleAddItem = (p?: any) => {
        setChallan(prev => ({
            ...prev,
            items: [
                ...(prev.items || []),
                { 
                    id: `ITM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                    description: p?.name || '', 
                    quantity: 1, 
                    unit: p?.unit || 'Nos', 
                    remarks: '' 
                }
            ]
        }));
        if (builderTab !== 'form') setBuilderTab('form');
    };

    const updateItem = (id: string, field: string, value: any) => {
        setChallan(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unit = masterProd.unit || 'Nos';
                        }
                    }
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const onSelectItem = (p: any) => {
        handleAddItem(p);
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button 
                    onClick={() => setViewState('history')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={16} /> Registry
                </button>
                <button 
                    onClick={() => {
                        setEditingId(null);
                        setChallan({
                            challanNumber: '',
                            date: new Date().toISOString().split('T')[0],
                            items: [],
                            status: 'Draft',
                            customerName: '',
                            customerAddress: ''
                        });
                        setViewState('builder');
                    }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <PenTool size={16} /> New Challan
                </button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Delivery Challan Archive</h3>
                        <span className="px-3 py-1 bg-medical-50 text-medical-700 rounded-full text-[10px] font-black">
                            Total: {deliveryChallans.length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">Challan #</th>
                                    <th className="px-6 py-4">Consignee</th>
                                    <th className="px-6 py-4">Author</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {deliveryChallans.length > 0 ? deliveryChallans.map((c: any) => (
                                    <tr key={c.id} onClick={() => { setChallan(c); setEditingId(c.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0">
                                        <td className="px-6 py-4 font-black">{c.challanNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{c.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div 
                                                title={c.createdBy || 'System'}
                                                className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200 cursor-help"
                                            >
                                                {c.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${c.status === 'Dispatched' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative flex justify-end">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === c.id ? null : c.id); 
                                                    }} 
                                                    className={`p-2 rounded-xl transition-all ${activeMenuId === c.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === c.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px] border-slate-300">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setChallan(c); setEditingId(c.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Edit Challan"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(c); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all flex-1 flex justify-center"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-bold">
                                            No challans found in registry
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-300 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap transition-all ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Form Builder</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap transition-all ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><ListIcon size={18}/> Catalog Selection</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap transition-all ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Visual Preview</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-white">
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-12 lg:col-span-4 space-y-6">
                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm space-y-4">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Client Identity</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Hospital / Client Name</label>
                                                    <input 
                                                        list="client-list"
                                                        value={challan.customerName}
                                                        onChange={e => {
                                                            const name = e.target.value;
                                                            const client = clients.find(c => c.hospital === name || c.name === name);
                                                            setChallan(prev => ({ 
                                                                ...prev, 
                                                                customerName: name,
                                                                customerAddress: client?.address || prev.customerAddress 
                                                            }));
                                                        }}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 uppercase"
                                                        placeholder="Search or entry name..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Delivery Address</label>
                                                    <textarea 
                                                        value={challan.customerAddress}
                                                        onChange={e => setChallan(prev => ({ ...prev, customerAddress: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm space-y-4">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Metadata</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Date</label>
                                                    <input 
                                                        type="date"
                                                        value={challan.date}
                                                        onChange={e => setChallan(prev => ({ ...prev, date: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Number</label>
                                                    <input 
                                                        value={challan.challanNumber}
                                                        readOnly
                                                        className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl font-black text-indigo-600 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1 ml-1">Subject of Delivery</label>
                                                <input 
                                                    value={challan.subject || ''}
                                                    onChange={e => setChallan(prev => ({ ...prev, subject: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 outline-none"
                                                    placeholder="e.g. Supply of Spares"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-12 lg:col-span-8 space-y-6">
                                        <div className="bg-white rounded-[2rem] border border-slate-300 shadow-sm overflow-hidden min-h-[400px]">
                                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Goods Manifest</h3>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleAddItem()}
                                                        className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1 hover:bg-white px-3 py-1.5 rounded-lg border border-emerald-100 transition-all font-black bg-emerald-50"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Add Manual Row
                                                    </button>
                                                    <button 
                                                        onClick={() => setBuilderTab('catalog')}
                                                        className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:bg-white px-3 py-1.5 rounded-lg border border-indigo-100 transition-all"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Add from Catalog
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-6">
                                                {challan.items?.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4 border-2 border-dashed border-slate-300 rounded-3xl">
                                                        <FileText className="w-12 h-12 opacity-20" />
                                                        <p className="font-bold uppercase tracking-widest text-xs opacity-50 text-center">Manifest is empty<br/>Search catalog to add items</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {challan.items?.map((item, idx) => (
                                                            <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-300 group">
                                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <input 
                                                                        list="product-list"
                                                                        value={item.description}
                                                                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                                        className="w-full bg-transparent font-bold text-slate-800 outline-none uppercase"
                                                                        placeholder="Enter product description..."
                                                                    />
                                                                    <div className="flex gap-2 items-center mt-1">
                                                                        <input 
                                                                            value={item.remarks || ''}
                                                                            onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                                                                            placeholder="Add serial or remarks..."
                                                                            className="flex-1 bg-transparent text-[10px] font-medium text-slate-400 outline-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300">
                                                                    <input 
                                                                        type="number"
                                                                        value={item.quantity}
                                                                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                                        className="w-12 text-center font-black text-indigo-600 outline-none"
                                                                    />
                                                                    <input 
                                                                        value={item.unit || 'Nos'}
                                                                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                                                        className="w-10 text-[10px] uppercase font-black text-slate-400 outline-none"
                                                                    />
                                                                </div>
                                                                <button 
                                                                    onClick={() => setChallan(prev => ({ ...prev, items: prev.items?.filter(it => it.id !== item.id) }))}
                                                                    className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 scale-110 origin-right pr-4">
                                            <button 
                                                onClick={() => handleSave('Draft')}
                                                className="px-8 py-3 bg-white border border-slate-300 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                            >
                                                <Save className="w-4 h-4" />
                                                Archive Draft
                                            </button>
                                            <button 
                                                onClick={() => handleSave('Dispatched')}
                                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                                            >
                                                <ListIcon className="w-4 h-4" />
                                                Confirm & Dispatch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-white">
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input 
                                            placeholder="Search by name or category..."
                                            value={catalogSearch}
                                            onChange={e => setCatalogSearch(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCatalog.map(p => (
                                        <div 
                                            key={p.id}
                                            onClick={() => onSelectItem(p)}
                                            className="bg-white p-6 rounded-[2rem] border border-slate-300 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group flex items-start gap-4"
                                            title="Click to add to manifest"
                                        >
                                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-700 uppercase truncate">{p.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">STOCK: {p.stock} {p.unit}</p>
                                                <div className="mt-2 flex gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded uppercase tracking-tighter">{p.category}</span>
                                                </div>
                                            </div>
                                            <div className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-5 h-5 text-indigo-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="bg-white w-[800px] shadow-2xl p-12 space-y-8 font-serif leading-relaxed text-slate-800">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-3xl font-black font-sans tracking-tighter">SREE MEDITEC</h2>
                                        <p className="text-[10px] font-sans text-slate-500 uppercase tracking-[0.2em]">Medical Equipment & Spares Division</p>
                                    </div>

                                    <div className="flex justify-between items-start border-y-2 border-slate-300 py-6 font-sans">
                                        <div className="space-y-4 max-w-[50%]">
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Consignee Identity</h4>
                                                <p className="font-bold text-lg leading-tight uppercase">{challan.customerName || '---'}</p>
                                                <p className="text-xs text-slate-500 mt-1 uppercase whitespace-pre-wrap">{challan.customerAddress || '---'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-4">
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Ref</h4>
                                                <p className="font-black text-indigo-600">{challan.challanNumber || 'SM/DC/---'}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Date</h4>
                                                <p className="font-black text-slate-800">{formatDateDDMMYYYY(challan.date)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Manifest Specification</h4>
                                        <table className="w-full font-sans border-collapse">
                                            <thead>
                                                <tr className="border-b-2 border-slate-300">
                                                    <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400 w-16">Item</th>
                                                    <th className="py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Description of Goods</th>
                                                    <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400 w-24">Qty</th>
                                                    <th className="py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400 w-32">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {challan.items?.map((it, idx) => (
                                                    <tr key={it.id}>
                                                        <td className="py-4 text-xs font-bold text-slate-400">#{idx + 1}</td>
                                                        <td className="py-4">
                                                            <p className="font-black text-sm uppercase">{it.description}</p>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <p className="font-black text-sm">{it.quantity} <span className="text-[8px] uppercase text-slate-400">{it.unit}</span></p>
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{it.remarks || '---'}</p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pt-20 flex justify-between items-end font-sans">
                                        <div className="max-w-[50%] space-y-4">
                                            <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl">
                                                <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Registry Terms</h5>
                                                <p className="text-[8px] text-slate-500 font-bold leading-relaxed uppercase">
                                                    1. Goods once specified and dispatched will not be returned.<br/>
                                                    2. Our responsibility ceases as soon as the goods leave our premises.<br/>
                                                    3. Recipient acknowledges conditions of goods upon arrival.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-12">
                                            <div className="w-48 h-px bg-slate-200 ml-auto" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Authorised Personnel</p>
                                                <p className="text-[8px] font-bold text-indigo-400 uppercase mt-1">SREE MEDITEC REGISTRY</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="client-list">
                {clients.map(c => <option key={c.id} value={c.hospital || c.name} />)}
            </datalist>
            <datalist id="product-list">
                {products.map((p, idx) => <option key={idx} value={p.name} />)}
            </datalist>
        </div>
    );
};