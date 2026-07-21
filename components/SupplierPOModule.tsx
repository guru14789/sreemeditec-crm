import { ToggleSwitch } from './ToggleSwitch';
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, TabView } from '../types';
import { 
    Plus, Search, Trash2, Save, PenTool, X,
    History, Download, Edit, Eye, List as ListIcon, Building2, CreditCard, Package, Star, FileText, MoreVertical, Percent, MessageSquare, ShoppingCart
} from 'lucide-react';
import { useData } from './DataContext';
import { FilingFilterDropdown } from './FilingFilterDropdown';
import { PDFService } from '../services/PDFService';
import { AutoSuggest } from './AutoSuggest';
import { FiledStatusIndicator } from './FiledStatusIndicator';

const DEFAULT_DELIVERY_ADDRESS = 'Sreemeditec,\nNew No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.';

const calculateDetailedTotals = (order: Partial<Invoice>) => {
    const items = order.items || [];
    const subTotal = items.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice || 0)), 0);
    const taxTotal = items.reduce((sum, p) => {
        const itemAmount = Number(p.quantity) * Number(p.unitPrice || 0);
        return sum + (itemAmount * (Number(p.taxRate || 0) / 100));
    }, 0);
    const freight = Number(order.freightAmount) || 0;
    const freightGst = freight * ((Number(order.freightTaxRate) || 0) / 100);
    const totalWithGst = subTotal + taxTotal;
    const discount = Number(order.discount) || 0;
    const grandTotalRaw = totalWithGst + freight + freightGst - discount;
    let grandTotal = grandTotalRaw;
    let roundOff = 0;
    if (order.isRoundOff) {
        grandTotal = Math.round(grandTotalRaw);
        roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    }
    return { subTotal, taxTotal, totalWithGst, discount, freight, freightGst, grandTotal, roundOff };
};

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

export const SupplierPOModule: React.FC = () => {
    const { vendors, products, invoices, addInvoice, updateInvoice, removeInvoice, addNotification, currentUser, financialYear, isSystemAdmin, pendingSupplierPOData, setPendingSupplierPOData, showConfirm, showPrompt, previewPDF, bankDetailsList = [] } = useData();
    const isAdmin = isSystemAdmin || currentUser?.permissions?.[TabView.SUPPLIER_PO] === 'Admin';

    const handleWhatsAppSend = async (inv: Invoice) => {
        let phone = inv.phone || '';
        if (!phone) {
            const result = await showPrompt('Enter recipient phone number with country code (e.g. 919876543210):');
            if (!result) return;
            phone = result;
        }
        phone = phone.replace(/\D/g, '');
        if (!phone.startsWith('91') && phone.length === 10) {
            phone = '91' + phone;
        }
        const message = `Hello, here are the details for your Supplier PO *#${inv.invoiceNumber}*:\nDate: ${formatDateDDMMYYYY(inv.date)}\nTotal Amount: *₹${(inv.grandTotal || 0).toLocaleString('en-IN')}*\nThank you for doing business with us!\n- Sree Meditec`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'spares'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [filingFilter, setFilingFilter] = useState<'All' | 'Filed' | 'Not Filed' | 'Not Updated'>('All');
    const [poSearch, setPoSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [order, setOrder] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        cpoNumber: '',
        cpoDate: new Date().toISOString().split('T')[0],
        items: [],
        isRoundOff: false,
        discount: 0,
        freightAmount: 0,
        freightTaxRate: 18,
        status: 'Pending',
        customerName: '',
        customerHospital: '',
        customerAddress: '',
        customerGstin: '',
        bankDetails: '33APGPS4675G2ZL',
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        bankAndBranch: 'ICICI Bank, Br: Selaiyur',
        accountNo: '603705016939',
        selectedBank: bankDetailsList.find(b => b.isDefault) || undefined,
        paymentMethod: 'Bank Transfer',
        advanceAmount: 0,
        advanceDate: new Date().toISOString().split('T')[0],
        deliveryTime: 'Immediate',
        specialNote: '',
        documentType: 'SupplierPO',
        paymentTerms: 'Terms: 100% against delivery or as agreed.'
    });

    useEffect(() => {
        if (pendingSupplierPOData) {
            setOrder(prev => ({
                ...prev,
                customerName: pendingSupplierPOData.customerName || prev.customerName,
                date: pendingSupplierPOData.date || prev.date,
                cpoNumber: pendingSupplierPOData.cpoNumber || prev.cpoNumber,
                cpoDate: pendingSupplierPOData.cpoDate || prev.cpoDate,
                items: pendingSupplierPOData.items || [],
                discount: pendingSupplierPOData.discount || 0,
                freightAmount: pendingSupplierPOData.freightAmount || 0,
                freightTaxRate: pendingSupplierPOData.freightTaxRate || 18,
                isRoundOff: pendingSupplierPOData.isRoundOff || false,
                remarks: pendingSupplierPOData.remarks || '',
                subject: pendingSupplierPOData.subject || '',
            }));
            setEditingId(null);
            setViewState('builder');
            setBuilderTab('form');
            setPendingSupplierPOData(null);
        }
    }, [pendingSupplierPOData]);

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.invoiceNumber) {
            const currentYearPOs = invoices.filter(i => i.documentType === 'SupplierPO' && i.invoiceNumber && i.invoiceNumber.includes(`/${financialYear}/`));
            const maxNum = currentYearPOs.reduce((max, i) => {
                const parts = (i.invoiceNumber || '').split('/');
                const num = parseInt(parts[parts.length - 1], 10);
                return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            const lsKey = `crm-spoc-max-${financialYear}`;
            const lsMax = parseInt(localStorage.getItem(lsKey) || '0', 10);
            const nextNum = Math.max(maxNum, lsMax) + 1;
            localStorage.setItem(lsKey, String(nextNum));
            setOrder(prev => ({
                ...prev,
                invoiceNumber: `SMPOC/${financialYear}/${String(nextNum).padStart(4, '0')}`
            }));
        }
    }, [viewState, editingId, invoices, financialYear, order.invoiceNumber]);

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !order.selectedBank && bankDetailsList && bankDetailsList.length > 0) {
            const defaultBank = bankDetailsList.find(b => b.isDefault);
            if (defaultBank) {
                setOrder(prev => ({ ...prev, selectedBank: defaultBank }));
            }
        }
    }, [viewState, editingId, bankDetailsList, order.selectedBank]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const filteredSpares = useMemo(() => {
        const query = catalogSearch.toLowerCase();
        let list = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.sku || '').toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query)
        );
        
        if (order.customerName) {
            const vendorMatch = list.filter(p => (p.supplier || '').toLowerCase() === order.customerName?.toLowerCase());
            const others = list.filter(p => (p.supplier || '').toLowerCase() !== order.customerName?.toLowerCase());
            return [...vendorMatch, ...others];
        }
        
        return list;
    }, [products, catalogSearch, order.customerName]);

    const handleVendorSelect = (vendor: any) => {
        setOrder(prev => ({
            ...prev,
            customerName: vendor.name,
            customerAddress: vendor.address || '',
            customerGstin: (vendor.gstin || '').toUpperCase()
        }));
        addNotification('Vendor Detected', `Linked ${vendor.name} to procurement order.`, 'success');
    };

    const handleDownloadPDF = async (data: Partial<Invoice>) => {
        try {
            const blob = await PDFService.generatePurchaseOrderPDF(data as Invoice, false);
            previewPDF(blob, `${data.invoiceNumber || 'SupplierPO'}.pdf`);
        } catch (err) {
            console.error("Failed to download PDF", err);
            addNotification('Download Failed', 'Could not generate PDF file.', 'alert');
        }
    };

    const handleAddItem = (prod?: any, index?: number) => {
        const tr = prod?.taxRate || 18;
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unitPrice: prod?.purchasePrice || 0,
            taxRate: tr,
            cgstRate: tr / 2,
            sgstRate: tr / 2,
            igstRate: 0,
            amount: prod?.purchasePrice || 0,
            gstValue: (prod?.purchasePrice || 0) * (tr / 100),
            priceWithGst: (prod?.purchasePrice || 0) * (1 + (tr / 100))
        };
        setOrder(prev => {
            const current = prev.items || [];
            const idx = index ?? current.length;
            return { ...prev, items: [...current.slice(0, idx), newItem, ...current.slice(idx)] };
        });
        if (builderTab === 'spares') setBuilderTab('form');
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setOrder(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    let updated = { ...item, [field]: value };
                    
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name === value);
                        if (masterProd) {
                            updated.unitPrice = masterProd.purchasePrice || 0;
                            updated.taxRate = masterProd.taxRate || 18;
                            updated.cgstRate = updated.taxRate / 2;
                            updated.sgstRate = updated.taxRate / 2;
                            updated.igstRate = 0;
                            updated.hsn = masterProd.hsn || '';
                        }
                    }
                    
                    if (field === 'taxRate') {
                        updated.cgstRate = Number(value) / 2;
                        updated.sgstRate = Number(value) / 2;
                        updated.igstRate = 0;
                    } else if (field === 'cgstRate' || field === 'sgstRate') {
                        updated.igstRate = 0;
                        updated.taxRate = (updated.cgstRate || 0) + (updated.sgstRate || 0);
                    } else if (field === 'igstRate') {
                        updated.cgstRate = 0;
                        updated.sgstRate = 0;
                        updated.taxRate = Number(value);
                    }

                    updated.amount = updated.quantity * (updated.unitPrice || 0);
                    updated.gstValue = updated.amount * (updated.taxRate / 100);
                    updated.priceWithGst = updated.amount + updated.gstValue;
                    
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!order.customerName || !order.items?.length) {
            addNotification('Invalid Data', 'Fill vendor details and items.', 'alert');
            return;
        }

        const totals = calculateDetailedTotals(order);
        const finalData: Invoice = {
            ...order as Invoice,
            id: editingId || `SPO-${Date.now()}`,
            subtotal: totals.subTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            roundOff: totals.roundOff,
            isRoundOff: order.isRoundOff,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'SupplierPO',
            createdBy: currentUser?.name || 'System',
            ...(order.selectedBank ? { selectedBank: order.selectedBank } : {})
        };

        try {
            if (editingId) {
                await updateInvoice(editingId, finalData);
            } else {
                await addInvoice(finalData);
            }
            addNotification('Registry Updated', `Supplier PO ${finalData.invoiceNumber} saved.`, 'success');
            
            if (status === 'Finalized') {
                await handleDownloadPDF(finalData);
            }
            
            setViewState('history');
            setEditingId(null);
        } catch (error: any) {
            console.error('Save Supplier PO failed:', error);
            let message = 'Failed to save Supplier PO.';
            try {
                const parsed = JSON.parse(error.message);
                if (parsed.type === 'DUPLICATE_INVOICE') {
                    message = `Duplicate PO Number: ${parsed.invoiceNumber} already exists.`;
                }
            } catch (_) {}
            addNotification('Save Error', message, 'alert');
        }
    };

    const totals = useMemo(() => calculateDetailedTotals(order), [order]);

    const renderPOTemplate = (data: Partial<Invoice>, totals: any) => (
        <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col mx-auto" style={{ fontFamily: '"Arial", sans-serif', fontSize: '12px' }}>
            <div className="text-center mb-4">
                <h1 className="text-4xl font-playfair font-bold tracking-tight uppercase mb-1">SREE MEDITEC</h1>
                <p className="text-[11px] font-bold">New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.</p>
                <p className="text-[11px] font-bold">Mob: 9884818398</p>
            </div>
            <div className="border border-black text-center py-1.5 font-bold mb-0">SUPPLIER PURCHASE ORDER</div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">SMPOC NO: {data.invoiceNumber}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.date)}</div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 font-bold">VENDOR REF NO: {data.cpoNumber || '---'}</div>
                <div className="p-1.5 font-bold">DATE: {formatDateDDMMYYYY(data.cpoDate)}</div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black min-h-[60px]">
                <div className="border-r border-black p-1.5">
                    <p className="font-bold mb-1 underline">Name of the Vendor and Address:</p>
                    <p className="font-bold uppercase leading-tight">{data.customerName || '------------------'}</p>
                    <p className="whitespace-pre-wrap text-[11px]">{data.customerAddress}</p>
                </div>
                <div className="p-1.5">
                    <p className="font-bold mb-1 underline">Dispatch To:</p>
                    <p className="whitespace-pre-wrap text-[11px]">{data.deliveryAddress}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 border-x border-b border-black">
                <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">Vendor GST:</span><span>{data.customerGstin || '------------------'}</span></div>
                <div className="p-1.5 flex gap-2"><span className="font-bold">Our GST:</span><span className="font-bold">{data.bankDetails || '33APGPS4675G2ZL'}</span></div>
            </div>
            {data.selectedBank && (
                <div className="grid grid-cols-2 border-x border-b border-black">
                    <div className="border-r border-black p-1.5 flex gap-2"><span className="font-bold">Bank:</span><span>{data.selectedBank.bankName}</span></div>
                    <div className="p-1.5 flex gap-2"><span className="font-bold">A/C:</span><span>{data.selectedBank.accountNo} | {data.selectedBank.branchIfsc || ''}</span></div>
                </div>
            )}
            <div className="border-x border-black text-center py-1 font-bold">PROCUREMENT DETAILS</div>
            <div className="border border-black">
                <table className="w-full border-collapse text-[10px]">
                    <thead>
                        <tr className="border-b border-black font-bold">
                            <th className="border-r border-black p-1 w-10 text-center">Sl no.</th>
                            <th className="border-r border-black p-1 text-center">Product</th>
                            <th className="border-r border-black p-1 w-10 text-center">Qty</th>
                            <th className="border-r border-black p-1 w-20 text-center">Rate</th>
                            <th className="border-r border-black p-1 w-20 text-center">Amount</th>
                            <th className="border-r border-black p-1 w-12 text-center">Gst %</th>
                            <th className="border-r border-black p-1 w-20 text-center">Gst value</th>
                            <th className="p-1 w-24 text-center">Price with Gst</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.items || []).map((item, idx) => {
                            const amt = item.quantity * (item.unitPrice || 0);
                            const tax = amt * ((item.taxRate || 0) / 100);
                            return (
                                <tr key={idx} className="border-b border-black last:border-b-0 h-8">
                                    <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border-r border-black p-1 font-bold">{item.description}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity || ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? (item.unitPrice || 0).toLocaleString('en-IN') : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? amt.toLocaleString('en-IN') : ''}</td>
                                    <td className="border-r border-black p-1 text-center">{item.quantity ? `${item.taxRate}%` : ''}</td>
                                    <td className="border-r border-black p-1 text-right">{item.quantity ? tax.toLocaleString('en-IN') : ''}</td>
                                    <td className="p-1 text-right font-bold">{item.quantity ? (amt + tax).toLocaleString('en-IN') : ''}</td>
                                </tr>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 5 - (data.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="border-b border-black last:border-b-0 h-8">
                                <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Total</td>
                            <td className="p-1 text-right font-black">{(totals.totalWithGst || 0).toLocaleString('en-IN')}</td>
                        </tr>
                        {totals.freight > 0 && (
                            <tr className="border-t border-black font-bold">
                                <td colSpan={7} className="border-r border-black p-1 text-right">Freight</td>
                                <td className="p-1 text-right">{(totals.freight + totals.freightGst).toLocaleString('en-IN')}</td>
                            </tr>
                        )}
                        <tr className="border-t border-black font-bold">
                            <td colSpan={7} className="border-r border-black p-1 text-right">Discount/Adjustment</td>
                            <td className="p-1 text-right">{(data.discount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                        {data.isRoundOff && totals.roundOff !== 0 && (
                            <tr className="border-t border-black font-bold">
                                <td colSpan={7} className="border-r border-black p-1 text-right">Round Off</td>
                                <td className="p-1 text-right">{totals.roundOff > 0 ? '(+) ' : '(-) '}{(Math.abs(totals.roundOff) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        )}
                        <tr className="border-t border-black font-black bg-slate-50 text-sm">
                            <td colSpan={7} className="border-r border-black p-1.5 text-right uppercase">Grand Total</td>
                            <td className="p-1.5 text-right font-black">Rs. {(totals.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="border-x border-b border-black p-1.5 font-bold italic">Payment Terms: <span className="ml-4 font-normal not-italic">{data.paymentTerms || '------------------'}</span></div>
            <div className="border-x border-b border-black p-1.5 font-bold">Delivery Schedule: <span className="ml-4 font-medium">{data.deliveryTime || '------------------'}</span></div>
            <div className="border-x border-b border-black p-1.5 min-h-[60px]"><p className="font-bold underline decoration-slate-300">Special instructions regarding supply/packing:</p><p className="mt-1 font-medium italic">{data.specialNote || '------------------'}</p></div>
            <div className="grid grid-cols-2 border-x border-b border-black flex-1 min-h-[100px]"><div className="border-r border-black p-2 flex flex-col justify-between"><p className="font-bold">Accepted By (Vendor):</p><div className="border-t border-dotted border-black pt-1 w-3/4 mb-4"></div></div><div className="p-2 flex flex-col justify-between"><p className="font-bold">Authorized Signatory (Sree Meditec):</p><div className="border-t border-dotted border-black pt-1 w-3/4 mb-4"></div></div></div>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-2 md:gap-3 relative overflow-hidden p-0 md:p-2 bg-slate-50/50">
            {/* Unified Green Gradient Toolbar */}
            <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-4 md:p-5 flex flex-col gap-4 shadow-[0_20px_40px_-10px_rgba(6,78,59,0.55),_inset_0_2px_3px_rgba(255,255,255,0.1)] shrink-0 relative z-10 m-0 md:m-3 lg:m-4 rounded-none md:rounded-[2rem]">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none rounded-none md:rounded-[2rem]"></div>
                
                {/* Top Row: Title & Stats */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10 w-full">
                    <div className="hidden lg:flex items-center gap-4 group">
                        <div className="w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center text-[#c5a059] drop-shadow-md transition-transform group-hover:scale-110 shrink-0">
                            <History size={20} className="hidden xl:block" />
                            <History size={16} className="xl:hidden" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Supplier PO Registry</h2>
                            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">{invoices.filter(i => i.documentType === 'SupplierPO').length} Total Orders</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                        <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                            <ShoppingCart size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Total Procurement Value</p>
                            <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                                ₹{invoices
                                    .filter(i => i.documentType === 'SupplierPO')
                                    .reduce((sum, i) => sum + (i.grandTotal || 0), 0)
                                    .toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Actions & Search */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 relative z-10 w-full">
                    {/* Search & Filters */}
                    {viewState === 'history' && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto flex-1 group">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <FilingFilterDropdown value={filingFilter} onChange={setFilingFilter} />
                            </div>
                            <div className="relative w-full sm:max-w-xs xl:max-w-sm flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/50 transition-colors" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search orders..." 
                                    value={poSearch}
                                    onChange={(e) => setPoSearch(e.target.value.toUpperCase())}
                                    className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-2 pl-9 pr-10 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase shadow-inner"
                                />
                                {poSearch && (
                                    <button 
                                        onClick={() => setPoSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-100/50 hover:text-white transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="bg-emerald-900/40 p-1.5 rounded-[2.5rem] border border-emerald-700/50 shadow-inner w-full sm:w-fit shrink-0 flex gap-1">
                        <button onClick={() => setViewState('history')} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${viewState === 'history' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <History size={16} /> Registry
                        </button>
                        <button onClick={() => { setEditingId(null); setViewState('builder'); setBuilderTab('form'); setOrder({ date: new Date().toISOString().split('T')[0], cpoDate: new Date().toISOString().split('T')[0], items: [], status: 'Pending', documentType: 'SupplierPO', bankDetails: '33APGPS4675G2ZL', deliveryAddress: DEFAULT_DELIVERY_ADDRESS, advanceAmount: 0, isRoundOff: false, discount: 0, deliveryTime: 'Immediate', specialNote: '', paymentTerms: 'Terms: 100% against delivery or as agreed.', freightAmount: 0, freightTaxRate: 18, selectedBank: bankDetailsList.find(b => b.isDefault) || undefined }); }} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${viewState === 'builder' ? 'bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 shadow-[0_10px_20px_-5px_rgba(197,160,89,0.5)] scale-100' : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <PenTool size={16} /> New Procurement
                        </button>
                    </div>
                </div>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-none md:rounded-3xl border-0 md:border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-3 md:p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center gap-3">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] w-full sm:w-auto">Procurement History</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-4 py-2 font-inter">PO / Date</th>
                                    <th className="px-4 py-2">Vendor</th>
                                    <th className="px-4 py-2 hidden md:table-cell">Author</th>
                                    <th className="px-4 py-2 text-right hidden sm:table-cell">Grand Total</th>
                                    <th className="px-4 py-2 text-center hidden sm:table-cell">Filed Status</th>
                                    <th className="px-4 py-2 text-center hidden sm:table-cell">Status</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices
                                    .filter(i => i.documentType === 'SupplierPO')
                                    .filter(i => {
                                        if (poSearch) {
                                            const low = poSearch.toLowerCase();
                                            return (i.invoiceNumber || '').toLowerCase().includes(low) || 
                                                   (i.customerName || '').toLowerCase().includes(low) ||
                                                   (i.items || []).some(item => (item.description || '').toLowerCase().includes(low));
                                        }
                                        return true;
                                    })
                                    .filter(i => {
                                        if (filingFilter === 'All') return true;
                                        if (filingFilter === 'Not Updated') return !i.filedStatus || i.filedStatus === 'Not Updated';
                                        return i.filedStatus === filingFilter;
                                    })
                                    .sort((a, b) => {
                                        const numA = a.invoiceNumber || '';
                                        const numB = b.invoiceNumber || '';
                                        return numB.localeCompare(numA, undefined, { numeric: true });
                                    })
                                    .map(inv => (
                                    <tr key={inv.id} onClick={() => { setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-4 py-3">
                                            <div className="font-black text-slate-800 font-inter tracking-widest">{inv.invoiceNumber}</div>
                                            <div className="text-slate-400 font-bold text-[10px] mt-0.5 leading-tight">{inv.date || '—'}</div>
                                        </td>
                                        <td className="px-4 py-2 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-4 py-2 hidden md:table-cell">
                                            <div title={inv.createdBy || 'System'} className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200">
                                                {inv.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-teal-700 hidden sm:table-cell">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                                            <FiledStatusIndicator 
                                                id={inv.id} 
                                                filedStatus={inv.filedStatus} 
                                                filedHistory={inv.filedHistory} 
                                                currentUser={currentUser?.name || 'System'} 
                                                onUpdate={async (docId, updates) => {
                                                    await updateInvoice(docId, updates);
                                                }} 
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center hidden sm:table-cell"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className={`relative flex justify-end ${activeMenuId === inv.id ? 'z-50' : 'z-0'}`}>
                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === inv.id ? null : inv.id); }} className={`p-2 rounded-[2rem] transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-[2rem] p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button onClick={(e) => { e.stopPropagation(); setOrder(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-[2rem] transition-all flex-1 flex justify-center"><Edit size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-[2rem] transition-all flex-1 flex justify-center"><Download size={18} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleWhatsAppSend(inv); setActiveMenuId(null); }} className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-[2rem] transition-all flex-1 flex justify-center" title="Send on WhatsApp"><MessageSquare size={18} /></button>
                                                        {isAdmin && (
                                                            <button 
                                                                onClick={async (e) => { 
                                                                    e.stopPropagation(); 
                                                                    const confirmed = await showConfirm('Are you sure you want to delete this PO?');
                                                                    if (confirmed) {
                                                                        await removeInvoice(inv.id);
                                                                        addNotification('Record Deleted', 'Supplier PO has been removed.', 'success');
                                                                    }
                                                                    setActiveMenuId(null);
                                                                }} 
                                                                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
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
                    <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner flex gap-1 shrink-0 m-6">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${builderTab === 'form' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${builderTab === 'preview' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><Eye size={18}/> Print Layout</button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 custom-scrollbar">
                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">1. Registry Details</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="SMPOC No. *">
                                                <input type="text" className="w-full h-[36px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={order.invoiceNumber || ''} onChange={e => setOrder({...order, invoiceNumber: e.target.value})} placeholder="SMPOC-001" />
                                            </FormRow>
                                            <FormRow label="Date">
                                                <input type="date" className="w-full h-[36px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.date || ''} onChange={e => setOrder({...order, date: e.target.value})} />
                                            </FormRow>
                                            <FormRow label="Vendor Ref">
                                                <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.cpoNumber || ''} onChange={e => setOrder({...order, cpoNumber: e.target.value})} placeholder="Ref-1234" />
                                            </FormRow>
                                            <FormRow label="Ref Date">
                                                <input type="date" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.cpoDate || ''} onChange={e => setOrder({...order, cpoDate: e.target.value})} />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">2. Vendor & Delivery</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                                                <FormRow label="Vendor *">
                                                    <AutoSuggest
                                                        value={order.customerName || ''}
                                                        onChange={(val) => setOrder({ ...order, customerName: val })}
                                                        onSelect={handleVendorSelect}
                                                        suggestions={vendors}
                                                        filterKey="name"
                                                        placeholder="Search Vendor registry..."
                                                        className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none"
                                                    />
                                                </FormRow>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FormRow label="Vendor GST">
                                                        <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none uppercase" placeholder="Vendor GSTIN" value={order.customerGstin || ''} onChange={e => setOrder({...order, customerGstin: e.target.value.toUpperCase()})} />
                                                    </FormRow>
                                                    <FormRow label="Our GST">
                                                        <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-bold outline-none uppercase" placeholder="Billing GSTIN" value={order.bankDetails || ''} onChange={e => setOrder({...order, bankDetails: e.target.value.toUpperCase()})} />
                                                    </FormRow>
                                                </div>
                                                <FormRow label="Select Bank">
                                                    <select className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black outline-none cursor-pointer appearance-none"
                                                        value={order.selectedBank?.id || ''}
                                                        onChange={e => {
                                                            const selected = bankDetailsList.find(b => b.id === e.target.value);
                                                            setOrder({ ...order, selectedBank: selected });
                                                        }}
                                                    >
                                                        <option value="">Default Bank</option>
                                                        {bankDetailsList.map(bank => (
                                                            <option key={bank.id} value={bank.id}>{bank.bankName} ({bank.accountNo})</option>
                                                        ))}
                                                    </select>
                                                </FormRow>
                                                <FormRow label="Vendor Address">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-medium outline-none h-[80px] resize-none" value={order.customerAddress || ''} onChange={e => setOrder({...order, customerAddress: e.target.value})} placeholder="Vendor location..." />
                                                </FormRow>
                                            </div>
                                            <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                                                <FormRow label="Delivery Destination">
                                                    <textarea className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-medium outline-none h-[180px] resize-none" value={order.deliveryAddress || ''} onChange={e => setOrder({...order, deliveryAddress: e.target.value})} placeholder="Shipping address..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-2">
                                        <div className="border-b pb-1">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">3. Order Manifest</h3>
                                        </div>
                                        <div className="space-y-3 pb-24">
                                            {(order.items || []).length > 0 ? (order.items || []).map((item, idx) => (
                                                <div key={item.id} className="group space-y-3">
                                                    <div className="relative bg-slate-50 hover:bg-medical-50/20 p-4 rounded-[2rem] border border-slate-200 hover:border-medical-300 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 shadow-sm">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0 w-full">
                                                            <AutoSuggest
                                                                value={item.description || ''}
                                                                onChange={(val) => updateItem(item.id, 'description', val)}
                                                                onSelect={(prod) => {
                                                                    setOrder(prev => {
                                                                        const updatedItems = (prev.items || []).map(it => {
                                                                            if (it.id === item.id) {
                                                                                const tr = prod.taxRate || 18;
                                                                                return {
                                                                                    ...it,
                                                                                    description: prod.name,
                                                                                    unitPrice: prod.purchasePrice || 0,
                                                                                    taxRate: tr,
                                                                                    cgstRate: tr / 2,
                                                                                    sgstRate: tr / 2,
                                                                                    igstRate: 0,
                                                                                    hsn: prod.hsn || '',
                                                                                    amount: it.quantity * (prod.purchasePrice || 0),
                                                                                    gstValue: (it.quantity * (prod.purchasePrice || 0)) * (tr / 100),
                                                                                    priceWithGst: (it.quantity * (prod.purchasePrice || 0)) * (1 + (tr / 100))
                                                                                };
                                                                            }
                                                                            return it;
                                                                        });
                                                                        return { ...prev, items: updatedItems };
                                                                    });
                                                                }}
                                                                suggestions={products}
                                                                filterKey="name"
                                                                className="w-full bg-transparent font-black text-slate-800 outline-none uppercase placeholder:text-slate-300 text-sm h-[24px]"
                                                                placeholder="Select Part..."
                                                            />
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-medical-500 uppercase tracking-widest">HSN: {item.hsn || '---'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto shadow-sm">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[7px] font-black text-slate-400 uppercase">Qty</span>
                                                                <input 
                                                                    type="number"
                                                                    value={(item.quantity || '')}
                                                                    onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                                    className="w-10 bg-transparent text-center font-black text-medical-600 outline-none text-sm"
                                                                />
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-300 mt-2">×</span>
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[7px] font-black text-slate-400 uppercase">Rate</span>
                                                                <input 
                                                                    type="number"
                                                                    value={(item.unitPrice || '')}
                                                                    onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                                    className="w-20 bg-transparent font-black text-slate-700 outline-none text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase">CGST%</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={(item.cgstRate || '')}
                                                                        onChange={e => updateItem(item.id, 'cgstRate', Number(e.target.value))}
                                                                        className="w-8 bg-transparent text-center font-black text-emerald-600 outline-none text-xs"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase">SGST%</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={(item.sgstRate || '')}
                                                                        onChange={e => updateItem(item.id, 'sgstRate', Number(e.target.value))}
                                                                        className="w-8 bg-transparent text-center font-black text-emerald-600 outline-none text-xs"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-center border-l border-slate-100 pl-1">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase">IGST%</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={(item.igstRate || '')}
                                                                        onChange={e => updateItem(item.id, 'igstRate', Number(e.target.value))}
                                                                        className="w-8 bg-transparent text-center font-black text-medical-600 outline-none text-xs"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-center border-l border-slate-100 pl-1">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase">GST ₹</span>
                                                                    <span className="text-[10px] font-black text-slate-600 px-1">{item.gstValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                                <div className="flex flex-col items-center border-l border-slate-100 pl-1">
                                                                    <span className="text-[7px] font-black text-slate-400 uppercase">Total%</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={(item.taxRate || '')}
                                                                        onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))}
                                                                        className="w-8 bg-transparent text-center font-black text-slate-400 outline-none text-[10px]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => setOrder(prev => ({ ...prev, items: (prev.items || []).filter(it => it.id !== item.id) }))}
                                                            className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all self-end sm:self-center opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setBuilderTab('spares')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Store</button>
                                                            <button onClick={() => handleAddItem(undefined, idx + 1)} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setBuilderTab('spares')} className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all border border-teal-100">+ Store</button>
                                                    <button onClick={() => handleAddItem()} className="px-3 py-1 bg-medical-50 text-medical-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-medical-100 transition-all border border-medical-100">+ Row</button>
                                                </div>
                                            )}
                                    </div>
                                </section>

                                    <section className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">
                                            <Percent size={14} className="text-medical-500" />
                                            4. Charges & Discounts
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <FormRow label="Discount (₹)">
                                                <input type="number" className="w-full h-[36px] bg-white border border-rose-200 rounded-[2rem] px-3 py-1.5 text-sm font-black outline-none text-rose-600" value={order.discount || ''} onChange={e => setOrder({...order, discount: Number(e.target.value)})} placeholder="0.00" />
                                            </FormRow>
                                            <FormRow label="Freight (₹)">
                                                <input type="number" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-black outline-none text-teal-600" value={order.freightAmount || ''} onChange={e => setOrder({...order, freightAmount: Number(e.target.value)})} placeholder="0.00" />
                                            </FormRow>
                                            <FormRow label="Freight GST %">
                                                <input type="number" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-black outline-none text-teal-600" value={order.freightTaxRate || ''} onChange={e => setOrder({...order, freightTaxRate: Number(e.target.value)})} placeholder="18" />
                                            </FormRow>
                                        </div>
                                    </section>

                                    <section className="space-y-4 pb-20">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-1 flex items-center gap-2">5. Terms & Instructions</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormRow label="Delivery Time">
                                                <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.deliveryTime || 'Immediate'} onChange={e => setOrder({...order, deliveryTime: e.target.value})} placeholder="Immediate / 1 Week" />
                                            </FormRow>
                                            <FormRow label="Payment Terms">
                                                <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.paymentTerms || ''} onChange={e => setOrder({...order, paymentTerms: e.target.value})} placeholder="Terms: 100% against delivery" />
                                            </FormRow>
                                            <div className="sm:col-span-2">
                                                <FormRow label="Special Instructions">
                                                    <input type="text" className="w-full h-[36px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-sm font-bold outline-none" value={order.specialNote || ''} onChange={e => setOrder({...order, specialNote: e.target.value})} placeholder="Packing / supply notes..." />
                                                </FormRow>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
                                    <div className="flex-1 flex items-center justify-between px-2 order-2 sm:order-1">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Grand Total</span>
 <span className="text-xl font-bold tracking-tight text-teal-600">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-[2rem] border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-[36px]">
                                                <ToggleSwitch checked={!!order.isRoundOff} onChange={() => setOrder(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))} />
                                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Auto Round</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => { setViewState('history'); setEditingId(null); }}
                                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                        >
                                            Discard
                                        </button>
                                    </div>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button 
                                            onClick={() => handleSave('Draft')}
                                            className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-500/20 active:scale-95"
                                        >
                                            Save Draft
                                        </button>
                                        <button 
                                            onClick={() => handleSave('Finalized')}
                                            className="flex-1 px-6 py-3 bg-gradient-to-r from-medical-600 to-teal-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:from-medical-700 hover:to-teal-600 transition-all shadow-xl shadow-medical-500/30 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Finalize & Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.55] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    {renderPOTemplate(order, totals)}
                                </div>
                            </div>
                        )}
                        {builderTab === 'spares' && (
                            <div className="h-full bg-white flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg sm:text-xl">Spares Store</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Select hardware for procurement</p>
                                    </div>
                                    <div className="relative w-full sm:w-80">
                                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Filter Store..." className="w-full pl-11 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                    </div>
                                </div>
                                
                                {order.customerName && (
                                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center gap-3 text-indigo-700">
                                        <Star size={18} fill="currentColor" className="text-indigo-400 shrink-0" />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Prioritizing products indexed for "{order.customerName}"</span>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                    {filteredSpares.map(prod => {
                                        const isVendorMatch = (prod.supplier || '').toLowerCase() === order.customerName?.toLowerCase();
                                        return (
                                            <div key={prod.id} 
                                                 className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                                                     isVendorMatch 
                                                     ? 'bg-indigo-50/20 border-indigo-200 shadow-md ring-1 ring-indigo-100' 
                                                     : 'bg-white border-slate-300 hover:border-medical-400 shadow-sm'
                                                 }`} 
                                                 onClick={() => handleAddItem(prod)}>
                                                {isVendorMatch && <div className="absolute top-0 right-0 p-2 bg-indigo-600 text-white rounded-bl-2xl"><Star size={12} fill="currentColor" /></div>}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border ${isVendorMatch ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>{prod.category || 'N/A'}</span>
                                                        <span className="text-[9px] font-mono text-slate-400 tracking-tighter uppercase">{prod.sku || 'N/A'}</span>
                                                    </div>
                                                    <h4 className="font-black text-slate-800 text-sm leading-tight group-hover:text-medical-700 transition-colors">{prod.name}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase truncate">{prod.supplier || 'N/A Supplier'}</p>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-4">
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Buy Rate</p>
                                                        <p className="text-sm font-black text-slate-800 tracking-tight">₹{(prod.purchasePrice || 0).toLocaleString('en-IN')}</p>
                                                    </div>
                                                    <div className={`p-2 rounded-[2rem] border shadow-sm transition-all group-hover:scale-110 ${isVendorMatch ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-medical-600 border-slate-300 group-hover:bg-medical-600 group-hover:text-white'}`}>
                                                        <Plus size={20} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
