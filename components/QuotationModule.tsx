import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, TabView } from '../types';
import { 
    Plus, Search, Trash2, PenTool, X,
    History, Download, Edit, Eye, List as ListIcon, RefreshCw, MoreVertical,
    Image as ImageIcon, FileText, CheckCircle, Percent, CreditCard, ShieldCheck, User, ArrowUpRight, MessageSquare, Mail
} from 'lucide-react';
import { useData } from './DataContext';
import { PDFService } from '../services/PDFService';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero Only';
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
        return inWords(Math.floor(num / 10000000)) + 'crore ' + (num % 10000000 !== 0 ? inWords(num % 10000000) : '');
    };
    const result = inWords(Math.floor(num));
    return result ? '(' + result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' only)' : '';
};

const INITIAL_QUOTE_STATE: Partial<Invoice> = {
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    subject: '',
    status: 'Draft',
    customerName: '',
    customerHospital: '',
    customerAddress: '',
    customerGstin: '',
    phone: '',
    discount: 0,
    freightAmount: 0,
    freightTaxRate: 18,
    paymentTerms: '100% advance before delivery.',
    deliveryTerms: 'Ex-stock, subject to prior sale.',
    warrantyTerms: 'Standard 1 year warranty.',
    bankAndBranch: 'ICICI Bank, Branch: Selaiyur',
    accountNo: '603705016939',
    sellerProfile: undefined,
    isRoundOff: false
};

const getQuoteNumberParts = (ref: string) => {
    const parts = ref.split('/');
    let quoteNum = 0;
    let quoteNumStr = '';
    let revNum = 0;
    let fy = '';
    
    parts.forEach(p => {
        const cleanP = p.trim();
        // Match Fiscal Year (e.g., 25-26)
        if (cleanP.includes('-') && cleanP.length === 5 && /\d{2}-\d{2}/.test(cleanP)) {
            fy = cleanP;
        } 
        // Match Revision (e.g., R1, R2)
        else if (cleanP.startsWith('R') && cleanP.length > 1 && !isNaN(parseInt(cleanP.substring(1)))) {
            revNum = parseInt(cleanP.substring(1));
        } 
        // Match Quotation Number (e.g., 10, 986z) - exclude known prefixes or fragments
        else if (cleanP !== 'SMQ' && /^\d+/.test(cleanP)) {
            const n = parseInt(cleanP);
            if (!isNaN(n)) {
                quoteNum = n;
                quoteNumStr = cleanP;
            }
        }
    });
    return { fy, quoteNum, quoteNumStr, revNum };
};

const calculateDetailedTotals = (quote: Partial<Invoice>) => {
    const items = quote.items || [];
    const subtotal = items.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice)), 0);
    const itemGstTotal = items.reduce((sum, p) => sum + ((Number(p.quantity) * Number(p.unitPrice)) * (Number(p.taxRate) / 100)), 0);
    
    const freight = Number(quote.freightAmount) || 0;
    const freightGst = freight * ((Number(quote.freightTaxRate) || 0) / 100);
    const discount = Number(quote.discount) || 0;

    const grandTotalRaw = subtotal + itemGstTotal + freight + freightGst - discount;
    let roundOff = 0;
    let grandTotal = grandTotalRaw;
    if (quote.isRoundOff) {
        grandTotal = Math.round(grandTotalRaw);
        roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    }
    return { subtotal, itemGstTotal, freight, freightGst, discount, grandTotal, roundOff, grandTotalRaw };
};

export const QuotationModule: React.FC = () => {
    const { clients, products, invoices, addInvoice, updateInvoice, removeInvoice, addNotification, currentUser, pendingQuoteData, setPendingQuoteData, financialYear, companyProfiles, isSystemAdmin, bankDetailsList = [], setPendingInvoiceData, setActiveTab, showConfirm, previewPDF, showAlert, showPrompt } = useData();

    const handleWhatsAppSend = async (inv: Invoice) => {
        const clientObj = clients.find(c => c.name === inv.customerName);
        let prefilledPhone = (inv.phone || clientObj?.phone || '').replace(/\D/g, '');
        if (prefilledPhone && !prefilledPhone.startsWith('91') && prefilledPhone.length === 10) {
            prefilledPhone = '91' + prefilledPhone;
        }
        const result = await showPrompt('Confirm WhatsApp recipient number (with country code e.g. 919876543210):', prefilledPhone);
        if (!result) return;
        let phone = result.replace(/\D/g, '');
        if (!phone.startsWith('91') && phone.length === 10) {
            phone = '91' + phone;
        }
        const message = `Hello, here are the details for your Quotation *#${inv.invoiceNumber}*:\nDate: ${formatDateDDMMYYYY(inv.date)}\nTotal Amount: *₹${(inv.grandTotal || 0).toLocaleString('en-IN')}*\nThank you for doing business with us!\n- Sree Meditec`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };
    const handleEmailSend = async (inv: Invoice) => {
        const clientObj = clients.find(c => c.name === inv.customerName);
        const prefilledEmail = inv.email || clientObj?.email || '';
        const email = await showPrompt('Confirm recipient email address:', prefilledEmail);
        if (!email) return;
        
        // 1. Generate and download PDF
        await handleDownloadPDF(inv);
        
        // 2. Draft Gmail web link
        const subject = `Quotation ${inv.invoiceNumber} from Sree Meditec`;
        const body = `Dear Customer,

Please find the summary of your quotation #${inv.invoiceNumber} below:

Date: ${formatDateDDMMYYYY(inv.date)}
Total Amount: INR ${(inv.grandTotal || 0).toLocaleString('en-IN')}

(Note: Your PDF document has been prepared and downloaded. Please drag and drop or attach it to this Gmail window before sending.)

Thank you for your business.

Warm regards,
Sree Meditec`;
        
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank');
    };

    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [quoteSearch, setQuoteSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const [logo, setLogo] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [seal, setSeal] = useState<string | null>(null);
    const [repName, setRepName] = useState('S. Suresh Kumar.');
    const [repPhone, setRepPhone] = useState('9884818398');

    const [quote, setQuote] = useState<Partial<Invoice>>(INITIAL_QUOTE_STATE);

    const currentFY = financialYear;

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !quote.invoiceNumber) {
            const quotes = invoices.filter(i => i.documentType === 'Quotation');
            let maxNum = 0;
            quotes.forEach(q => {
                const { fy, quoteNum } = getQuoteNumberParts(q.invoiceNumber);
                if (fy === currentFY) {
                    if (quoteNum > maxNum) maxNum = quoteNum;
                }
            });
            setQuote(prev => ({
                ...prev,
                invoiceNumber: `SMQ/${currentFY}/${maxNum + 1}`
            }));
        }
    }, [viewState, editingId, invoices, currentFY, quote.invoiceNumber]);

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !quote.selectedBank && bankDetailsList && bankDetailsList.length > 0) {
            const defaultBank = bankDetailsList.find(b => b.isDefault);
            if (defaultBank) {
                setQuote(prev => ({
                    ...prev,
                    selectedBank: defaultBank
                }));
            }
        }
    }, [viewState, editingId, bankDetailsList, quote.selectedBank]);

    // Handle conversion from Lead
    useEffect(() => {
        if (pendingQuoteData) {
            setViewState('builder');
            setBuilderTab('form');
            setQuote(prev => ({
                ...prev,
                ...pendingQuoteData,
                invoiceNumber: prev.invoiceNumber // Keep existing auto-gen ID
            }));
            setPendingQuoteData(null);
            addNotification('Lead Loaded', 'Customer and product details pre-filled from lead.', 'info');
        }
    }, [pendingQuoteData]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleDownloadPDF = async (data: Partial<Invoice>) => {
        try {
            const blob = await PDFService.generateQuotationPDF(data, {
                logo,
                signature,
                seal,
                repName,
                repPhone
            }, data.selectedBank);
            previewPDF(blob, `${data.invoiceNumber || 'Quotation'}.pdf`);
        } catch (error) {
            console.error("Failed to generate Quotation PDF:", error);
            await showAlert("Failed to generate PDF. Please check the console.", "Error");
        }
    };

    const handleAddItem = (prod?: any, index?: number) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            model: prod?.model || '',
            features: prod?.description || '',
            hsn: prod?.hsn || '',
            quantity: 1,
            unit: 'no',
            unitPrice: prod?.sellingPrice || 0,
            taxRate: prod?.taxRate || 12,
            amount: prod?.sellingPrice || 0,
            gstValue: (prod?.sellingPrice || 0) * ((prod?.taxRate || 12) / 100),
            priceWithGst: (prod?.sellingPrice || 0) * (1 + ((prod?.taxRate || 12) / 100))
        };
        setQuote(prev => {
            const current = prev.items || [];
            const idx = index ?? current.length;
            return { ...prev, items: [...current.slice(0, idx), newItem, ...current.slice(idx)] };
        });
    };

    const handleClientSelect = (inputValue: string) => {
        const client = clients.find(c => c.name.toUpperCase() === inputValue.toUpperCase() || (c.hospital && c.hospital.toUpperCase() === inputValue.toUpperCase()));
        if (client) {
            setQuote(prev => ({
                ...prev,
                customerName: client.name.toUpperCase(),
                customerHospital: (client.hospital || '').toUpperCase(),
                customerAddress: client.address || '',
                customerGstin: (client.gstin || '').toUpperCase(),
                phone: client.phone || ''
            }));
        } else setQuote(prev => ({ ...prev, customerName: inputValue.toUpperCase() }));
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setQuote(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name.toUpperCase() === value.toUpperCase());
                        if (masterProd) {
                            updated.unitPrice = masterProd.sellingPrice; // USE sellingPrice
                            updated.taxRate = masterProd.taxRate || 12;
                            updated.model = masterProd.model || '';
                            updated.features = masterProd.description || '';
                        }
                    }
                    updated.amount = updated.quantity * updated.unitPrice;
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

    const handleRevise = (inv: Invoice) => {
        // Source: SMQ/25-26/14 or SMQ/R1/25-26/14
        const parts = inv.invoiceNumber.split('/');
        let baseRef: string; // "25-26/14"
        let nextRevNumber = 1;

        if (parts[1] && parts[1].startsWith('R')) {
            // It's already a revision, e.g. SMQ/R1/25-26/14
            baseRef = parts.slice(2).join('/');
            // Count total revisions existing for this baseRef to get next number
            nextRevNumber = invoices.filter(i => i.invoiceNumber.includes(`/${baseRef}`) && i.invoiceNumber.includes('/R')).length + 1;
        } else {
            // It's the original quote, e.g. SMQ/25-26/14
            baseRef = parts.slice(1).join('/');
            nextRevNumber = 1;
        }

        const revisedQuote: Partial<Invoice> = {
            ...inv,
            id: `QT-${Date.now()}`,
            invoiceNumber: `SMQ/R${nextRevNumber}/${baseRef}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Draft',
            createdBy: currentUser?.name || 'System'
        };
        
        setQuote(revisedQuote);
        setEditingId(null); // Ensuring it's treated as a new record when saving
        setViewState('builder');
        setBuilderTab('form');
        addNotification('Revision Initialized', `Created revised draft ${revisedQuote.invoiceNumber} based on existing data.`, 'info');
    };

    const handleSave = (status: 'Draft' | 'Finalized') => {
        if (!quote.customerName || !quote.items?.length) {
            alert("Fill customer details and items.");
            return null;
        }
        const totals = calculateDetailedTotals(quote);
        const finalData: Invoice = {
            ...quote as Invoice,
            id: editingId || quote.id || `QT-${Date.now()}`,
            subtotal: totals.subtotal,
            taxTotal: totals.itemGstTotal + totals.freightGst,
            grandTotal: totals.grandTotal,
            status: status === 'Draft' ? 'Draft' : 'Pending',
            documentType: 'Quotation',
            createdBy: currentUser?.name || 'System'
        };
        if (editingId) updateInvoice(editingId, finalData);
        else addInvoice(finalData);
        setViewState('history');
        setEditingId(null);
        addNotification('Registry Updated', `Quotation ${finalData.invoiceNumber} saved as ${status}.` , 'success');
        return finalData;
    };

    const handleDelete = async (id: string, ref: string) => {
        const confirmed = await showConfirm(`Are you sure you want to delete quotation ${ref}? This action cannot be undone.`);
        if (confirmed) {
            try {
                await removeInvoice(id);
                addNotification('Quotation Deleted', `Successfully removed ${ref} from the registry.`, 'success');
            } catch (error) {
                console.error("Deletion failed:", error);
                addNotification('Error', 'Failed to delete quotation.', 'error');
            }
        }
    };

    const totals = useMemo(() => calculateDetailedTotals(quote), [quote]);

    const sortedQuotes = useMemo(() => {
        let filtered = invoices.filter(i => i.documentType === 'Quotation');
        
        if (quoteSearch) {
            const lowSearch = quoteSearch.toLowerCase();
            filtered = filtered.filter(i => 
                i.invoiceNumber.toLowerCase().includes(lowSearch) ||
                (i.customerName || '').toLowerCase().includes(lowSearch) ||
                (i.subject || '').toLowerCase().includes(lowSearch) ||
                (i.createdBy || '').toLowerCase().includes(lowSearch)
            );
        }

        return filtered.sort((a, b) => {
                const aData = getQuoteNumberParts(a.invoiceNumber);
                const bData = getQuoteNumberParts(b.invoiceNumber);
                
                // 1. Primary: Fiscal Year (Descending - e.g., 26-27 before 25-26)
                if (aData.fy !== bData.fy) {
                    return bData.fy.localeCompare(aData.fy);
                }
                
                // 2. Secondary: Numeric Quotation Number (Descending - e.g., 11 before 10)
                if (aData.quoteNum !== bData.quoteNum) {
                    return bData.quoteNum - aData.quoteNum;
                }
                
                // 3. Tertiary: Full String Match for Alphanumeric Suffixes (Descending - e.g., 986z before 986)
                if (aData.quoteNumStr !== bData.quoteNumStr) {
                    return bData.quoteNumStr.localeCompare(aData.quoteNumStr);
                }
                
                // 4. Quaternary: Revision Number (Descending - R2 before R1)
                return bData.revNum - aData.revNum;
            });
    }, [invoices]);

    const filteredCatalog = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(catalogSearch.toLowerCase()));
    }, [products, catalogSearch]);

    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden p-2">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-300 w-fit shrink-0 shadow-sm">
                <button onClick={() => setViewState('history')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'history' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} /> History</button>
                <button 
                    onClick={() => { 
                        setEditingId(null); 
                        setViewState('builder'); 
                        setBuilderTab('form'); 
                        setQuote({ ...INITIAL_QUOTE_STATE, invoiceNumber: '' }); 
                    }} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${viewState === 'builder' ? 'bg-medical-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Plus size={16} /> New Quote
                </button>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Quotations Archive</h3>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search quotes..." 
                                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-[10px] font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase"
                                value={quoteSearch}
                                onChange={(e) => setQuoteSearch(e.target.value.toUpperCase())}
                            />
                            {quoteSearch && (
                                <button 
                                    onClick={() => setQuoteSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr><th className="px-6 py-4">Reference</th><th className="px-6 py-4">Consignee</th><th className="px-6 py-4">Author</th><th className="px-6 py-4 text-right">Grand Total</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedQuotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={32} className="opacity-10" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No matching quotations found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sortedQuotes.map(inv => (
                                    <tr key={inv.id} onClick={() => { setQuote(inv); setEditingId(inv.id); setViewState('builder'); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                                        <td className="px-6 py-4 font-black">{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-6 py-4">
                                            <div 
                                                title={inv.createdBy || 'System'}
                                                className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200 cursor-help"
                                            >
                                                {inv.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-teal-700">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-6 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inv.status === 'Draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{inv.status}</span></td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className={`relative flex justify-end ${activeMenuId === inv.id ? 'z-50' : 'z-0'}`}>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === inv.id ? null : inv.id); 
                                                    }} 
                                                    className={`p-2 rounded-xl transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-200 shadow-2xl rounded-2xl p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 border-slate-300">
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setPendingInvoiceData({
                                                                    customerName: inv.customerName,
                                                                    customerGstin: inv.customerGstin,
                                                                    customerAddress: inv.customerAddress,
                                                                    phone: inv.phone,
                                                                    email: inv.email,
                                                                    items: inv.items,
                                                                    discount: inv.discount,
                                                                    freight: inv.freight,
                                                                    freightTaxRate: inv.freightTaxRate,
                                                                    isRoundOff: inv.isRoundOff,
                                                                    remarks: `Converted from Quotation ${inv.invoiceNumber}`,
                                                                    subject: inv.subject,
                                                                    selectedBank: inv.selectedBank
                                                                });
                                                                setActiveTab(TabView.BILLING);
                                                                setActiveMenuId(null); 
                                                            }} 
                                                            className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Convert to Invoice"
                                                        >
                                                            <ArrowUpRight size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleRevise(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                                                            title="Revise Quote"
                                                        >
                                                            <RefreshCw size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setQuote(inv); setEditingId(inv.id); setViewState('builder'); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                                            title="Edit Quote"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleWhatsAppSend(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                            title="Send on WhatsApp"
                                                        >
                                                            <MessageSquare size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleEmailSend(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Send via Email"
                                                        >
                                                            <Mail size={18} />
                                                        </button>

                                                        {isSystemAdmin && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(inv.id, inv.invoiceNumber); setActiveMenuId(null); }} 
                                                                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                                title="Delete Quotation"
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
                    <div className="flex bg-slate-50 border-b border-slate-300 shrink-0 overflow-x-auto no-scrollbar">
                        <button onClick={() => setBuilderTab('form')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'form' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><PenTool size={18}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`flex-1 min-w-[100px] py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 whitespace-nowrap ${builderTab === 'preview' ? 'bg-white text-medical-700 border-b-4 border-medical-500' : 'text-slate-400 hover:text-slate-700'}`}><Eye size={18}/> Print Layout</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-12 custom-scrollbar bg-white">
                                <section className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2"><FileText size={14}/> Quotation Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Reference No. *</label>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase" value={quote.invoiceNumber || ''} onChange={e => setQuote({...quote, invoiceNumber: e.target.value.toUpperCase()})} placeholder="SMQ/25-26/1" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Quotation Date</label>
                                            <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.date || ''} onChange={e => setQuote({...quote, date: e.target.value})} />
                                        </div>
                                    </div>
                                </section>
                                <section className="space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2"><User size={14}/> Client Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Name *</label><input type="text" list="client-list" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 uppercase" value={quote.customerName || ''} onChange={e => handleClientSelect(e.target.value)} placeholder="Search or Enter Client Name" /></div>
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client GST Number</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none uppercase" value={quote.customerGstin || ''} onChange={e => setQuote({...quote, customerGstin: e.target.value.toUpperCase()})} placeholder="GSTIN" /></div>
                                        </div>
                                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Address</label><textarea rows={4} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none resize-none" value={quote.customerAddress || ''} onChange={e => setQuote({...quote, customerAddress: e.target.value})} placeholder="Full site or billing address..." /></div>
                                    </div>
                                </section>
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Subject</h3>
                                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Subject Line</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={quote.subject || ''} onChange={e => setQuote({...quote, subject: e.target.value})} placeholder="e.g. Ultrasound Gel (5L)" /></div>
                                </section>
                                <section className="space-y-2">
                                    <div className="border-b pb-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircle size={14}/> Product Details</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {(quote.items || []).length > 0 ? (quote.items || []).map((item, idx) => (
                                            <div key={item.id} className="group space-y-3">
                                                <div className="p-4 sm:p-5 bg-slate-50 border border-slate-300 rounded-[1.5rem] sm:rounded-[2rem] relative hover:bg-white hover:border-medical-200 transition-all">
                                                    <button onClick={() => setQuote({...quote, items: (quote.items || []).filter(i => i.id !== item.id)})} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 transition-opacity opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                                        <div className="md:col-span-6 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Product Name</label><input type="text" list="prod-list" className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold uppercase" value={item.description || ''} onChange={e => updateItem(item.id, 'description', e.target.value.toUpperCase())} /></div>
                                                        <div className="md:col-span-6 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Model</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold uppercase" value={item.model || ''} onChange={e => updateItem(item.id, 'model', e.target.value.toUpperCase())} /></div>
                                                        <div className="grid grid-cols-2 md:col-span-4 gap-4">
                                                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Qty</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))} /></div>
                                                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Type</label><select className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold appearance-none" value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)}><option value="nos">nos</option><option value="no">no</option><option value="jar">jar</option><option value="packet">packet</option><option value="meter">meter</option></select></div>
                                                        </div>
                                                        <div className="md:col-span-3 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Rate</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-right" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} /></div>
                                                        <div className="md:col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">GST %</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-center" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', Number(e.target.value))} /></div>
                                                        <div className="md:col-span-3 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Total</label><div className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-right text-medical-700 truncate">₹{(item.unitPrice * item.quantity * (1 + item.taxRate/100)).toLocaleString('en-IN')}</div></div>
                                                        <div className="md:col-span-12 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Features</label><textarea className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold resize-none" rows={2} value={item.features || ''} onChange={e => updateItem(item.id, 'features', e.target.value)} /></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Catalog</button>
                                                        <button onClick={() => handleAddItem(undefined, idx + 1)} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ Row</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex gap-2">
                                                <button onClick={() => setBuilderTab('catalog')} className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all">+ Catalog</button>
                                                <button onClick={() => handleAddItem()} className="text-[10px] font-black text-medical-600 bg-medical-50 px-3 py-1.5 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all">+ Row</button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                                <section className="space-y-6"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2"><Percent size={14}/> Charges & Discounts</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Discount (₹)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.discount} onChange={e => setQuote({...quote, discount: Number(e.target.value)})} placeholder="0.00" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Freight (₹)</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.freightAmount} onChange={e => setQuote({...quote, freightAmount: Number(e.target.value)})} placeholder="0.00" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Freight GST %</label><input type="number" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={quote.freightTaxRate} onChange={e => setQuote({...quote, freightTaxRate: Number(e.target.value)})} placeholder="18" /></div></div></section>
                                <section className="space-y-6"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2"><CreditCard size={14}/> Terms & Conditions</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Payment Terms</label><textarea rows={3} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none" value={quote.paymentTerms} onChange={e => setQuote({...quote, paymentTerms: e.target.value})} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Delivery Terms</label><textarea rows={3} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none" value={quote.deliveryTerms} onChange={e => setQuote({...quote, deliveryTerms: e.target.value})} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Warranty Terms</label><textarea rows={3} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none" value={quote.warrantyTerms} onChange={e => setQuote({...quote, warrantyTerms: e.target.value})} /></div></div></section>
                                <section className="space-y-6 pb-24"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center gap-2"><ImageIcon size={14}/> Brand Assets</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rep Name *</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={repName} onChange={e => setRepName(e.target.value)} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Rep Phone *</label><input type="text" className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" value={repPhone} onChange={e => setRepPhone(e.target.value)} /></div><div className="space-y-1.5"><div className="flex flex-col gap-1.5 w-full"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Seller Profile</label><select className="w-full h-[42px] bg-white border border-medical-200 rounded-xl px-4 py-2 text-xs font-black outline-none cursor-pointer focus:ring-4 focus:ring-medical-500/10 transition-all text-medical-700" value={quote.sellerProfile?.id || ''} onChange={e => { const selected = companyProfiles.find(p => p.id === e.target.value); setQuote(prev => ({ ...prev, sellerProfile: selected })); }}><option value="">Default (Sree Meditec)</option>{companyProfiles.map(profile => (<option key={profile.id} value={profile.id}>{profile.companyName}</option>))}</select></div></div><div className="space-y-1.5"><div className="flex flex-col gap-1.5 w-full"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Select Bank</label><select className="w-full h-[42px] bg-white border border-medical-200 rounded-xl px-4 py-2 text-xs font-black outline-none cursor-pointer focus:ring-4 focus:ring-medical-500/10 transition-all text-medical-700" value={quote.selectedBank?.id || ''} onChange={e => { const selected = bankDetailsList.find(b => b.id === e.target.value); setQuote(prev => ({ ...prev, selectedBank: selected })); }}><option value="">Default Bank</option>{bankDetailsList.map(bank => (<option key={bank.id} value={bank.id}>{bank.bankName} ({bank.accountNo})</option>))}</select></div></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-6"><div className="p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 transition-all cursor-pointer relative group"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, setLogo)} /><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-medical-600 transition-colors">{logo ? <img src={logo} className="w-full h-full object-contain rounded-xl" /> : <ImageIcon size={20}/>}</div><p className="text-[9px] font-black uppercase text-slate-400">Logo</p></div><div className="p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 transition-all cursor-pointer relative group"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, setSignature)} /><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-medical-600 transition-colors">{signature ? <img src={signature} className="w-full h-full object-contain rounded-xl" /> : <PenTool size={20}/>}</div><p className="text-[9px] font-black uppercase text-slate-400">Signature</p></div><div className="p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center gap-3 hover:bg-slate-50 transition-all cursor-pointer relative group"><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleImageUpload(e, setSeal)} /><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-medical-600 transition-colors">{seal ? <img src={seal} className="w-full h-full object-contain rounded-xl" /> : <ShieldCheck size={20}/>}</div><p className="text-[9px] font-black uppercase text-slate-400">Stamp</p></div></div></section>
                                <div className="sticky bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-30 shrink-0">
                                    <div className="flex-1 flex items-center justify-between px-2 order-2 sm:order-1 gap-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Value</span>
                                                <span className="text-2xl font-black text-medical-600 tracking-tight flex items-baseline gap-2">
                                                    ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    {quote.isRoundOff && totals.roundOff !== 0 && (
                                                        <span className={`text-xs font-bold ${totals.roundOff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            ({totals.roundOff > 0 ? '+' : ''}{totals.roundOff})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-200/60 transition-all cursor-pointer group h-[32px] select-none" onClick={() => setQuote(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                <div className={`w-7 h-3.5 rounded-full relative transition-all ${quote.isRoundOff ? 'bg-medical-600' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${quote.isRoundOff ? 'translate-x-3' : 'translate-x-0'}`} />
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-700 transition-colors">Round Off</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setViewState('history'); setEditingId(null); }} className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors shadow-sm">Discard</button>
                                    </div>
                                    <div className="flex-1 flex gap-3 order-1 sm:order-2">
                                        <button onClick={() => handleSave('Draft')} className="flex-1 px-8 py-3.5 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-500/20 active:scale-95">Save Draft</button>
                                        <button onClick={() => { const finalData = handleSave('Finalized'); if (finalData) handleDownloadPDF(finalData); }} className="flex-1 px-8 py-3.5 bg-medical-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">Finalize & PDF</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-4 md:p-8 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.7] xl:scale-[0.85] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    <div className="bg-white p-[15mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 shadow-2xl mx-auto" style={{ fontFamily: 'Calibri, sans-serif' }}>
                                        <div className="text-center mb-4">
                                            {logo && <img src={logo} className="h-16 object-contain mb-2 mx-auto" />}
                                            <h1 className="text-4xl font-bold uppercase mb-1">{quote.sellerProfile?.companyName || 'SREE MEDITEC'}</h1>
                                            <p className="text-[10px] font-semibold">{quote.sellerProfile?.address || 'New No: 18, Old No: 2, Bajanai Koil Street, Rajajipakkam, Chennai 600 073.'}</p>
                                            <p className="text-[10px] font-semibold">Mob: {quote.sellerProfile?.phone || '9884818398'}.</p>
                                            <p className="text-[10px] font-bold mt-1">GST NO: {quote.sellerProfile?.gstin || '33APGPS4675G2ZL'}</p>
                                        </div>
                                        <div className="text-center mb-8">
                                            <h2 className="text-xl font-bold underline uppercase tracking-widest">Quotation</h2>
                                        </div>
                                        <div className="flex justify-between font-bold mb-6 text-sm">
                                            <div>Ref: {quote.invoiceNumber}</div>
                                            <div>Date: {formatDateDDMMYYYY(quote.date)}</div>
                                        </div>
                                        <div className="mb-6">
                                            <p className="font-bold text-sm">To,</p>
                                            <p className="font-bold uppercase text-sm leading-tight">{quote.customerName || '---'}</p>
                                            <p className="text-sm whitespace-pre-wrap leading-snug">{quote.customerAddress}</p>
                                            {quote.customerGstin && <p className="text-sm font-bold">GST: {quote.customerGstin}</p>}
                                        </div>
                                        <div className="mt-6 mb-4 text-sm font-bold italic">Sub: Reg. Price Quotation for {quote.subject || 'Medical Equipment'}.</div>
                                        <div className="mb-6 text-sm">Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.</div>
                                        <table className="w-full border-collapse border border-black text-[10px] mb-8">
                                            <thead>
                                                <tr className="bg-slate-100 font-bold border-b border-black">
                                                    <th className="border-r border-black p-1">Product</th>
                                                    <th className="border-r border-black p-1">Model</th>
                                                    <th className="border-r border-black p-1">Features</th>
                                                    <th className="border-r border-black p-1">Qty</th>
                                                    <th className="border-r border-black p-1">Rate</th>
                                                    <th className="border-r border-black p-1">GST%</th>
                                                    <th className="border-r border-black p-1">GST Amt</th>
                                                    <th className="p-1">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(quote.items || []).map(it => { 
                                                    const rowGst = (it.unitPrice * it.quantity) * (it.taxRate / 100); 
                                                    const rowTotal = (it.unitPrice * it.quantity) + rowGst; 
                                                    return (
                                                        <tr key={it.id} className="border-b border-black text-center align-top">
                                                            <td className="border-r border-black p-1 text-left font-bold">{it.description}</td>
                                                            <td className="border-r border-black p-1">{it.model}</td>
                                                            <td className="border-r border-black p-1 text-left whitespace-pre-wrap">{it.features}</td>
                                                            <td className="border-r border-black p-1 font-bold">{it.quantity} {it.unit}</td>
                                                            <td className="border-r border-black p-1 text-right">Rs.{it.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            <td className="border-r border-black p-1">{it.taxRate}%</td>
                                                            <td className="border-r border-black p-1 text-right">Rs.{rowGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            <td className="p-1 text-right font-bold">
                                                                <div>Rs.{rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                <div className="text-[8px] font-normal italic">{numberToWords(rowTotal)}</div>
                                                            </td>
                                                        </tr>
                                                    ); 
                                                })}
                                            </tbody>
                                        </table>
                                        <div className="flex flex-col items-end text-xs font-bold mb-10 space-y-1">
                                            <div className="w-[200px] flex justify-between border-b border-slate-300 py-1"><span>Gross Total:</span><span>Rs.{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                            <div className="w-[200px] flex justify-between border-b border-slate-300 py-1 text-medical-600"><span>Freight:</span><span>Rs.{(totals.freight + totals.freightGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                            <div className="w-[200px] flex justify-between border-b border-slate-300 py-1 text-teal-600"><span>Total GST:</span><span>Rs.{totals.itemGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                            <div className="w-[200px] flex justify-between border-b border-slate-300 py-1 text-rose-500"><span>Discount:</span><span>(-) Rs.{(quote.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                            {quote.isRoundOff && totals.roundOff !== 0 && (
                                                <div className="w-[200px] flex justify-between border-b border-slate-300 py-1 text-slate-600">
                                                    <span>Round Off:</span>
                                                    <span>{totals.roundOff > 0 ? '(+) ' : '(-) '}Rs.{Math.abs(totals.roundOff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            <div className="w-[250px] flex justify-between pt-3 text-lg border-t-2 border-black"><span>Grand Total:</span><span>Rs.{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                        </div>
                                        <div className="text-sm space-y-2 mb-10">
                                            <h4 className="font-bold underline text-base">Terms and condition:</h4>
                                            <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-1 text-xs">
                                                <span className="font-bold">Validity:</span><span>: The above price is valid up to 30 days from the date of submission of the Quotation.</span>
                                                <span className="font-bold">Taxes:</span><span>: GST is applicable to the price mentioned as per item-wise rates.</span>
                                                <span className="font-bold">Payment:</span><span>: {quote.paymentTerms}</span>
                                                <span className="font-bold">Banking details:</span>
                                                <div className="pl-1">
                                                    : Bank name: {quote.selectedBank?.bankName || quote.sellerProfile?.bankName || 'ICICI Bank'}<br/>
                                                    Branch name: {quote.selectedBank?.branchIfsc || quote.sellerProfile?.branchIfsc || 'Selaiyur'}<br/>
                                                    A/C No: {quote.selectedBank?.accountNo || quote.sellerProfile?.accountNo || '603705016939'}
                                                </div>
                                                <span className="font-bold">Delivery:</span><span>: {quote.deliveryTerms}</span>
                                                <span className="font-bold">Warranty:</span><span>: {quote.warrantyTerms}</span>
                                            </div>
                                        </div>
                                        <div className="text-base mb-12">Thanking you and looking forward for your order.</div>
                                        <div className="flex justify-between items-end pb-6">
                                            <div className="flex flex-col items-start">
                                                <p className="text-base">With Regards,</p>
                                                <p className="text-base font-bold">For {quote.sellerProfile?.companyName || 'SREE MEDITEC'},</p>
                                                <div className="h-12 flex items-center gap-4">
                                                    {signature && <img src={signature} className="h-10 object-contain" />}
                                                    {seal && <img src={seal} className="h-16 w-16 object-contain opacity-80" />}
                                                </div>
                                                <p className="text-base font-bold mt-2">{repName}</p>
                                                <p className="text-base">{repPhone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-4 sm:p-8 overflow-hidden animate-in fade-in"><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4"><div><h3 className="font-black text-slate-800 uppercase tracking-widest text-lg">Product Registry</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select items to populate quote lines</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Filter index..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all uppercase" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value.toUpperCase())} /></div></div><div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{filteredCatalog.map(prod => (<div key={prod.id} className="p-5 sm:p-6 bg-slate-50 border border-slate-300 rounded-[1.5rem] sm:rounded-[2rem] hover:border-medical-400 hover:bg-white transition-all cursor-pointer flex flex-col justify-between group" onClick={() => { handleAddItem(prod); setBuilderTab('form'); }}><div className="flex-1"><h4 className="font-black text-slate-800 text-base group-hover:text-medical-700 transition-colors leading-tight">{prod.name}</h4><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">₹{(prod.sellingPrice || 0).toLocaleString('en-IN')} • {prod.sku}</p></div><div className="mt-4 flex justify-end"><div className="p-2 bg-white rounded-xl border border-slate-300 group-hover:bg-medical-600 group-hover:text-white transition-all shadow-sm"><Plus size={18} /></div></div></div>))}{filteredCatalog.length === 0 && (<div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400"><Search size={32} className="mb-2 opacity-20" /><p className="text-xs font-black uppercase">No matching products</p></div>)}</div></div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="client-list">{clients.map(c => <option key={c.id} value={c.name.toUpperCase()} />)}</datalist>
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name.toUpperCase()} />)}</datalist>
        </div>
    );
};
