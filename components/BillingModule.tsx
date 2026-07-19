import { ToggleSwitch } from './ToggleSwitch';
import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, InvoiceItem, TabView } from '../types';
import { 
    Plus, Download, Search, Trash2, 
    Save, Edit, Eye, List as ListIcon, PenTool, 
    History, MoreVertical, XCircle, RotateCcw, Wallet,
    ChevronDown, ArrowUpRight, CheckCheck, Truck, MessageSquare, Mail, AlertTriangle
} from 'lucide-react';
import { useData } from './DataContext';
import { FilingFilterDropdown } from './FilingFilterDropdown';
import { PDFService } from '../services/PDFService';
import { jsPDF } from 'jspdf';
import { FiledStatusIndicator } from './FiledStatusIndicator';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const PaidAmountInput = ({ inv, onUpdate }: { inv: Invoice, onUpdate: (val: number, status: string) => void }) => {
    const [val, setVal] = useState<string>(String(inv.paidAmount ?? 0));

    useEffect(() => {
        setVal(String(inv.paidAmount ?? 0));
    }, [inv.paidAmount]);

    const handleApply = (inputVal: string) => {
        const numVal = Number(inputVal) || 0;
        const balance = (inv.grandTotal || 0) - numVal;
        const expectedStatus = (inv.status !== 'Draft' && inv.status !== 'Cancelled')
            ? (balance <= 0 ? 'Completed' : 'Pending')
            : inv.status;
        onUpdate(numVal, expectedStatus);
    };

    return (
        <input 
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => handleApply(val)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    handleApply(val);
                    e.currentTarget.blur();
                }
            }}
            className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-right outline-none focus:border-emerald-500 focus:bg-white transition-all"
        />
    );
};

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
    return result ? result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' Only' : '';
};

const calculateDetailedTotals = (invoice: Partial<Invoice>) => {
    const items = invoice.items || [];
    const freight = Number(invoice.freightAmount) || 0;
    const freightTax = (freight * (Number(invoice.freightTaxRate) || 0)) / 100;
    
    const itemsTaxable = items.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)), 0);
    const itemsTax = items.reduce((sum, p) => sum + (((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0)) * ((Number(p.taxRate) || 0) / 100)), 0);
    
    const taxableValue = itemsTaxable + freight;
    const taxTotal = itemsTax + freightTax;
    
    const cgst = taxTotal / 2;
    const sgst = taxTotal / 2;
    const totalQty = items.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const discount = Number(invoice.discount) || 0;
    const grandTotalRaw = taxableValue + taxTotal - discount;
    const freightTotal = freight + freightTax;
    
    let roundOff = 0;
    let grandTotal = grandTotalRaw;
    if (invoice.isRoundOff) {
        grandTotal = Math.round(grandTotalRaw);
        roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    }
    
    return { taxableValue, taxTotal, cgst, sgst, grandTotal, grandTotalRaw, totalQty, freight, freightTax, itemsTax, freightTotal, roundOff, discount };
};

import { AutoSuggest } from './AutoSuggest';

export const BillingModule: React.FC<{ variant?: 'billing' | 'quotes' }> = ({ variant = 'billing' }) => {
    const { clients, products, invoices, employees, addInvoice, updateInvoice, removeInvoice, updateProduct, recordStockMovement, addNotification, currentUser, addLog, searchRecords, fetchMoreData, financialYear, companyProfiles, isSystemAdmin, bankDetailsList = [], setPendingChallanData, setActiveTab, showConfirm, previewPDF, showAlert, showPrompt, pendingInvoiceData, setPendingInvoiceData } = useData();

    const handleWhatsAppSend = async (inv: Invoice) => {
        const clientObj = clients.find(c => c.name === inv.customerName);
        const phoneRaw = (inv.phone || clientObj?.phone || '').split(/[,/]/)[0] || '';
        let prefilledPhone = phoneRaw.replace(/\D/g, '');
        if (prefilledPhone && !prefilledPhone.startsWith('91') && prefilledPhone.length === 10) {
            prefilledPhone = '91' + prefilledPhone;
        }
        const result = await showPrompt('Confirm WhatsApp recipient number (with country code e.g. 919876543210):', prefilledPhone);
        if (!result) return;
        let phone = result.replace(/\D/g, '');
        if (!phone.startsWith('91') && phone.length === 10) {
            phone = '91' + phone;
        }
        const docName = inv.documentType === 'Quotation' ? 'Quotation' : 'Invoice';
        const message = `Hello, here are the details for your ${docName} *#${inv.invoiceNumber}*:\nDate: ${formatDateDDMMYYYY(inv.date)}\nTotal Amount: *₹${(inv.grandTotal || 0).toLocaleString('en-IN')}*\nThank you for doing business with us!\n- Sree Meditec`;
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
        const docName = inv.documentType === 'Quotation' ? 'Quotation' : 'Invoice';
        const subject = `${docName} ${inv.invoiceNumber} - Sree Meditec`;
        const recipientName = inv.customerHospital || inv.customerName || 'Valued Customer';
        
        const body = `Dear ${recipientName},

I hope this email finds you well.

Please find attached the official ${docName.toLowerCase()} from Sree Meditec for your reference.

Document Summary:
• Document Type: ${docName}
• Document No: ${inv.invoiceNumber}
• Date: ${formatDateDDMMYYYY(inv.date)}
• Total Amount: INR ${(inv.grandTotal || 0).toLocaleString('en-IN')} (inclusive of applicable taxes)

Please review the attached PDF for a detailed itemization of the products/services, terms, and payment options. 

Should you have any questions or require further clarification, please feel free to reach out to us.

We sincerely appreciate your business and look forward to our continued collaboration.

Warm regards,

Sree Meditec
Mob: +91 9884818398 / 7200025642
Email: sreemeditec@gmail.com`;
        
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank');
    };

    const handleDelete = async (id: string, num: string) => {
        const confirmed = await showConfirm(`Are you sure you want to PERMANENTLY delete document ${num}? This action cannot be undone.`);
        if (!confirmed) return;
        try {
            await removeInvoice(id);
            addNotification('Document Deleted', `${num} has been removed.`, 'success');
        } catch (err) {
            addNotification('Error', 'Failed to delete document.', 'alert');
        }
    };
    const [viewState, setViewState] = useState<'history' | 'builder'>('history');
    const [builderTab, setBuilderTab] = useState<'form' | 'preview' | 'catalog'>('form');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filingFilter, setFilingFilter] = useState<'All' | 'Filed' | 'Not Filed' | 'Not Updated'>('All');
    const [serverInvoices, setServerInvoices] = useState<Invoice[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showOverdueOnly, setShowOverdueOnly] = useState(false);

    const isBillingAdmin = isSystemAdmin || currentUser?.permissions?.[TabView.BILLING] === 'Admin';

    const overdueInvoices = useMemo(() => {
        if (!isBillingAdmin) return [];
        const today = new Date();
        return invoices.filter(inv => {
            if ((inv.documentType && inv.documentType !== 'Invoice') || !inv.invoiceNumber?.startsWith('SM/')) return false;
            if (inv.status === 'Paid' || inv.status === 'Completed' || inv.status === 'Cancelled') return false;
            if (!inv.date) return false;
            
            // Re-check calculated status
            const balance = (inv.grandTotal || 0) - (inv.paidAmount || 0);
            if (balance <= 0) return false;

            const invDate = new Date(inv.date);
            const diffTime = today.getTime() - invDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays > 35;
        });
    }, [invoices, isBillingAdmin]);

    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'Pending',
        customerName: '',
        customerAddress: '',
        customerGstin: '',
        smcpoNumber: 'verbal',
        buyerName: '',
        buyerAddress: '',
        buyerGstin: '',
        deliveryTime: 'Immediately',
        specialNote: 'Chennai',
        dispatchedThrough: 'Person',
        documentType: 'Invoice',
        paidAmount: 0,
        isRoundOff: false
    });

    useEffect(() => {
        if (pendingInvoiceData) {
            setInvoice(prev => ({
                ...prev,
                customerName: pendingInvoiceData.customerName || '',
                customerHospital: pendingInvoiceData.customerHospital || '',
                customerGstin: pendingInvoiceData.customerGstin || '',
                customerAddress: pendingInvoiceData.customerAddress || '',
                // Bug 18: Also copy buyerName/buyerAddress/buyerGstin for correct GST invoicing
                buyerName: pendingInvoiceData.buyerName || pendingInvoiceData.customerName || '',
                buyerAddress: pendingInvoiceData.buyerAddress || pendingInvoiceData.customerAddress || '',
                buyerGstin: pendingInvoiceData.buyerGstin || pendingInvoiceData.customerGstin || '',
                phone: pendingInvoiceData.phone || '',
                email: pendingInvoiceData.email || '',
                contactPerson: pendingInvoiceData.contactPerson || '',
                items: (pendingInvoiceData.items || []).map(item => ({
                    ...item,
                    productId: undefined,
                    sku: undefined,
                    barcode: undefined
                })),
                discount: pendingInvoiceData.discount || 0,
                freight: pendingInvoiceData.freight || 0,
                freightAmount: pendingInvoiceData.freightAmount || 0,
                freightTaxRate: pendingInvoiceData.freightTaxRate || 0,
                isRoundOff: pendingInvoiceData.isRoundOff || false,
                remarks: pendingInvoiceData.remarks || '',
                subject: pendingInvoiceData.subject || '',
                selectedBank: pendingInvoiceData.selectedBank || prev.selectedBank,
                refQuotationNo: pendingInvoiceData.refQuotationNo || '',
                refQuotationId: pendingInvoiceData.refQuotationId || ''
            }));
            setEditingId(null);
            setViewState('builder');
            setBuilderTab('form');
            setPendingInvoiceData(null);
        }
    }, [pendingInvoiceData]);

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !invoice.invoiceNumber) {
            const currentYearInvoices = invoices.filter(i => i.invoiceNumber && i.invoiceNumber.includes(`/${financialYear}/`));
            const maxNum = currentYearInvoices.reduce((max, i) => {
                const parts = i.invoiceNumber.split('/');
                const num = parseInt(parts[parts.length - 1], 10);
                return isNaN(num) ? max : Math.max(max, num);
            }, 0);
            // Bug 8: Also check localStorage for the max number seen in this session.
            // This prevents two simultaneous users from generating the same number
            // before either has synced with Firestore.
            const lsKey = `crm-inv-max-${financialYear}`;
            const lsMax = parseInt(localStorage.getItem(lsKey) || '0', 10);
            const nextNum = Math.max(maxNum, lsMax) + 1;
            localStorage.setItem(lsKey, String(nextNum));
            setInvoice(prev => ({
                ...prev,
                invoiceNumber: `SM/${financialYear}/${String(nextNum).padStart(4, '0')}`
            }));
        }
    }, [viewState, editingId, invoices, financialYear, invoice.invoiceNumber]);

    useEffect(() => {
        if (viewState === 'builder' && !editingId && !invoice.selectedBank && bankDetailsList && bankDetailsList.length > 0) {
            const defaultBank = bankDetailsList.find(b => b.isDefault);
            if (defaultBank) {
                setInvoice(prev => ({
                    ...prev,
                    selectedBank: defaultBank
                }));
            }
        }
    }, [viewState, editingId, bankDetailsList, invoice.selectedBank]);

    useEffect(() => {
        const handleGlobalClick = () => setActiveMenuId(null);
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    const handleDeepSearch = async () => {
        if (!searchQuery.trim()) {
            setServerInvoices([]);
            return;
        }
        setIsSearching(true);
        try {
            // First try searching by Invoice Number
            let results = await searchRecords<Invoice>("invoices", "invoiceNumber", searchQuery);
            // If nothing, try searching by Customer Name
            if (results.length === 0) {
                results = await searchRecords<Invoice>("invoices", "customerName", searchQuery);
            }
            setServerInvoices(results);
            if (results.length === 0) {
                addNotification('No Records', 'No matching invoices found in history.', 'info');
            }
        } catch (err) {
            console.error("Deep search failed:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const totals = useMemo(() => calculateDetailedTotals(invoice), [invoice]);

    const handleDownloadPDF = async (data: Partial<Invoice>) => {
        addLog('Billing', 'Downloaded PDF', `Exported document ${data.invoiceNumber || 'New'} as PDF`);
        try {
            const isQuotation = data.documentType === 'Quotation';
            const compiledTotals = calculateDetailedTotals(data);
            const fullInvoiceData: Partial<Invoice> = {
                ...data,
                subtotal: data.subtotal ?? compiledTotals.taxableValue,
                taxTotal: data.taxTotal ?? compiledTotals.taxTotal,
                grandTotal: data.grandTotal ?? compiledTotals.grandTotal,
                items: (data.items || []).map(item => {
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unitPrice) || 0;
                    const gst = Number(item.taxRate) || 0;
                    const taxableVal = qty * price;
                    const gstVal = taxableVal * (gst / 100);
                    return {
                        ...item,
                        quantity: qty,
                        unitPrice: price,
                        taxRate: gst,
                        amount: item.amount ?? taxableVal,
                        gstValue: item.gstValue ?? gstVal,
                        priceWithGst: item.priceWithGst ?? (price * (1 + gst / 100))
                    };
                })
            };
            const blob = await PDFService.generateInvoicePDF(fullInvoiceData, isQuotation, fullInvoiceData.selectedBank);
            previewPDF(blob, `${fullInvoiceData.invoiceNumber || 'Document'}.pdf`);
        } catch (err) {
            console.error("Failed to download PDF", err);
            await showAlert("Error generating PDF.", "Error");
        }
    };

    const handleSave = async (status: 'Draft' | 'Finalized') => {
        if (!invoice.customerName || !invoice.items?.length) {
            await showAlert("Please fill customer details and add at least one item.", "Validation Error");
            return;
        }

        const invTotals = calculateDetailedTotals(invoice);
        const finalData: Invoice = {
            ...invoice as Invoice,
            id: editingId || `INV-${Date.now()}`,
            items: (invoice.items || []).map(item => {
                const isConverted = !!invoice.refQuotationNo;
                return {
                    ...item,
                    quantity: Number(item.quantity) || 0,
                    unitPrice: Number(item.unitPrice) || 0,
                    taxRate: Number(item.taxRate) || 0,
                    amount: Number(item.amount) || 0,
                    gstValue: Number(item.gstValue) || 0,
                    priceWithGst: Number(item.priceWithGst) || 0,
                    productId: isConverted ? undefined : item.productId,
                    sku: isConverted ? undefined : item.sku,
                    barcode: isConverted ? undefined : item.barcode
                };
            }),
            freightAmount: Number(invoice.freightAmount) || 0,
            freightTaxRate: Number(invoice.freightTaxRate) || 0,
            subtotal: invTotals.taxableValue,
            taxTotal: invTotals.taxTotal,
            grandTotal: invTotals.grandTotal,
            status: status === 'Draft' ? 'Draft' : (invTotals.grandTotal - (Number(invoice.paidAmount) || 0) <= 0 ? 'Completed' : 'Pending'),
            documentType: variant === 'billing' ? 'Invoice' : 'Quotation',
            createdBy: currentUser?.name || 'System',
            refQuotationId: invoice.refQuotationId,
            refQuotationNo: invoice.refQuotationNo
        };

        try {
            if (editingId) {
                await updateInvoice(editingId, finalData);
            } else {
                await addInvoice(finalData);
            }

            setViewState('history');
            setEditingId(null);
            addNotification('Registry Updated', `Invoice ${finalData.invoiceNumber} archived.`, 'success');

            // Update source quotation status AFTER closing the form — in its own block
            // so any error here never prevents the form from closing
            if (!editingId && finalData.documentType === 'Invoice') {
                const refId = (finalData.refQuotationId || '') as string;
                const refNo = (finalData.refQuotationNo || '') as string;

                if (refId) {
                    // Direct Firestore update by document ID — most reliable
                    updateDoc(doc(db, 'invoices', refId), { status: 'Completed' })
                        .then(() => updateInvoice(refId, { status: 'Completed' }))
                        .catch(e => console.warn('Quotation status update failed:', e));
                } else if (refNo) {
                    // Fallback: lookup by invoice number
                    const sourceQuote = invoices.find(i =>
                        i.invoiceNumber &&
                        i.invoiceNumber.trim() === refNo.trim() &&
                        i.documentType === 'Quotation'
                    );
                    if (sourceQuote) {
                        updateDoc(doc(db, 'invoices', sourceQuote.id), { status: 'Completed' })
                            .then(() => updateInvoice(sourceQuote.id, { status: 'Completed' }))
                            .catch(e => console.warn('Quotation status update (fallback) failed:', e));
                    }
                }
            }

            return finalData;
        } catch (err: any) {
            console.error("Save error:", err);
            try {
                const parsed = JSON.parse(err.message);
                if (parsed.type === 'DUPLICATE_INVOICE') {
                    await showAlert(`Invoice #${parsed.invoiceNumber} already exists. Cannot create duplicate.`, "Duplicate Invoice");
                    return false;
                }
                if (parsed.type === 'INSUFFICIENT_STOCK') {
                    const productDetails = parsed.items.map((item: any) => 
                        `Insufficient Stock\n\nThe requested quantity exceeds the available inventory.\n\nProduct: ${item.name}\nAvailable Stock: ${item.available}\nRequested Quantity: ${item.requested}\n\nPlease reduce the quantity or replenish stock before creating the invoice.`
                    ).join('\n\n---\n\n');
                    await showAlert(
                        productDetails,
                        "Insufficient Stock"
                    );
                    return false;
                }
            } catch (e) {
                // Not a JSON or stock error
            }
            addNotification('Save Failed', 'Could not persist invoice.', 'alert');
            return false;
        }
    };

    const handleAddItem = (prod?: any, index?: number) => {
        const newItem: InvoiceItem = {
            id: `ITEM-${Date.now()}`,
            description: prod?.name || '',
            hsn: prod?.hsn || '',
            features: prod?.description || '',
            quantity: 1,
            unitPrice: prod?.sellingPrice || 0,
            taxRate: prod?.taxRate || 18,
            amount: prod?.sellingPrice || 0,
            gstValue: (prod?.sellingPrice || 0) * 0.18,
            priceWithGst: (prod?.sellingPrice || 0) * 1.18,
            productId: prod?.id,
            sku: prod?.sku || '',
            barcode: prod?.barcode || ''
        };
        setInvoice(prev => {
            const current = prev.items || [];
            const idx = index ?? current.length;
            return { ...prev, items: [...current.slice(0, idx), newItem, ...current.slice(idx)] };
        });
    };

    const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
        setInvoice(prev => {
            const updatedItems = (prev.items || []).map(item => {
                if (item.id === id) {
                    let finalVal = value;
                    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
                        // Allow typing decimals by only converting if it is a safe complete number strings
                        // we keep the raw string so user can type "10."
                        finalVal = value === '' ? '' : (isNaN(Number(value)) ? item[field] : value);
                    }
                    
                    const updated = { ...item, [field]: finalVal };
                    if (field === 'description') {
                        const masterProd = products.find(p => p.name.toUpperCase() === value.toUpperCase());
                        if (masterProd) {
                            updated.unitPrice = masterProd.sellingPrice;
                            updated.hsn = masterProd.hsn || '';
                            updated.features = masterProd.description || '';
                            updated.taxRate = masterProd.taxRate || 18;
                            updated.productId = masterProd.id;
                            updated.sku = masterProd.sku || '';
                            updated.barcode = masterProd.barcode || '';
                        } else {
                            updated.productId = undefined;
                            updated.sku = undefined;
                            updated.barcode = undefined;
                        }
                    }
                    // Calculations work with strings automatically in JS math
                    updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
                    updated.gstValue = updated.amount * ((Number(updated.taxRate) || 0) / 100);
                    updated.priceWithGst = updated.amount + updated.gstValue;
                    return updated;
                }
                return item;
            });
            return { ...prev, items: updatedItems };
        });
    };

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
                            <h2 className="text-lg xl:text-xl font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">Invoice Registry</h2>
                            <p className="text-emerald-100/80 text-[11px] md:text-xs font-semibold leading-relaxed">{invoices.filter(i => i.documentType === 'Invoice' || !i.documentType).length} Total Records</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 bg-gradient-to-r from-[#c5a059] to-[#e5c185] border border-[#d4af37]/40 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)] rounded-[1.5rem] px-5 py-2 w-full sm:w-auto shrink-0">
                        <div className="p-1.5 bg-amber-950/10 text-amber-950 rounded-full shadow-inner shrink-0">
                            <Wallet size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <p className="text-[8px] font-black text-amber-950/70 uppercase tracking-widest leading-none mb-1 truncate">Total Outstanding</p>
                            <p className="text-lg font-playfair font-bold tracking-tight text-amber-950 leading-none tabular-nums">
                                ₹{invoices
                                    .filter(i => (i.invoiceNumber || '').startsWith('SM/') && i.status === 'Pending')
                                    .reduce((sum, i) => sum + ((i.grandTotal || 0) - (i.paidAmount || 0)), 0)
                                    .toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overdue Notification Card */}
                {isBillingAdmin && overdueInvoices.length > 0 && viewState === 'history' && (
                    <div 
                        onClick={() => {
                            setSearchQuery('');
                            setServerInvoices([]);
                            setFilingFilter('All');
                            setShowOverdueOnly(prev => !prev);
                        }}
                        className={`relative z-10 flex items-center justify-between gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all border ${showOverdueOnly ? 'bg-rose-500/90 border-rose-400 shadow-lg shadow-rose-500/30' : 'bg-rose-950/40 border-rose-900/50 hover:bg-rose-900/40'} animate-in fade-in slide-in-from-top-2`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${showOverdueOnly ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400'}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className={`text-sm font-bold tracking-wide uppercase ${showOverdueOnly ? 'text-white' : 'text-rose-400'}`}>Aging Alert: 35+ Days Overdue</h3>
                                <p className={`text-[11px] font-semibold mt-0.5 ${showOverdueOnly ? 'text-white/80' : 'text-rose-200/60'}`}>
                                    {overdueInvoices.length} {overdueInvoices.length === 1 ? 'invoice requires' : 'invoices require'} immediate attention (Total: ₹{overdueInvoices.reduce((sum, i) => sum + ((i.grandTotal || 0) - (i.paidAmount || 0)), 0).toLocaleString('en-IN')})
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center shrink-0">
                            {showOverdueOnly ? (
                                <div className="text-[10px] font-black uppercase text-white bg-black/20 px-3 py-1.5 rounded-lg">Showing Overdue</div>
                            ) : (
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-300 bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/30 transition-colors">
                                    <span>View Pending</span>
                                    <ArrowUpRight size={14} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bottom Row: Actions & Search */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-4 relative z-10 w-full">
                    {/* Search & Filters */}
                    {viewState === 'history' && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto flex-1 group">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <FilingFilterDropdown value={filingFilter} onChange={setFilingFilter} />
                            </div>
                            <div className="relative w-full sm:max-w-xs xl:max-w-sm flex-1 flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-100/50">
                                        {isSearching ? <RotateCcw size={14} className="animate-spin" /> : <Search size={14} />}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Deep search in history..." 
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (!e.target.value) setServerInvoices([]);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                                        className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-2 pl-9 pr-10 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all shadow-inner"
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={handleDeepSearch}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-emerald-700 text-white p-1.5 rounded-full hover:bg-emerald-600 transition-colors shadow-sm"
                                        >
                                            <ArrowUpRight size={10} />
                                        </button>
                                    )}
                                </div>
                                {serverInvoices.length > 0 && (
                                    <button 
                                        onClick={() => {setSearchQuery(''); setServerInvoices([]);}} 
                                        className="text-[9px] font-black text-rose-200 uppercase hover:text-white px-2 transition-colors whitespace-nowrap self-center hidden sm:block"
                                    >
                                        Clear Results
                                    </button>
                                )}
                            </div>
                            {serverInvoices.length > 0 && (
                                <button 
                                    onClick={() => {setSearchQuery(''); setServerInvoices([]);}} 
                                    className="text-[9px] font-black text-rose-200 uppercase hover:text-white px-2 transition-colors whitespace-nowrap sm:hidden"
                                >
                                    Clear Results
                                </button>
                            )}
                        </div>
                    )}
                    <div className="bg-emerald-900/40 p-1.5 rounded-[2.5rem] border border-emerald-700/50 shadow-inner w-full sm:w-fit shrink-0 flex gap-1">
                        <button onClick={() => setViewState('history')} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${viewState === 'history' ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5)] scale-100' : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <History size={16} /> Registry
                        </button>
                        <button onClick={() => { setViewState('builder'); setEditingId(null); setInvoice({ date: new Date().toISOString().split('T')[0], items: [], status: 'Pending', smcpoNumber: 'verbal', deliveryTime: 'Immediately', specialNote: 'Chennai', paidAmount: 0 }); setBuilderTab('form'); }} className={`flex-1 sm:flex-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-[2rem] transition-all flex items-center justify-center gap-2 ${viewState === 'builder' ? 'bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 shadow-[0_10px_20px_-5px_rgba(197,160,89,0.5)] scale-100' : 'text-emerald-100/70 hover:text-white hover:bg-emerald-800/50 scale-95'}`}>
                            <PenTool size={16} /> New Invoice
                        </button>
                    </div>
                </div>
            </div>

            {viewState === 'history' ? (
                <div className="flex-1 bg-white rounded-none md:rounded-3xl border-0 md:border border-slate-300 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-3 md:p-4 border-b border-slate-300 bg-slate-50/30 flex justify-between items-center gap-3">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-[10px] w-full sm:w-auto shrink-0">Financial Archive</h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-50 sticky top-0 z-10 font-bold uppercase text-[8px] text-slate-500 border-b">
                                <tr>
                                    <th className="px-4 py-2 font-inter">Invoice / Date</th>
                                    <th className="px-4 py-2">Consignee</th>
                                    <th className="px-4 py-2 hidden md:table-cell">Author</th>
                                    <th className="px-4 py-2 text-right hidden sm:table-cell">Grand Total</th>
                                    <th className="px-4 py-2 text-center hidden sm:table-cell">Paid Amt</th>
                                    <th className="px-4 py-2 text-center hidden sm:table-cell">Closed By</th>
                                    <th className="px-4 py-2 text-right hidden sm:table-cell">Balance</th>
                                    <th className="px-4 py-2 text-center hidden sm:table-cell">Filed Status</th>
                                    <th className="px-4 py-2 text-center hidden sm:table-cell">Status</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(serverInvoices.length > 0 ? serverInvoices : invoices.filter(i => 
                                    (i.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (i.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (i.items || []).some(item => (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
                                ))
                                    .filter(i => (i.invoiceNumber || '').startsWith('SM/'))
                                    .filter(i => {
                                        if (showOverdueOnly) {
                                            return overdueInvoices.some(overdue => overdue.id === i.id);
                                        }
                                        if (filingFilter === 'All') return true;
                                        if (filingFilter === 'Not Updated') return !i.filedStatus || i.filedStatus === 'Not Updated';
                                        return i.filedStatus === filingFilter;
                                    })
                                    .sort((a, b) => (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '', undefined, { numeric: true }))
                                    .map(inv => (
                                    <tr key={inv.id} onClick={() => { setInvoice(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); }} className={`hover:bg-slate-50 transition-colors group cursor-pointer border-b border-slate-50 last:border-b-0 ${inv.status === 'Cancelled' ? 'bg-rose-50/50 text-rose-900 border-rose-100' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="font-black text-slate-800 font-inter tracking-widest">{inv.invoiceNumber}</div>
                                            <div className="text-slate-400 font-bold text-[10px] mt-0.5 leading-tight">{inv.date || '—'}</div>
                                        </td>
                                        <td className="px-4 py-2 font-bold text-slate-700 uppercase">{inv.customerName}</td>
                                        <td className="px-4 py-2 hidden md:table-cell">
                                            <div 
                                                title={inv.createdBy || 'System'}
                                                className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shadow-inner border border-slate-200 cursor-help"
                                            >
                                                {inv.createdBy?.charAt(0) || 'S'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-teal-700 hidden sm:table-cell">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <PaidAmountInput 
                                                     inv={inv} 
                                                     onUpdate={(val, status) => {
                                                         updateInvoice(inv.id, { paidAmount: val, status: status });
                                                         setServerInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, paidAmount: val, status: status } : i));
                                                     }} 
                                                 />
                                                <button 
                                                    onClick={() => {
                                                        const total = inv.grandTotal || 0;
                                                        if ((inv.paidAmount || 0) !== total) {
                                                            const expectedStatus = (inv.status !== 'Draft' && inv.status !== 'Cancelled') ? 'Completed' : inv.status;
                                                            updateInvoice(inv.id, { paidAmount: total, status: expectedStatus });
                                                            setServerInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, paidAmount: total, status: expectedStatus } : i));
                                                            addNotification('Updated', `Paid amount for ${inv.invoiceNumber} set to full amount ₹${total}`, 'success');
                                                        }
                                                    }}
                                                    title="Copy Grand Total"
                                                    className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 scale-95 rounded-lg transition-all"
                                                >
                                                    <CheckCheck size={12} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 hidden sm:table-cell">
                                            {inv.closedBy ? (
                                                <div 
                                                    title={employees?.find(e => e.id === inv.closedBy)?.name || inv.closedBy || 'Unknown'}
                                                    className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-black uppercase text-indigo-600 shadow-inner border border-indigo-200 cursor-help mx-auto"
                                                >
                                                    {(employees?.find(e => e.id === inv.closedBy)?.name || inv.closedBy || '?').charAt(0).toUpperCase()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-center block">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right font-black text-rose-600 hidden sm:table-cell">₹{(Number(inv.grandTotal || 0) - Number(inv.paidAmount || 0)).toLocaleString('en-IN')}</td>
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
                                        <td className="px-4 py-2 text-center hidden sm:table-cell">
                                            {(() => {
                                                const displayStatus = (inv.status !== 'Draft' && inv.status !== 'Cancelled')
                                                    ? (((inv.grandTotal || 0) - (inv.paidAmount || 0) <= 0) ? 'Completed' : 'Pending')
                                                    : (inv.status || 'Pending');
                                                return (
                                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                        (displayStatus === 'Paid' || displayStatus === 'Completed') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                        displayStatus === 'Cancelled' ? 'bg-rose-100 text-rose-700 border-rose-200' : 
                                                        displayStatus === 'Draft' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                        'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                                        {displayStatus}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className={`relative flex justify-end ${activeMenuId === inv.id ? 'z-50' : 'z-0'}`}>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setActiveMenuId(activeMenuId === inv.id ? null : inv.id); 
                                                    }} 
                                                    className={`p-2 rounded-[2rem] transition-all ${activeMenuId === inv.id ? 'bg-medical-50 text-medical-600' : 'text-slate-300 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                
                                                {activeMenuId === inv.id && (
                                                    <div className="absolute right-0 top-12 bg-white border border-slate-300 shadow-2xl rounded-[2rem] p-1 z-50 flex gap-1 animate-in fade-in slide-in-from-top-2 min-w-[100px]">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setInvoice(inv); setEditingId(inv.id); setViewState('builder'); setBuilderTab('form'); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                            title="Edit Invoice"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDownloadPDF(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                            title="Download PDF"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleWhatsAppSend(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                            title="Send on WhatsApp"
                                                        >
                                                            <MessageSquare size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleEmailSend(inv); setActiveMenuId(null); }} 
                                                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                            title="Send via Email"
                                                        >
                                                            <Mail size={18} />
                                                        </button>
                                                        {variant === 'billing' && (
                                                             <button 
                                                                 onClick={(e) => { 
                                                                     e.stopPropagation(); 
                                                                     setPendingChallanData({
                                                                         customerName: inv.customerName,
                                                                         customerAddress: inv.customerAddress,
                                                                         invoiceId: inv.id,
                                                                         remarks: `Raised for Invoice ${inv.invoiceNumber}`,
                                                                         items: (inv.items || []).map(item => ({
                                                                             id: item.id || `DC-ITM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                                                             name: item.name,
                                                                             sku: item.sku || '',
                                                                             quantity: item.quantity,
                                                                             serialNo: item.serialNo || ''
                                                                         }))
                                                                     });
                                                                     setActiveTab(TabView.DELIVERY);
                                                                     setActiveMenuId(null); 
                                                                 }} 
                                                                 className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                                 title="Generate Delivery Challan"
                                                             >
                                                                 <Truck size={18} />
                                                             </button>
                                                         )}
                                                         {inv.status === 'Cancelled' ? (
                                                             <button 
                                                                 onClick={async (e) => { 
                                                                     e.stopPropagation(); 
                                                                     const confirmed = await showConfirm('Restore this invoice? it will be re-added to calculations.');
                                                                     if(confirmed) {
                                                                         const balance = (inv.grandTotal || 0) - (inv.paidAmount || 0);
                                                                         updateInvoice(inv.id, { status: balance <= 0 ? 'Completed' : 'Pending' });
                                                                     }
                                                                     setActiveMenuId(null); 
                                                                 }} 
                                                                 className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                                 title="Uncancel Invoice"
                                                             >
                                                                 <RotateCcw size={18} />
                                                             </button>
                                                         ) : (
                                                             <button 
                                                                 onClick={async (e) => { 
                                                                     e.stopPropagation(); 
                                                                     const confirmed = await showConfirm('Are you sure you want to cancel this invoice? It will be excluded from all calculations.');
                                                                     if(confirmed) {
                                                                         updateInvoice(inv.id, { status: 'Cancelled' });
                                                                     }
                                                                     setActiveMenuId(null); 
                                                                 }} 
                                                                 className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all flex-1 flex justify-center"
                                                                 title="Cancel Invoice"
                                                             >
                                                                 <XCircle size={18} />
                                                             </button>
                                                         )}
                                                        {isBillingAdmin && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(inv.id, inv.invoiceNumber || 'Document'); setActiveMenuId(null); }} 
                                                                className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-[2rem] transition-all"
                                                                title="Delete Document"
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
                        {serverInvoices.length === 0 && (
                            <div className="p-8 flex justify-center border-t border-slate-50 bg-slate-50/20">
                                <button 
                                    onClick={async () => {
                                        setIsLoadingMore(true);
                                        await fetchMoreData('invoices', 'date');
                                        setIsLoadingMore(false);
                                    }}
                                    disabled={isLoadingMore}
                                    className="px-8 py-3 bg-white border border-slate-300 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-medical-600 hover:border-medical-300 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {isLoadingMore ? <RotateCcw size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                                    Load Older Documents
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col bg-[#E8E3D7] rounded-[32px] border border-emerald-950/5 shadow-[0_25px_50px_-12px_rgba(15,32,23,0.12)] overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 px-4 py-2 shrink-0 flex items-center gap-2">
                        <button onClick={() => setBuilderTab('form')} className={`px-5 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${builderTab === 'form' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><PenTool size={16}/> Editor</button>
                        <button onClick={() => setBuilderTab('preview')} className={`px-5 py-2.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${builderTab === 'preview' ? 'bg-emerald-900 text-white shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' : 'text-slate-400 hover:text-emerald-700 scale-95'}`}><Eye size={16}/> Print Layout</button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {builderTab === 'form' && (
                            <div className="h-full flex flex-col bg-white">
                                <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 custom-scrollbar">
                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">1. Registry Metadata</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <FormRow label="Invoice No."><input type="text" className="w-full h-[46px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm font-inter font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all text-center" value={invoice.invoiceNumber || ''} onChange={e => setInvoice({...invoice, invoiceNumber: e.target.value})} /></FormRow>
                                        {invoice.refQuotationNo && (
                                            <FormRow label="Ref Quotation">
                                                <input type="text" className="w-full h-[46px] bg-slate-100 border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm font-inter font-black outline-none text-slate-500 text-center cursor-not-allowed" value={invoice.refQuotationNo} readOnly />
                                            </FormRow>
                                        )}
                                        <FormRow label="Dated"><input type="date" className="w-full h-[46px] bg-slate-50 border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm outline-none font-bold" value={invoice.date || ''} onChange={e => setInvoice({...invoice, date: e.target.value})} /></FormRow>
                                        <FormRow label="Buyer Order #">
                                            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm font-bold outline-none cursor-pointer appearance-none" value={invoice.smcpoNumber || ''} onChange={e => setInvoice({...invoice, smcpoNumber: e.target.value})}>
                                                <option value="Mail confirmation">Mail confirmation</option>
                                                <option value="Verbal">Verbal</option>
                                                <option value="PO">PO</option>
                                                <option value="Telephonic">Telephonic</option>
                                            </select>
                                        </FormRow>
                                        <FormRow label="Dispatch Mode">
                                            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm font-bold outline-none cursor-pointer appearance-none" value={invoice.dispatchedThrough || ''} onChange={e => setInvoice({...invoice, dispatchedThrough: e.target.value})}>
                                                <option value="Person">Person</option>
                                                <option value="Courier">Courier</option>
                                                <option value="Transport">Transport</option>
                                            </select>
                                        </FormRow>
                                        <FormRow label="Destination"><input type="text" className="w-full h-[46px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm font-bold" value={invoice.specialNote || ''} onChange={e => setInvoice({...invoice, specialNote: e.target.value})} /></FormRow>
                                        <FormRow label="Paid Amount">
                                             <div className="flex gap-1">
                                                 <input type="number" className="flex-1 h-[46px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-sm font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/5 transition-all text-center outline-none" value={invoice.paidAmount || 0} onChange={e => setInvoice({...invoice, paidAmount: Number(e.target.value)})} />
                                                 <button
                                                     type="button"
                                                     onClick={() => setInvoice({...invoice, paidAmount: Number(totals.grandTotal || 0)})}
                                                     title="Copy Grand Total"
                                                     className="px-3 h-[46px] bg-slate-50 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 rounded-[2rem] flex items-center justify-center transition-all shrink-0"
                                                 >
                                                     <CheckCheck size={16} />
                                                 </button>
                                             </div>
                                         </FormRow>
                                        <FormRow label="Seller Profile">
                                            <select className="w-full h-[46px] bg-white border border-medical-200 rounded-[2rem] px-3 py-1.5.5 text-xs font-black outline-none cursor-pointer focus:ring-4 focus:ring-medical-500/10 transition-all text-medical-700 appearance-none"
                                                value={invoice.sellerProfile?.id || ''}
                                                onChange={e => {
                                                    const selected = companyProfiles.find(p => p.id === e.target.value);
                                                    setInvoice({ ...invoice, sellerProfile: selected });
                                                }}
                                            >
                                                <option value="">Default (Sree Meditec)</option>
                                                {companyProfiles.map(profile => (
                                                    <option key={profile.id} value={profile.id}>{profile.companyName}</option>
                                                ))}
                                            </select>
                                        </FormRow>
                                        <FormRow label="Closed By">
                                            <select className="w-full h-[46px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-xs font-black outline-none cursor-pointer focus:ring-4 focus:ring-medical-500/10 transition-all text-slate-700 appearance-none"
                                                value={invoice.closedBy || ''}
                                                onChange={e => setInvoice({ ...invoice, closedBy: e.target.value })}
                                            >
                                                <option value="">-- Select Employee --</option>
                                                <option value="Direct">Direct</option>
                                                {(employees || []).filter(emp => emp.status === 'Active').map(emp => (
                                                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                                                ))}
                                            </select>
                                        </FormRow>
                                        <FormRow label="Incentive (%)">
                                            <input 
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                placeholder="0.0"
                                                className="w-full h-[46px] bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5.5 text-xs font-black outline-none focus:ring-4 focus:ring-medical-500/10 transition-all text-slate-700"
                                                value={invoice.incentivePercentage !== undefined ? invoice.incentivePercentage : ''}
                                                onChange={e => {
                                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                    setInvoice({ ...invoice, incentivePercentage: val });
                                                }}
                                            />
                                        </FormRow>
                                        <FormRow label="Select Bank">
                                            <select className="w-full h-[46px] bg-white border border-medical-200 rounded-[2rem] px-3 py-1.5.5 text-xs font-black outline-none cursor-pointer focus:ring-4 focus:ring-medical-500/10 transition-all text-medical-700 appearance-none"
                                                value={invoice.selectedBank?.id || ''}
                                                onChange={e => {
                                                    const selected = bankDetailsList.find(b => b.id === e.target.value);
                                                    setInvoice({ ...invoice, selectedBank: selected });
                                                }}
                                            >
                                                <option value="">Default Bank</option>
                                                {bankDetailsList.map(bank => (
                                                    <option key={bank.id} value={bank.id}>{bank.bankName} ({bank.accountNo})</option>
                                                ))}
                                            </select>
                                        </FormRow>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">2. Party Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">Consignee (Ship to)</h4>
                                                <div className="space-y-4">
                                                    <FormRow label="Consignee Name *">
                                                        <AutoSuggest
                                                            value={invoice.customerName || ''}
                                                            onChange={val => setInvoice(prev => ({ ...prev, customerName: val }))}
                                                            onSelect={client => {
                                                                setInvoice(prev => ({
                                                                    ...prev,
                                                                    customerName: client.name,
                                                                    customerAddress: client.address || prev.customerAddress,
                                                                    customerGstin: client.gstin ? client.gstin.toUpperCase() : prev.customerGstin,
                                                                    buyerName: prev.buyerName || client.name,
                                                                    buyerAddress: prev.buyerAddress || client.address,
                                                                    buyerGstin: prev.buyerGstin || (client.gstin ? client.gstin.toUpperCase() : '')
                                                                }));
                                                            }}
                                                            suggestions={clients}
                                                            filterKey="name"
                                                            className="w-full bg-white border border-slate-300 rounded-[2rem] px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                                                            placeholder="Search registry..."
                                                        />
                                                    </FormRow>
                                                    <FormRow label="Consignee GSTIN">
                                                        <input type="text" className="w-full bg-white border border-slate-300 rounded-[2rem] px-5 py-3 text-sm font-bold outline-none uppercase" value={invoice.customerGstin || ''} onChange={e => setInvoice({...invoice, customerGstin: e.target.value.toUpperCase()})} placeholder="33XXXXX" />
                                                    </FormRow>
                                                    <FormRow label="Site / Shipping Address">
                                                        <textarea rows={3} className="w-full bg-white border border-slate-300 rounded-[2rem] px-5 py-3 text-sm font-bold outline-none resize-none" value={invoice.customerAddress || ''} onChange={e => setInvoice({...invoice, customerAddress: e.target.value})} placeholder="Full shipping address..." />
                                                    </FormRow>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="p-6 bg-medical-50/10 rounded-[2rem] border border-medical-100">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-[9px] font-black text-medical-600 uppercase tracking-wider">Buyer (Bill to)</h4>
                                                    <button onClick={() => setInvoice(prev => ({ ...prev, buyerName: prev.customerName, buyerAddress: prev.customerAddress, buyerGstin: prev.customerGstin }))} className="text-[8px] font-bold text-medical-500 underline uppercase tracking-tighter">Copy Consignee</button>
                                                </div>
                                                <div className="space-y-4">
                                                    <FormRow label="Buyer Name">
                                                        <AutoSuggest
                                                            value={invoice.buyerName || ''}
                                                            onChange={val => setInvoice(prev => ({ ...prev, buyerName: val }))}
                                                            onSelect={client => {
                                                                setInvoice(prev => ({
                                                                    ...prev,
                                                                    buyerName: client.name,
                                                                    buyerAddress: client.address || prev.buyerAddress,
                                                                    buyerGstin: client.gstin ? client.gstin.toUpperCase() : prev.buyerGstin
                                                                }));
                                                            }}
                                                            suggestions={clients}
                                                            filterKey="name"
                                                            className="w-full bg-white border border-slate-300 rounded-[2rem] px-5 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-medical-500/5 transition-all"
                                                            placeholder="Billing Entity Name"
                                                        />
                                                    </FormRow>
                                                    <FormRow label="Buyer GSTIN">
                                                        <input type="text" className="w-full bg-white border border-slate-300 rounded-[2rem] px-5 py-3 text-sm font-bold outline-none uppercase" value={invoice.buyerGstin || ''} onChange={e => setInvoice({...invoice, buyerGstin: e.target.value.toUpperCase()})} placeholder="33XXXXX" />
                                                    </FormRow>
                                                    <FormRow label="Billing Address">
                                                        <textarea rows={3} className="w-full bg-white border border-slate-300 rounded-[2rem] px-5 py-3 text-sm font-bold outline-none resize-none" value={invoice.buyerAddress || ''} onChange={e => setInvoice({...invoice, buyerAddress: e.target.value})} placeholder="Full billing address..." />
                                                    </FormRow>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-2">
                                    <div className="border-b border-slate-300 pb-2">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">3. Manifest Items</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {(invoice.items?.length ?? 0) > 0 ? invoice.items.map((item, idx) => (
                                            <div key={item.id} className="group space-y-3">
                                                <div className="p-6 bg-slate-50 border border-slate-300 rounded-[1.5rem] relative hover:bg-white hover:border-medical-200 transition-all">
                                                    <button onClick={() => setInvoice({...invoice, items: invoice.items?.filter(i => i.id !== item.id)})} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-6">
                                                        <div className="col-span-2 sm:col-span-5">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Description</label>
                                                            <AutoSuggest
                                                                value={item.description || ''}
                                                                onChange={val => updateItem(item.id, 'description', val)}
                                                                onSelect={prod => {
                                                                    updateItem(item.id, 'description', prod.name);
                                                                    if (prod.hsn) updateItem(item.id, 'hsn', prod.hsn);
                                                                    if (prod.taxRate) updateItem(item.id, 'taxRate', prod.taxRate);
                                                                    if (prod.sellingPrice) updateItem(item.id, 'unitPrice', prod.sellingPrice);
                                                                    if (prod.features) updateItem(item.id, 'features', prod.features);
                                                                }}
                                                                suggestions={products}
                                                                filterKey="name"
                                                                className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black"
                                                                placeholder="Item Name"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 sm:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">HSN</label>
                                                            <input type="text" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-center" value={item.hsn || ''} onChange={e => updateItem(item.id, 'hsn', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1 sm:col-span-1">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">Qty</label>
                                                            <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-center" value={item.quantity || ''} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1 sm:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-right">Rate</label>
                                                            <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-right" value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-1 sm:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">GST %</label>
                                                            <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-center" value={item.taxRate || ''} onChange={e => updateItem(item.id, 'taxRate', e.target.value)} />
                                                        </div>
                                                        <div className="col-span-2 sm:col-span-12">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Features / Specifications</label>
                                                            <textarea rows={2} className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-[11px] font-bold outline-none resize-none" placeholder="Detailed specifications..." value={item.features || ''} onChange={e => updateItem(item.id, 'features', e.target.value)} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setBuilderTab('catalog')} className="text-[9px] font-black text-teal-600 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all uppercase tracking-widest">+ Store</button>
                                                        <button onClick={() => handleAddItem(undefined, idx + 1)} className="text-[9px] font-black text-medical-600 bg-medical-50 px-4 py-2 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all uppercase tracking-widest">+ Custom Row</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="flex gap-2">
                                                <button onClick={() => setBuilderTab('catalog')} className="text-[9px] font-black text-teal-600 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all uppercase tracking-widest">+ Store</button>
                                                <button onClick={() => handleAddItem()} className="text-[9px] font-black text-medical-600 bg-medical-50 px-4 py-2 rounded-lg border border-medical-100 hover:bg-medical-100 transition-all uppercase tracking-widest">+ Custom Row</button>
                                            </div>
                                        )}

                                        <div className="p-6 bg-medical-50/30 border border-medical-200 rounded-[1.5rem] mt-6 space-y-4">
                                            <div className="grid grid-cols-12 gap-6 items-center">
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className="text-[9px] font-black text-medical-600 uppercase block mb-1">Discount</label>
                                                    <p className="text-[10px] text-slate-400 font-bold italic">Flat discount applied to the total</p>
                                                </div>
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-right">Amount (₹)</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-right" value={invoice.discount ?? 0} onChange={e => setInvoice({...invoice, discount: e.target.value as any})} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-12 gap-6 items-center">
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className="text-[9px] font-black text-medical-600 uppercase block mb-1">Additional Charges (Freight / Packing)</label>
                                                    <p className="text-[10px] text-slate-400 font-bold italic">Leave 0 if not applicable</p>
                                                </div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-right">Amount (₹)</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-right" value={invoice.freightAmount ?? 0} onChange={e => setInvoice({...invoice, freightAmount: e.target.value as any})} />
                                                </div>
                                                <div className="col-span-6 md:col-span-3">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">GST %</label>
                                                    <input type="text" inputMode="decimal" className="w-full bg-white border border-slate-300 rounded-[2rem] px-3 py-1.5 text-xs font-black text-center" value={invoice.freightTaxRate ?? 0} onChange={e => setInvoice({...invoice, freightTaxRate: e.target.value as any})} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                                            <div className="flex flex-wrap gap-8">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal</p>
 <p className="text-lg font-bold tracking-tight">₹{totals.taxableValue.toLocaleString('en-IN')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Tax</p>
 <p className="text-lg font-bold tracking-tight text-emerald-400">₹{totals.taxTotal.toLocaleString('en-IN')}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col md:flex-row items-center gap-6">
                                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all cursor-pointer group" onClick={() => setInvoice(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))}>
                                                <ToggleSwitch checked={!!invoice.isRoundOff} onChange={() => setInvoice(prev => ({ ...prev, isRoundOff: !prev.isRoundOff }))} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">Round Off</span>
                                            </div>
                                                
                                                <div className="text-center md:text-right">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Grand Total</p>
                                                    <p className="text-3xl font-playfair font-bold tracking-tight text-white tracking-tighter flex items-baseline gap-2">
                                                        ₹{totals.grandTotal.toLocaleString('en-IN')}
                                                        {invoice.isRoundOff && totals.roundOff !== 0 && (
                                                            <span className={`text-[12px] font-bold ${totals.roundOff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                ({totals.roundOff > 0 ? '+' : ''}{totals.roundOff})
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4 p-6 md:px-12 md:py-8 shrink-0 bg-white border-t border-slate-200 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.05)] z-30 relative">
                                    <button onClick={() => setViewState('history')} className="w-full sm:flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200">Discard</button>
                                    <button onClick={() => handleSave('Draft')} className="w-full sm:flex-1 py-4 bg-white border-2 border-medical-500 text-medical-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-medical-50 transition-all">Save Draft</button>
                                    <button onClick={async () => {
                                        const saved = await handleSave('Finalized');
                                        if (saved) {
                                            await handleDownloadPDF(saved);
                                        }
                                    }} className="w-full sm:flex-[2] py-4 bg-medical-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-medical-700 shadow-xl shadow-medical-500/30 flex items-center justify-center gap-3 transition-all active:scale-95">
                                        <Save size={20} /> Finalize & PDF
                                    </button>
                                </div>
                            </div>
                        )}

                        {builderTab === 'preview' && (
                            <div className="h-full overflow-y-auto p-12 flex flex-col items-center custom-scrollbar bg-slate-100/50">
                                <div className="shadow-2xl h-fit transition-all duration-300 origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.65] lg:scale-[0.7] xl:scale-[0.8] 2xl:scale-[0.95]" style={{ width: '210mm' }}>
                                    <div className="bg-white p-[10mm] text-black w-full min-h-[297mm] flex flex-col border border-slate-300 mx-auto overflow-hidden text-[10px] leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
                                        <div className="flex justify-between items-center border-b border-black pb-1 mb-1 font-bold">
                                            <span className="uppercase text-xs tracking-tighter">Tax Invoice</span>
                                            <span className="italic text-[8px]">(ORIGINAL FOR RECIPIENT)</span>
                                        </div>
                                        <div className="grid grid-cols-[1.5fr_1fr] border border-black overflow-hidden">
                                            {/* LEFT COLUMN */}
                                            <div className="flex flex-col border-r border-black overflow-hidden">
                                                <div className="p-3 border-b border-black">
                                                    <h1 className="text-xl font-playfair font-bold tracking-tight text-black mb-1 leading-none uppercase">{invoice.sellerProfile?.companyName || 'SREE MEDITEC'}</h1>
                                                    <p className="text-[10px]">{invoice.sellerProfile?.address || 'Old No.2 New No.18, Bajanai Koil Street,'}</p>
                                                    {!invoice.sellerProfile && <p className="text-[10px]">Rajakilpakkam, Chennai -73</p>}
                                                    <p className="text-[10px]">Ph: {invoice.sellerProfile?.phone || '9884818398/ 7200025642'}</p>
                                                    <p className="font-bold mt-1 text-[10px]">GSTIN/UIN: {invoice.sellerProfile?.gstin || '33APGPS4675G2ZL'}</p>
                                                    <p className="text-[9px]">E-Mail : {invoice.sellerProfile?.email || 'sreemeditec@gmail.com'}</p>
                                                </div>
                                                <div className="p-2 border-b border-black min-h-[85px] flex flex-col text-[10px] leading-tight">
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Consignee (Ship to)</p>
                                                    <p className="font-bold uppercase mb-1">{invoice.customerName}</p>
                                                    <p className="whitespace-pre-wrap flex-1">{invoice.customerAddress}</p>
                                                    <div className="mt-2 pt-1 border-t border-slate-50">
                                                        <p className="font-bold">GSTIN/UIN &nbsp; : {invoice.customerGstin}</p>
                                                    </div>

                                                </div>
                                                <div className="p-2 flex flex-col text-[10px] leading-tight flex-1">
                                                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Buyer (Bill to)</p>
                                                    <p className="font-bold uppercase mb-1">{invoice.buyerName || invoice.customerName}</p>
                                                    <p className="whitespace-pre-wrap flex-1">{invoice.buyerAddress || invoice.customerAddress}</p>
                                                    <div className="mt-2 pt-1 border-t border-slate-50">
                                                        <p className="font-bold">GSTIN/UIN &nbsp; : {invoice.buyerGstin || invoice.customerGstin}</p>
                                                        <p>Place of Supply : Tamil Nadu</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN */}
                                            <div className="flex flex-col bg-slate-50/10">
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Invoice No.<br/><span className="font-bold text-[10px]"><span className="font-inter font-bold tracking-widest">{invoice.invoiceNumber}</span></span></div>
                                                     <div className="p-2 h-[45px]">Dated<br/><span className="font-bold text-[10px]">{formatDateDDMMYYYY(invoice.date)}</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Delivery Note<br/><span className="font-bold text-[9px]"></span></div>
                                                     <div className="p-2 h-[45px]">Mode/Terms of Payment<br/><span className="font-bold text-[9px]">{invoice.deliveryTime}</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Reference No. & Date.<br/><span className="font-bold text-[9px]"></span></div>
                                                     <div className="p-2 h-[45px]">Other References<br/><span className="font-bold text-[9px]"></span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Buyer's Order No.<br/><span className="font-bold text-[9px]">{invoice.smcpoNumber}</span></div>
                                                     <div className="p-1.5 h-[45px]">Dated<br/><span className="font-bold text-[9px]">{formatDateDDMMYYYY(invoice.date)}</span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Dispatch Doc No.<br/><span className="font-bold text-[9px]"></span></div>
                                                     <div className="p-2 h-[45px]">Delivery Note Date<br/><span className="font-bold text-[9px]"></span></div>
                                                </div>
                                                <div className="grid grid-cols-2 text-[8px] border-b border-black">
                                                     <div className="border-r border-black p-2 h-[45px]">Dispatched through<br/><span className="font-bold text-[9px]">{invoice.dispatchedThrough}</span></div>
                                                     <div className="p-2 h-[45px]">Destination<br/><span className="font-bold text-[9px]">{invoice.specialNote}</span></div>
                                                </div>

                                                <div className="p-2 flex-1 min-h-[45px] text-[8px] font-bold">Terms of Delivery</div>
                                            </div>
                                        </div>

                                        <table className="w-full border-x border-b border-black text-center text-[10px] mt-0 table-fixed">
                                            <thead className="bg-slate-50 font-bold border-b border-black">
                                                <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm]">
                                                    <th className="border-r border-black p-1 flex items-center justify-center">Sl No.</th>
                                                    <th className="border-r border-black p-1 text-left flex items-center">Description of Goods</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center">HSN/SAC</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center">GST Rate</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">Qty</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">Rate</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">per</th>
                                                    <th className="border-r border-black p-1 flex items-center justify-center font-black">Disc.%</th>
                                                    <th className="p-1 text-right flex items-center justify-end font-black pr-2">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(invoice.items || []).map((it, idx) => {
                                                    const base = (it.quantity || 0) * (it.unitPrice || 0);
                                                    return (
                                                        <tr key={`${idx}-m`} className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] border-b border-slate-300">
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center">{idx + 1}</td>
                                                            <td className="border-r border-black p-1.5 text-left flex flex-col justify-center overflow-hidden">
                                                                <span className="font-bold uppercase truncate text-[9px]">{it.description}</span>
                                                                {it.features && <span className="text-[7px] italic text-slate-500 whitespace-pre-wrap mt-0.5 leading-tight">{it.features}</span>}
                                                             </td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center text-[9px]">{it.hsn}</td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center text-[9px]">{it.taxRate}%</td>
                                                            <td className="border-r border-black p-1.5 text-center font-bold flex items-center justify-center text-[10px]">{(it.quantity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} nos</td>
                                                            <td className="border-r border-black p-1.5 text-right flex items-center justify-end text-[10px]">{(it.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center text-[9px]">nos</td>
                                                            <td className="border-r border-black p-1.5 flex items-center justify-center"></td>
                                                            <td className="p-1.5 text-right font-black flex items-center justify-end pr-2 text-[10px]">₹ {base.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    );
                                                })}
                                                 {(invoice.freightAmount || 0) > 0 && (
                                                    <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] h-5 italic border-b border-slate-50">
                                                        <td className="border-r border-black"></td>
                                                        <td className="border-r border-black p-1 text-left flex items-center">Freight</td>
                                                        <td className="border-r border-black"></td>
                                                        <td className="border-r border-black p-1 text-center flex items-center justify-center">{(invoice.freightTaxRate || 0)}%</td>
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                        <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.freightTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                 )}
                                                 {(invoice.discount || 0) > 0 && (
                                                    <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] h-5 italic border-b border-slate-50">
                                                        <td className="border-r border-black"></td>
                                                        <td className="border-r border-black p-1 text-left flex items-center font-bold text-rose-600">Discount</td>
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                        <td className="p-1 text-right flex items-center justify-end font-bold pr-2 text-rose-600">-{totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                 )}
                                                 <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] h-5 italic border-b border-slate-50">
                                                     <td className="border-r border-black"></td>
                                                     <td className="border-r border-black p-1 text-left flex items-center font-bold">Output CGST (9%)</td>
                                                     <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                     <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                 </tr>
                                                 <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] h-5 italic border-b border-slate-50">
                                                     <td className="border-r border-black"></td>
                                                     <td className="border-r border-black p-1 text-left flex items-center font-bold">Output SGST (9%)</td>
                                                     <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                     <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                 </tr>
                                                {invoice.isRoundOff && (
                                                    <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] h-5 italic border-b border-slate-50">
                                                        <td className="border-r border-black"></td>
                                                        <td className="border-r border-black p-1 text-left flex items-center font-bold">Round Off</td>
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                        <td className="p-1 text-right flex items-center justify-end font-bold pr-2">{totals.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}
                                                {Array.from({ length: Math.max(0, 8 - (invoice.items?.length || 0)) }).map((_, i) => (
                                                    <tr key={`f-${i}`} className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] h-6 border-b border-slate-50 opacity-10">
                                                        <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="grid grid-cols-[8mm_1fr_15mm_12mm_18mm_26mm_10mm_8mm_28mm] border-t border-black font-black bg-slate-50 text-[11px]">
                                                    <td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-1.5 text-right flex items-center justify-end font-bold">Total</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="border-r border-black p-1.5 text-center flex items-center justify-center font-black">{(totals.totalQty || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} nos</td>
                                                    <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                                    <td className="p-1.5 text-right flex items-center justify-end font-black text-teal-800 pr-2">Rs. {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="mt-4">
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-[10px]"><span className="font-bold">Amount Chargeable (in words) :</span> <span className="font-black uppercase">INR {numberToWords(totals.grandTotal)}</span></p>
                                                <p className="font-black text-[10px]">E. & O.E</p>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <table className="w-full border border-black text-[9px] table-fixed">
                                                <thead>
                                                    <tr className="border-b border-black font-bold">
                                                        <th rowSpan={2} className="border-r border-black p-1 align-middle text-center w-[20%]">HSN/SAC</th>
                                                        <th rowSpan={2} className="border-r border-black p-1 align-middle text-center w-[15%]">Taxable Value</th>
                                                        <th colSpan={2} className="border-r border-black p-1 text-center w-[25%]">CGST</th>
                                                        <th colSpan={2} className="border-r border-black p-1 text-center w-[25%]">SGST/UTGST</th>
                                                        <th rowSpan={2} className="p-1 align-middle text-center w-[15%]">Total Tax Amount</th>
                                                    </tr>
                                                    <tr className="border-b border-black font-bold">
                                                        <th className="border-r border-black p-1 text-center">Rate</th>
                                                        <th className="border-r border-black p-1 text-center">Amount</th>
                                                        <th className="border-r border-black p-1 text-center">Rate</th>
                                                        <th className="border-r border-black p-1 text-center">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-black">
                                                        <td className="border-r border-black p-1 text-center">9402</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="border-r border-black p-1 text-center">9%</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="border-r border-black p-1 text-center">9%</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="p-1 text-right">{(totals.cgst + totals.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                    <tr className="font-bold bg-slate-50/50">
                                                        <td className="border-r border-black p-1 text-right">Total</td>
                                                        <td className="border-r border-black p-1 text-right">{totals.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="border-r border-black p-1"></td>
                                                        <td className="border-r border-black p-1 text-right">{totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="border-r border-black p-1"></td>
                                                        <td className="border-r border-black p-1 text-right">{totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="p-1 text-right">{(totals.cgst + totals.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <p className="mt-2 text-[9px] font-bold">Tax Amount (in words) : INR {numberToWords(totals.cgst + totals.sgst)}</p>
                                        </div>

                                        <div className="mt-6 border border-black flex flex-col text-[9px]">
                                            <div className="grid grid-cols-2 p-2">
                                                <div className="space-y-1">
                                                    <p className="font-bold border-b border-black w-fit pb-0.5">Declaration</p>
                                                    <p className="leading-tight text-[8px]">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                                                </div>
                                                <div className="space-y-1 border-l border-black pl-4">
                                                    <p className="font-bold">Company's Bank Details</p>
                                                    <div className="grid grid-cols-[80px_1fr] text-[8px]">
                                                        <span>Bank Name</span><span className="font-bold">: {invoice.selectedBank?.bankName || (invoice.documentType === 'Quotation' ? 'ICICI Bank' : 'KVB Bank')}</span>
                                                        <span>A/c No.</span><span className="font-bold">: {invoice.selectedBank?.accountNo || (invoice.documentType === 'Quotation' ? '603705016939' : '1617135000000754')}</span>
                                                        <span>Branch & IFS Code</span><span className="font-bold">: {invoice.selectedBank ? (invoice.selectedBank.branchIfsc || `${invoice.selectedBank.accountType || ''}`) : (invoice.documentType === 'Quotation' ? 'Selaiyur & ICIC0006037' : 'Selaiyur & KVBL0001617')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 pt-20 border-t border-black p-2">
                                                <div className="flex flex-col justify-end pt-2 text-slate-400 font-bold">
                                                    <p className="text-[8px] uppercase">Customer's Seal and Signature</p>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="font-bold text-[10px]">for {invoice.sellerProfile?.companyName || 'SREE MEDITEC'}</p>
                                                    <div className="h-32"></div>
                                                    <p className="font-bold border-t border-black w-fit pt-1">Authorised Signatory</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-auto pt-4 text-center text-[8px] italic text-slate-500 w-full font-bold">This is a Computer Generated Invoice</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {builderTab === 'catalog' && (
                            <div className="h-full bg-white flex flex-col p-4 md:p-10 overflow-hidden animate-in fade-in">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tight text-xl">Product Registry</h3>
                                        <div className="relative w-full max-w-xs min-w-0">
                                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" placeholder="Filter index..." className="pl-12 pr-6 py-3 bg-slate-50 border border-slate-300 rounded-[2rem] text-sm font-bold outline-none focus:ring-4 focus:ring-medical-500/5 transition-all w-full" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                                        </div>
                                    </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {products.map(prod => (
                                        <div key={prod.id} className="p-6 bg-slate-50 border border-slate-300 rounded-[2rem] hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group shadow-sm hover:shadow-xl" onClick={() => { handleAddItem(prod); setBuilderTab('form'); }}>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-700 transition-colors truncate uppercase">{prod.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">₹{(prod.sellingPrice || 0).toLocaleString('en-IN')} • {prod.sku}</p>
                                            </div>
                                            <div className="ml-4 p-2.5 bg-white rounded-[2rem] border border-slate-300 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-md active:scale-90"><Plus size={20} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <datalist id="prod-list">{products.map((p, idx) => <option key={idx} value={p.name} />)}</datalist>
        </div>
    );
};

const FormRow = ({ label, children }: { label: string, children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[14px]">{label}</label>
        {children}
    </div>
);
