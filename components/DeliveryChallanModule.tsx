import React, { useState, useMemo, useEffect } from 'react';
import { DeliveryChallan, ChallanItem } from '../types';
import { 
    Truck, Plus, Search, Trash2, History, PenTool, Eye, List as ListIcon, Save, Download, Edit, ArrowLeft, X, FileText
} from 'lucide-react';
import { useData } from './DataContext';
import { jsPDF } from 'jspdf';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

interface ExtendedChallan extends Partial<DeliveryChallan> {
    subject?: string;
}

export const DeliveryChallanModule: React.FC = () => {
    const { clients, products, addNotification } = useData();
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [challans, setChallans] = useState<ExtendedChallan[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');

    const [challan, setChallan] = useState<ExtendedChallan>({
        challanNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Dispatched',
        customerName: '',
        customerAddress: '',
        subject: ''
    });

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !challan.challanNumber) {
            setChallan(prev => ({
                ...prev,
                challanNumber: `${String(challans.length + 10).padStart(3, '0')}`
            }));
        }
    }, [viewState, editingId, challans.length, challan.challanNumber]);

    const handleDownloadPDF = (data: ExtendedChallan) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const printableWidth = pageWidth - (margin * 2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text('SREE MEDITEC', pageWidth / 2, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, RajaKilpakkam, Chennai 600 073.', pageWidth / 2, 38, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('DELIVERY CHALLAN', pageWidth / 2, 55, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`DC No: ${data.challanNumber || ''}`, margin, 70);
        doc.text(`Date: ${formatDateDDMMYYYY(data.date)}.`, pageWidth - margin - 40, 70);

        doc.text('To,', margin, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin, 92);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', 100);
        doc.text(addrLines, margin, 98);

        const subTop = 98 + (addrLines.length * 6) + 15;
        doc.setFont('helvetica', 'bold');
        const itemsList = (data.items || []).map(it => `${it.description} ${it.quantity} ${it.unit || 'no'}`).join(' and ');
        const subjectText = data.subject || `Reg. Delivery of ${itemsList}`;
        const subLines = doc.splitTextToSize(`Sub: ${subjectText}`, printableWidth);
        doc.text(subLines, margin, subTop, { align: 'left' });

        const bodyTop = subTop + (subLines.length * 6) + 15;
        doc.setFont('helvetica', 'normal');
        doc.text('Dear Sir,', margin, bodyTop);

        const itemDetails = (data.items || []).map(it => `${it.description} -${it.quantity} ${it.unit || 'no'}`).join(' and ');
        const bodyContent = `This is with reference to the discussion we had with you and verbal confirmation of the order for ${itemDetails}. We are herewith sending you the same. Kindly receive the same and do acknowledge.`;
        
        const bodyLines = doc.splitTextToSize(bodyContent, printableWidth);
        doc.text(bodyLines, margin, bodyTop + 10, { align: 'left' });

        doc.text('Thanking you,', margin, bodyTop + 10 + (bodyLines.length * 6) + 20);

        const signTop = bodyTop + 10 + (bodyLines.length * 6) + 45;
        doc.setFont('helvetica', 'normal');
        doc.text('With regards,', margin, signTop);
        doc.text('For Sree Meditec,', margin, signTop + 7);
        doc.setFont('helvetica', 'bold');
        doc.text('S.Suresh Kumar', margin, signTop + 14);
        doc.setFont('helvetica', 'normal');
        doc.text('Sreemeditec,', margin, signTop + 21);
        doc.text('9884818398.', margin, signTop + 28);

        doc.save(`DC_${data.challanNumber}_SreeMeditec.pdf`);
    };

    const handleAddItem = (prod?: any) => {
        const newItem: ChallanItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            quantity: 1,
            unit: 'no',
            remarks: prod?.sku || ''
        };
        setChallan(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
        if (builderTab === 'catalog') setBuilderTab('form');
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!challan.customerName || !challan.items?.length) {
            alert("Please fill customer details and add items.");
            return;
        }
        const finalData: ExtendedChallan = {
            ...challan,
            id: editingId || `DC-${Date.now()}`,
            status: status === 'Draft' ? 'Draft' : 'Dispatched'
        };
        if (editingId) setChallans(prev => prev.map(c => c.id === editingId ? finalData : c));
        else setChallans(prev => [finalData, ...prev]);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Delivery Challan ${finalData.challanNumber} saved as ${status}.`, 'success');
    };

    const renderChallanTemplate = (data: ExtendedChallan) => (
        <div className="bg-white p-[20mm] text-black w-full min-h-[297mm] flex flex-col shadow-2xl mx-auto overflow-hidden border border-slate-300 select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="text-center mb-10">
                <h1 className="text-5xl font-bold uppercase mb-2 text-black">SREE MEDITEC</h1>
                <p className="text-[12px] text-slate-700">New No: 18, Old No: 2, Bajanai Koil Street, RajaKilpakkam, Chennai 600 073.</p>
            </div>

            <div className="text-center mb-10">
                <h2 className="text-xl font-bold uppercase tracking-widest border-b-2 border-black inline-block pb-1">DELIVERY CHALLAN</h2>
            </div>

            <div className="flex justify-between font-bold text-lg mb-10 px-2">
                <div>DC No: {data.challanNumber || '---'}</div>
                <div>Date: {formatDateDDMMYYYY(data.date)}.</div>
            </div>

            <div className="mb-10 px-2">
                <p className="font-bold text-lg mb-1">To,</p>
                <div className="ml-0 text-lg">
                    <p className="font-bold uppercase">{data.customerName || '--------------------------'}</p>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{data.customerAddress || '--------------------------'}</p>
                </div>
            </div>

            <div className="mb-10 px-2 text-left">
                <span className="font-bold text-lg leading-relaxed">
                    Sub: Reg. Delivery of {data.items && data.items.length > 0 
                        ? data.items.map(it => `${it.description} (${it.quantity} ${it.unit || 'no'})`).join(' and ')
                        : 'specified items'}
                </span>
            </div>

            <div className="mb-10 px-2">
                <p className="text-lg mb-6">Dear Sir,</p>
                <p className="text-lg leading-[1.8] text-left">
                    This is with reference to the discussion we had with you and verbal confirmation of the order for 
                    <span className="font-bold mx-1">
                        {data.items && data.items.length > 0 
                            ? data.items.map(it => `${it.description} -${it.quantity} ${it.unit || 'no'}`).join(' and ')
                            : 'the specified equipment'
                        }
                    </span>. 
                    We are herewith sending you the same. Kindly receive the same and do acknowledge.
                </p>
            </div>

            <p className="text-lg mb-16 px-2">Thanking you,</p>

            <div className="mt-auto px-2 space-y-1">
                <p className="text-lg">With regards,</p>
                <p className="text-lg">For Sree Meditec,</p>
                <div className="h-4"></div>
                <p className="text-lg font-bold">S.Suresh Kumar</p>
                <p className="text-lg text-slate-600">Sreemeditec,</p>
                <p className="text-lg text-slate-600 font-medium">9884818398.</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit shrink-0 shadow-sm">
                <button 
                    onClick={() => setViewState('history')} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <History size={16} /> Registry
                </button>
                <button 
                    onClick={() => { setViewState('builder'); setEditingId(null); setChallan({ date: new Date().toISOString().split('T')[0], items: [], status: 'Dispatched' }); setBuilderTab('form'); }} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <PenTool size={16} /> New Challan
                </button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center font-black uppercase text-xs tracking-tight text-slate-800">
                        Document History
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[10px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-6 py-4">DC #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4 text-center">Date</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {challans.length > 0 ? challans.map(c => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-black text-medical-600">{c.challanNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{c.customerName}</td>
                                        <td className="px-6 py-4 text-center text-slate-500 font-medium">{formatDateDDMMYYYY(c.date)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                c.status === 'Dispatched' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                c.status === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>{c.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setChallan(c); setEditingId(c.id!); setViewState('builder'); setBuilderTab('form'); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Edit size={18}/></button>
                                                <button onClick={() => handleDownloadPDF(c)} className="p-2 text-slate-400 hover:text-emerald-500 transition-all"><Download size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-20">
                                                <FileText size={48} className="text-slate-400" />
                                                <p className="text-xs font-black uppercase tracking-widest">No challans found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Preview</button>
                        <button onClick={() => setBuilderTab('catalog')} className={`flex-1 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${builderTab === 'catalog' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><ListIcon size={18}/> Spares</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar bg-white">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Document Meta</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">DC Number</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={challan.challanNumber} onChange={e => setChallan({...challan, challanNumber: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dispatch Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={challan.date} onChange={e => setChallan({...challan, date: e.target.value})} />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recipient Information</h3>
                                    <div className="space-y-4">
                                        <input type="text" list="client-list" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={challan.customerName || ''} onChange={e => {
                                            const client = clients.find(c => c.name === e.target.value || c.hospital === e.target.value);
                                            setChallan(prev => ({
                                                ...prev,
                                                customerName: e.target.value,
                                                customerAddress: client ? client.address : prev.customerAddress
                                            }));
                                        }} placeholder="Search Client Index *" />
                                        <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all resize-none" value={challan.customerAddress || ''} onChange={e => setChallan({...challan, customerAddress: e.target.value})} placeholder="Detailed Billing/Site Address" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dispatch Manifest</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100">+ Add Manual</button>
                                            <button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100">+ From Store</button>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {challan.items?.map((item) => (
                                            <div key={item.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group hover:bg-white hover:border-medical-200 transition-all">
                                                <button onClick={() => setChallan({...challan, items: challan.items?.filter(i => i.id !== item.id)})} className="absolute top-2 right-2 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                                <div className="grid grid-cols-12 gap-4">
                                                    <div className="col-span-12 md:col-span-8">
                                                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1">Item Description</label>
                                                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black" placeholder="Item Name" value={item.description} onChange={e => { const updated = (challan.items || []).map(i => i.id === item.id ? {...i, description: e.target.value} : i); setChallan({...challan, items: updated}); }} />
                                                    </div>
                                                    <div className="grid grid-cols-3 md:col-span-4 gap-2">
                                                        <div className="col-span-1">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1 text-center">Qty</label>
                                                            <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-center" value={item.quantity} onChange={e => { const updated = (challan.items || []).map(i => i.id === item.id ? {...i, quantity: Number(e.target.value)} : i); setChallan({...challan, items: updated}); }} />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1 text-center">Unit</label>
                                                            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-center uppercase" placeholder="NOS" value={item.unit} onChange={e => { const updated = (challan.items || []).map(i => i.id === item.id ? {...i, unit: e.target.value} : i); setChallan({...challan, items: updated}); }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {challan.items?.length === 0 && (
                                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                                                <Truck size={40} className="mb-2 opacity-20" />
                                                <p className="text-xs font-black uppercase tracking-widest text-center px-4">The manifest is empty</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <div className="flex flex-col sm:flex-row gap-4 pt-10 sticky bottom-0 bg-white pb-6 border-t border-slate-50 z-30">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-4 bg-white border-2 border-medical-500 text-medical-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                    <button onClick={() => { handleSave('Finalized'); handleDownloadPDF(challan); }} className="w-full sm:flex-[2] py-4 bg-medical-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-3 transition-all active:scale-95">
                                        <Save size={18} /> Finalize & Download
                                    </button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-6 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-500 origin-top scale-[0.45] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderChallanTemplate(challan)}
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-8 overflow-hidden animate-in fade-in">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Inventory Index</h3>
                                        <p className="text-xs font-medium text-slate-400 mt-1">Select items directly from master registry</p>
                                    </div>
                                    <div className="relative">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Search spares..." className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none w-64 focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-6 bg-slate-50/50 border border-slate-200 rounded-[1.5rem] sm:rounded-[2rem] hover:border-medical-400 hover:bg-white transition-all cursor-pointer flex flex-col justify-between group" onClick={() => handleAddItem(prod)}>
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{prod.sku}</span>
                                                <h4 className="font-black text-slate-800 text-base leading-tight mt-1 group-hover:text-medical-700 transition-colors">{prod.name}</h4>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Stock: {prod.stock}</span>
                                                <div className="p-2 bg-white rounded-xl border border-slate-100 group-hover:bg-medical-600 group-hover:text-white transition-all shadow-sm">
                                                    <Plus size={18} />
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
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
        </div>
    );
};