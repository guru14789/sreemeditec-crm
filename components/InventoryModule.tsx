import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, StockBatch } from '../types';
import { 
    Package, AlertTriangle, Search, X, CheckCircle2, Trash2, Plus, 
    History, ScanBarcode, Send, Building2, MapPin, Edit, 
    RefreshCw, ArrowUpRight, ArrowDownLeft, RotateCcw,
    Settings, Tag, Box, Info, List, DollarSign, Calendar, Wrench,
    Activity, ArrowRight, XCircle, Briefcase, Truck, Printer
} from 'lucide-react';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);

export const InventoryModule: React.FC = () => {
    const { 
        products, addProduct, updateProduct, removeProduct, 
        stockMovements, recordStockMovement, addNotification, stockBatches, 
        addStockBatch, addStockTransfer 
    } = useData();
    
    const [viewState, setViewState] = useState<'stock' | 'history' | 'builder'>('stock');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const DEFAULT_PRODUCT: Partial<Product> = {
        name: '',
        category: 'Equipment',
        sku: '',
        stock: 0,
        unit: 'nos',
        minLevel: 5,
        location: 'Warehouse A',
        purchasePrice: 0,
        sellingPrice: 0,
        hsn: '',
        taxRate: 18,
        model: '',
        description: '',
        supplier: '',
        isBatchTracked: false
    };

    const [product, setProduct] = useState<Partial<Product>>(DEFAULT_PRODUCT);

    // Modal States for secondary actions
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [newBatch, setNewBatch] = useState<Partial<StockBatch>>({ batchNo: '', expiryDate: '', quantity: 0 });
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferData, setTransferData] = useState({ productId: '', productName: '', fromLocation: '', toLocation: '', quantity: 1, reference: '' });
    const [showScanModal, setShowScanModal] = useState(false);
    const [scanQuery, setScanQuery] = useState('');
    const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
    const [scanStatus, setScanStatus] = useState<'found' | 'not-found' | 'idle'>('idle');
    const [scanOperation, setScanOperation] = useState<'In' | 'Out'>('In');
    const [quickStockAmount, setQuickStockAmount] = useState<number>(1);

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lowQuery = searchQuery.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowQuery) || 
            p.sku.toLowerCase().includes(lowQuery) || 
            p.category.toLowerCase().includes(lowQuery) ||
            p.model?.toLowerCase().includes(lowQuery)
        );
    }, [products, searchQuery]);

    const handleSave = async () => {
        if (!product.name || !product.sku) {
            addNotification('Validation Error', 'Name and SKU are required.', 'alert');
            return;
        }

        const finalData: Product = {
            ...product as Product,
            id: editingId || product.id || `P-${Date.now()}`,
            stock: Number(product.stock) || 0,
            purchasePrice: Number(product.purchasePrice) || 0,
            sellingPrice: Number(product.sellingPrice) || 0,
            minLevel: Number(product.minLevel) || 5,
            taxRate: Number(product.taxRate) || 18,
            lastRestocked: (product.stock || 0) > 0 ? new Date().toISOString().split('T')[0] : ''
        };

        try {
            if (editingId) await updateProduct(editingId, finalData);
            else await addProduct(finalData);

            if (!editingId && finalData.stock > 0) {
                await recordStockMovement({
                    id: `MOV-INIT-${Date.now()}`,
                    productId: finalData.id,
                    productName: finalData.name,
                    type: 'In',
                    quantity: finalData.stock,
                    date: new Date().toISOString().split('T')[0],
                    reference: 'Opening Stock',
                    purpose: 'Restock'
                });
            }

            setViewState('stock');
            setEditingId(null);
            setSelectedProduct(null);
            addNotification('Registry Synced', `"${finalData.name}" recorded.`, 'success');
        } catch (err) { addNotification('Sync Error', 'Database write failed.', 'alert'); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Permanently remove ${name}?`)) {
            await removeProduct(id);
            addNotification('Registry Purged', `"${name}" removed.`, 'warning');
            setSelectedProduct(null);
        }
    };

    const handleAddBatch = async () => {
        if (!selectedProduct || !newBatch.batchNo || !newBatch.expiryDate) return;
        const batch: StockBatch = {
            id: `BATCH-${Date.now()}`,
            productId: selectedProduct.id,
            batchNo: newBatch.batchNo!,
            expiryDate: newBatch.expiryDate!,
            quantity: newBatch.quantity || 0,
            createdDate: new Date().toISOString()
        };
        await addStockBatch(batch);
        setNewBatch({ batchNo: '', expiryDate: '', quantity: 0 });
        addNotification('Batch Registered', `Batch ${batch.batchNo} recorded.`, 'success');
    };

    const handleStockTransfer = async () => {
        if (!transferData.productId || !transferData.toLocation || transferData.quantity <= 0) return;
        await addStockTransfer({
            id: `TRF-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            productId: transferData.productId,
            productName: transferData.productName,
            fromLocation: transferData.fromLocation,
            toLocation: transferData.toLocation,
            quantity: transferData.quantity,
            reference: transferData.reference,
            createdBy: 'Admin'
        });
        setShowTransferModal(false);
        addNotification('Transfer Complete', `Moved ${transferData.quantity} units.`, 'success');
    };

    const handleScanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const found = products.find(p => p.sku.toLowerCase() === scanQuery.toLowerCase());
        if (found) { setScannedProduct(found); setScanStatus('found'); } 
        else { setScanStatus('not-found'); }
    };

    const handleQuickStockUpdate = async () => {
        if (!scannedProduct) return;
        const newStock = scanOperation === 'In' ? (scannedProduct.stock + quickStockAmount) : (scannedProduct.stock - quickStockAmount);
        await updateProduct(scannedProduct.id, { stock: newStock, lastRestocked: scanOperation === 'In' ? new Date().toISOString().split('T')[0] : scannedProduct.lastRestocked });
        await recordStockMovement({
            id: `MOV-SCAN-${Date.now()}`,
            productId: scannedProduct.id,
            productName: scannedProduct.name,
            type: scanOperation,
            quantity: quickStockAmount,
            date: new Date().toISOString().split('T')[0],
            reference: 'Barcode Scan',
            purpose: scanOperation === 'In' ? 'Restock' : 'Sale'
        });
        setScannedProduct(null); setScanStatus('idle'); setScanQuery('');
        addNotification('Stock Sync', `Adjusted ${scannedProduct.name} stock.`, 'success');
    };

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('stock')} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'stock' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><Package size={16} /> Registry</button>
                <button onClick={() => setViewState('history')} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> Logs</button>
                <button onClick={() => { setEditingId(null); setViewState('builder'); setProduct(DEFAULT_PRODUCT); }} className={`px-8 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-lg shadow-medical-500/20' : 'text-slate-400 hover:text-slate-600'}`}><Plus size={16} /> Register SKU</button>
            </div>

            {viewState === 'stock' ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                        <div className="p-5 border-b border-slate-300 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner border border-indigo-50"><Box size={20} /></div>
                                <div><h3 className="font-black text-slate-800 uppercase tracking-tight">Stock Master</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{filteredProducts.length} Active SKUs</p></div>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative w-48 sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Filter registry..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-[11px] font-bold outline-none focus:border-medical-500 transition-all shadow-inner uppercase" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                                <button onClick={() => setShowScanModal(true)} className="p-2.5 bg-slate-800 text-white rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-900/10"><ScanBarcode size={22} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                    <tr><th className="px-8 py-5">Item Specs</th><th className="px-8 py-5">Category & SKU</th><th className="px-8 py-5 text-right">Available Stock</th><th className="px-8 py-5 text-right">Valuation (₹)</th><th className="px-8 py-5 text-center">Status</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredProducts.map(prod => (
                                        <tr key={prod.id} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedProduct?.id === prod.id ? 'bg-medical-50/50' : ''}`} onClick={() => setSelectedProduct(prod)}>
                                            <td className="px-8 py-5"><div className="font-black text-slate-800 text-[12px] tracking-tight">{prod.name}</div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{prod.model || 'Standard'}</div></td>
                                            <td className="px-8 py-5"><div className="font-black text-indigo-600 uppercase">{prod.category}</div><div className="text-[9px] font-bold text-slate-400 tracking-tight mt-0.5">{prod.sku}</div></td>
                                            <td className="px-8 py-5 text-right font-black"><span className={`text-[13px] ${prod.stock <= (prod.minLevel || 5) ? 'text-rose-600' : 'text-slate-800'}`}>{prod.stock}</span><span className="text-[9px] text-slate-400 uppercase ml-1">{prod.unit}</span></td>
                                            <td className="px-8 py-5 text-right font-black text-[13px] text-emerald-600 tracking-tighter">₹{(prod.sellingPrice || 0).toLocaleString('en-IN')}</td>
                                            <td className="px-8 py-5 text-center"><span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${prod.stock <= (prod.minLevel || 5) ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{prod.stock <= (prod.minLevel || 5) ? 'Critical' : 'Healthy'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedProduct && (
                        <div className="w-full lg:w-[450px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4">
                            <div className="p-8 border-b border-slate-300 bg-slate-50/50 relative">
                                <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"><XCircle size={24}/></button>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-xl shadow-indigo-500/20"><Package size={24} /></div>
                                    <div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-tight">SKU Intelligence</h3><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {selectedProduct.id.slice(-8)}</p></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setProduct(selectedProduct); setEditingId(selectedProduct.id); setViewState('builder'); }} className="flex-1 py-3 bg-white border border-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"><Edit size={14}/> Modify</button>
                                    <button onClick={() => handleDelete(selectedProduct.id, selectedProduct.name)} className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100"><Trash2 size={14}/> Purge</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <section className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Activity size={80} /></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Available Quantity</p>
                                    <h4 className="text-4xl font-black tracking-tighter text-emerald-400">{selectedProduct.stock} <span className="text-xl uppercase opacity-50">{selectedProduct.unit}</span></h4>
                                    <div className="mt-4 flex gap-4"><div className="px-3 py-1 bg-white/10 rounded-lg"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Min Alert</p><p className="text-xs font-black">{selectedProduct.minLevel}</p></div><div className="px-3 py-1 bg-white/10 rounded-lg"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Location</p><p className="text-xs font-black">{selectedProduct.location}</p></div></div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={14}/> Financial Snapshot</h4></div>
                                    <div className="grid grid-cols-2 gap-4"><div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Selling Rate</p><p className="text-lg font-black text-slate-800">₹{(selectedProduct.sellingPrice || 0).toLocaleString()}</p></div><div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Purchase Cost</p><p className="text-lg font-black text-slate-800">₹{(selectedProduct.purchasePrice || 0).toLocaleString()}</p></div></div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> Operational Tools</h4></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setShowBatchModal(true)} className="flex flex-col items-center justify-center p-6 bg-medical-50 border border-medical-100 rounded-3xl hover:bg-medical-100 transition-all gap-2"><Tag size={20} className="text-medical-600"/><span className="text-[9px] font-black uppercase tracking-widest text-medical-700">Batches</span></button>
                                        <button onClick={() => { setTransferData({ productId: selectedProduct.id, productName: selectedProduct.name, fromLocation: selectedProduct.location, toLocation: '', quantity: 1, reference: '' }); setShowTransferModal(true); }} className="flex flex-col items-center justify-center p-6 bg-indigo-50 border border-indigo-100 rounded-3xl hover:bg-indigo-100 transition-all gap-2"><MapPin size={20} className="text-indigo-600"/><span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Transfer</span></button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            ) : viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-5 border-b border-slate-300 bg-slate-50/30 flex items-center gap-3 shrink-0"><div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner border border-amber-50"><History size={20} /></div><div><h3 className="font-black text-slate-800 uppercase tracking-tight">Movement Log</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Transaction Audit Trail</p></div></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]"><tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Type</th><th className="px-8 py-5">SKU Name</th><th className="px-8 py-5 text-right">Quantity</th><th className="px-8 py-5">Reference</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{stockMovements.sort((a,b) => b.date.localeCompare(a.date)).map(m => (<tr key={m.id} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-5 font-bold text-slate-500">{m.date}</td><td className="px-8 py-5"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${m.type === 'In' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{m.type === 'In' ? 'Stock In' : 'Stock Out'}</span></td><td className="px-8 py-5 font-black text-slate-800 uppercase">{m.productName}</td><td className="px-8 py-5 text-right font-black text-[13px] text-slate-700">{m.quantity}</td><td className="px-8 py-5 font-black text-[9px] text-slate-400 uppercase tracking-widest">{m.reference}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-300 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar pb-32">
                            <section className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Box size={14} className="text-medical-500" />1. Master Identity</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="sm:col-span-2"><FormRow label="Product Description *"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={product.name || ''} onChange={e => setProduct({...product, name: e.target.value})} /></FormRow></div>
                                    <FormRow label="SKU / Barcode ID *"><input type="text" className="w-full h-[48px] bg-slate-50 border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none" value={product.sku || ''} onChange={e => setProduct({...product, sku: e.target.value})} /></FormRow>
                                    <FormRow label="Category"><select className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-xs font-black uppercase outline-none" value={product.category} onChange={e => setProduct({...product, category: e.target.value as any})}><option>Equipment</option><option>Consumable</option><option>Spare Part</option><option>Service</option></select></FormRow>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><DollarSign size={14} className="text-medical-500" />2. Financial Matrix</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <FormRow label="Purchase Cost (₹)"><input type="number" className="w-full h-[48px] bg-rose-50/30 border border-rose-200 rounded-2xl px-5 text-lg font-black text-rose-600 outline-none" value={product.purchasePrice || ''} onChange={e => setProduct({...product, purchasePrice: Number(e.target.value)})} /></FormRow>
                                    <FormRow label="Selling Rate (₹)"><input type="number" className="w-full h-[48px] bg-emerald-50/30 border border-emerald-200 rounded-2xl px-5 text-lg font-black text-emerald-600 outline-none" value={product.sellingPrice || ''} onChange={e => setProduct({...product, sellingPrice: Number(e.target.value)})} /></FormRow>
                                    <FormRow label="HSN Code"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none uppercase" value={product.hsn || ''} onChange={e => setProduct({...product, hsn: e.target.value})} /></FormRow>
                                    <FormRow label="Tax Rate %"><input type="number" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none" value={product.taxRate || ''} onChange={e => setProduct({...product, taxRate: Number(e.target.value)})} /></FormRow>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] border-b border-slate-100 pb-2 flex items-center gap-2"><Settings size={14} className="text-medical-500" />3. Logistics Config</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <FormRow label="Opening Stock"><input type="number" className="w-full h-[48px] bg-indigo-50/30 border border-indigo-200 rounded-2xl px-5 text-lg font-black text-indigo-600 outline-none" value={product.stock || ''} onChange={e => setProduct({...product, stock: Number(e.target.value)})} /></FormRow>
                                    <FormRow label="Min Alert Level"><input type="number" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none" value={product.minLevel || ''} onChange={e => setProduct({...product, minLevel: Number(e.target.value)})} /></FormRow>
                                    <FormRow label="Godown Location"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none uppercase" value={product.location || ''} onChange={e => setProduct({...product, location: e.target.value})} /></FormRow>
                                    <FormRow label="UOM (Unit)"><input type="text" className="w-full h-[48px] bg-white border border-slate-300 rounded-2xl px-5 text-sm font-black outline-none uppercase" value={product.unit || ''} onChange={e => setProduct({...product, unit: e.target.value})} placeholder="NOS / PCS" /></FormRow>
                                </div>
                            </section>

                            <section className="p-8 bg-medical-50/50 rounded-[2.5rem] border border-medical-100 flex items-center gap-6 shadow-inner">
                                <input type="checkbox" id="inventory-isBatch" className="w-6 h-6 accent-medical-600 rounded-lg cursor-pointer" checked={product.isBatchTracked || false} onChange={e => setProduct({...product, isBatchTracked: e.target.checked})} />
                                <label htmlFor="inventory-isBatch" className="text-xs font-black text-medical-800 uppercase tracking-widest cursor-pointer">Enable Life-cycle Tracking (Batch & Expiry Controls)</label>
                            </section>
                        </div>

                        <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-4 shadow-[0_-15px_30px_rgba(0,0,0,0.06)] z-30 shrink-0 px-10">
                            <button onClick={() => { setViewState('stock'); setEditingId(null); }} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-inner">Discard Changes</button>
                            <button onClick={handleSave} className="px-12 py-4 bg-gradient-to-r from-medical-600 to-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-medical-500/40 active:scale-95 transition-all hover:brightness-110">Authorize Registry Entry</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Support Modals */}
            {showScanModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 flex justify-between items-center bg-slate-50/50"><div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Barcode Terminal</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual SKU Entry</p></div><button onClick={() => setShowScanModal(false)} className="p-2 text-slate-300 hover:text-slate-500 transition-colors"><XCircle size={28} /></button></div>
                        <div className="p-8 space-y-6">
                            {scanStatus === 'idle' && (
                                <form onSubmit={handleScanSubmit} className="space-y-6">
                                    <div className="p-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-200"><ScanBarcode size={64} className="mb-4 opacity-40 animate-pulse" /><p className="text-[10px] font-black uppercase tracking-widest">Awaiting Signal...</p></div>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-5 py-5 text-center text-2xl font-black tracking-[0.2em] outline-none focus:border-medical-500 shadow-inner" placeholder="SKU CODE" value={scanQuery} onChange={e => setScanQuery(e.target.value)} autoFocus />
                                    <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Verify Signal</button>
                                </form>
                            )}
                            {scanStatus === 'found' && scannedProduct && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                    <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex items-center gap-5"><div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20"><Package size={28} /></div><div className="min-w-0"><h4 className="font-black text-emerald-900 truncate text-lg uppercase leading-tight">{scannedProduct.name}</h4><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">AVAILABLE: {scannedProduct.stock} {scannedProduct.unit}</p></div></div>
                                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500"><Wrench size={14} /></div>
                                    <div className="flex bg-slate-100 p-2 rounded-[1.5rem]"><button onClick={() => setScanOperation('In')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scanOperation === 'In' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-400'}`}>Stock In</button><button onClick={() => setScanOperation('Out')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${scanOperation === 'Out' ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400'}`}>Stock Out</button></div>
                                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adjust Quantity</label><input type="number" className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-5 text-center font-black text-3xl outline-none focus:border-medical-500" value={quickStockAmount} onChange={e => setQuickStockAmount(Number(e.target.value))} /></div>
                                    <div className="flex gap-4"><button onClick={() => { setScanStatus('idle'); setScanQuery(''); }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Retry</button><button onClick={handleQuickStockUpdate} className={`flex-[2] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-white shadow-2xl active:scale-95 transition-all ${scanOperation === 'In' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-orange-600 shadow-orange-500/20'}`}>Commit Adjustment</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showBatchModal && selectedProduct && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-slate-300 flex justify-between items-center bg-slate-50/50"><div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Batch Management</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{selectedProduct.name}</p></div><button onClick={() => setShowBatchModal(false)}><XCircle size={28} className="text-slate-300" /></button></div>
                        <div className="p-8 space-y-8">
                            <div className="p-8 bg-medical-50/50 rounded-[2rem] border border-medical-100 space-y-6 shadow-inner"><h4 className="text-[10px] font-black text-medical-600 uppercase tracking-widest">New Life-cycle Registry</h4><div className="grid grid-cols-3 gap-6"><FormRow label="Batch No"><input type="text" className="bg-white border border-medical-200 rounded-xl px-4 py-3 text-sm font-black outline-none uppercase" value={newBatch.batchNo} onChange={e => setNewBatch({ ...newBatch, batchNo: e.target.value })} /></FormRow><FormRow label="Expiry"><input type="date" className="bg-white border border-medical-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={newBatch.expiryDate} onChange={e => setNewBatch({ ...newBatch, expiryDate: e.target.value })} /></FormRow><FormRow label="Qty"><input type="number" className="bg-white border border-medical-200 rounded-xl px-4 py-3 text-sm font-black outline-none" value={newBatch.quantity || ''} onChange={e => setNewBatch({ ...newBatch, quantity: Number(e.target.value) })} /></FormRow></div><button onClick={handleAddBatch} className="w-full py-4 bg-medical-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-medical-500/20 active:scale-95 transition-all">Authorize Batch Entry</button></div>
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3">{stockBatches.filter(b => b.productId === selectedProduct.id).map(batch => (<div key={batch.id} className="p-5 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200 shadow-sm"><div className="flex items-center gap-5"><div className="p-3 bg-white rounded-2xl text-slate-300 shadow-inner"><Package size={20} /></div><div><p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{batch.batchNo}</p><p className={`text-[9px] font-black uppercase tracking-[0.1em] mt-1 ${new Date(batch.expiryDate) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>EXPIRY: {batch.expiryDate}</p></div></div><div className="text-right"><p className="text-lg font-black text-medical-600 leading-none">{batch.quantity}</p><p className="text-[9px] font-black text-slate-300 uppercase mt-1.5 tracking-widest">Units Available</p></div></div>))}</div>
                        </div>
                    </div>
                </div>
            )}

            {showTransferModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col scale-100 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative">
                            <button onClick={() => setShowTransferModal(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-500 transition-colors"><XCircle size={28}/></button>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Godown Logistics</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{transferData.productName}</p>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <FormRow label="Origin Source"><div className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest shadow-inner">{transferData.fromLocation}</div></FormRow>
                                <FormRow label="Destination Godown"><input type="text" placeholder="WAREHOUSE B" className="w-full bg-white border border-slate-300 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:border-indigo-500 uppercase shadow-sm" value={transferData.toLocation} onChange={e => setTransferData({ ...transferData, toLocation: e.target.value })} /></FormRow>
                            </div>
                            <FormRow label="Transfer Magnitude"><input type="number" className="w-full bg-indigo-50/30 border border-indigo-200 rounded-[2rem] px-8 py-6 text-4xl font-black outline-none focus:border-indigo-500 text-indigo-600 text-center shadow-inner" value={transferData.quantity} onChange={e => setTransferData({ ...transferData, quantity: Number(e.target.value) })} /></FormRow>
                        </div>
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                            <button onClick={() => setShowTransferModal(false)} className="flex-1 bg-white py-4 rounded-2xl text-[10px] font-black uppercase text-slate-400 border border-slate-200 shadow-sm">Abort Movement</button>
                            <button onClick={handleStockTransfer} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all hover:brightness-110">Authorize Transfer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
