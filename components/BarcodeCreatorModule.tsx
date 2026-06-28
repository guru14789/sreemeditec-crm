import React, { useState, useRef } from 'react';
import { useData } from './DataContext';
import { Product } from '../types';
import { Search, Plus, Printer, Trash2, X, QrCode } from 'lucide-react';
import Barcode from 'react-barcode';

export const BarcodeCreatorModule: React.FC = () => {
    const { products, addNotification } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [sheetItems, setSheetItems] = useState<(Product | null)[]>(Array(30).fill(null));

    const suggestions = searchQuery.trim() 
        ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))).slice(0, 10)
        : [];

    const handleAdd = () => {
        if (!selectedProduct) return;
        const emptyIndex = sheetItems.findIndex(i => i === null);
        if (emptyIndex === -1) {
            addNotification('Sheet Full', 'The A4 sheet is full (30 items). Please print or clear.', 'warning');
            return;
        }
        
        const newSheet = [...sheetItems];
        newSheet[emptyIndex] = selectedProduct;
        setSheetItems(newSheet);
        setSearchQuery('');
        setSelectedProduct(null);
    };

    const handleClear = () => {
        setSheetItems(Array(30).fill(null));
    };

    const handlePrint = () => {
        window.print();
    };

    const removeItem = (index: number) => {
        const newSheet = [...sheetItems];
        newSheet[index] = null;
        setSheetItems(newSheet);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden print:bg-white print:overflow-visible relative">
            {/* Top Header Card */}
            <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0 shadow-sm print:hidden z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <QrCode size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-800 uppercase">Barcode Creator</h2>
                        <p className="text-xs text-slate-500 font-medium">Generate A4 sheets of product SKU barcodes</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-end gap-4 relative">
                    <div className="flex-1 w-full max-w-md relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Search Product</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Enter Name or SKU..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setSelectedProduct(null);
                                }}
                            />
                        </div>
                        {suggestions.length > 0 && !selectedProduct && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 md:max-h-60 overflow-y-auto">
                                {suggestions.map(p => (
                                    <div 
                                        key={p.id} 
                                        className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0"
                                        onClick={() => {
                                            setSelectedProduct(p);
                                            setSearchQuery(`${p.name} (${p.sku || 'No SKU'})`);
                                        }}
                                    >
                                        <div className="font-bold text-slate-800 text-xs uppercase">{p.name}</div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-1">SKU: {p.sku || 'N/A'} • Price: ₹{p.sellingPrice}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleAdd}
                        disabled={!selectedProduct || !selectedProduct.sku}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                    >
                        <Plus size={16} /> Add 
                    </button>

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={handleClear}
                            className="bg-white hover:bg-rose-50 text-rose-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-rose-200 flex-1 md:flex-none justify-center"
                        >
                            <Trash2 size={16} /> Clear
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2 flex-1 md:flex-none justify-center"
                        >
                            <Printer size={16} /> Print Sheet
                        </button>
                    </div>
                </div>
            </div>

            {/* A4 Preview Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center print:p-0 print:overflow-visible">
                <div 
                    className="bg-white shadow-xl print:shadow-none mx-auto relative print:m-0"
                    style={{
                        width: '210mm',
                        height: '297mm',
                        padding: '12.7mm 4mm', // Avery 5160 standard margins approx
                    }}
                >
                    <div className="grid grid-cols-3 grid-rows-10 h-full w-full">
                        {sheetItems.map((item, idx) => (
                            <div 
                                key={idx} 
                                className={`border ${item ? 'border-transparent' : 'border-dashed border-slate-200'} flex flex-col items-center justify-center p-1 relative group print:border-none`}
                                style={{ width: '66.6mm', height: '25.4mm' }} // Avery 5160 cell size approx
                            >
                                {item ? (
                                    <div className="flex flex-col items-center justify-center w-full h-full p-1 bg-white">
                                        <div className="text-[7.5px] leading-tight font-bold text-black text-center uppercase line-clamp-1 w-[90%] mb-0.5">{item.name}</div>
                                        <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                            <Barcode 
                                                value={item.sku || '000000'} 
                                                width={1.2} 
                                                height={25}
                                                fontSize={10}
                                                margin={0}
                                                displayValue={true}
                                                background="transparent"
                                                textMargin={2}
                                            />
                                        </div>
                                        <div className="text-[8px] font-black text-black mt-0.5">₹{item.sellingPrice}</div>
                                        
                                        {/* Remove button (hidden on print) */}
                                        <button 
                                            onClick={() => removeItem(idx)}
                                            className="absolute -top-1 -right-1 bg-white border border-slate-200 shadow-md text-rose-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-10"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-slate-300 text-[9px] font-bold uppercase tracking-widest print:hidden">Empty</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Global Print Styles to ensure only the A4 sheet prints and scales correctly */}
            <style>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: white !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
};
