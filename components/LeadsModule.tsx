import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, FollowUp, TabView, Client, Invoice } from '../types';
import { 
    Phone, Plus, Wand2, RefreshCw, Box, ArrowUpRight, 
    Calendar, CheckSquare, X, FileText, Trash2, 
    Edit2, List, Search, MapPin, 
    User, Mail, Building2, DollarSign, Activity,
    Sparkles, Send, Download, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { generateEmailDraft } from '../geminiService';
import { useData } from './DataContext';
import { AutoSuggest } from './AutoSuggest';

const FormRow = ({ label, required = false, children }: { label: string; required?: boolean; children?: React.ReactNode }) => (
    <div className="flex flex-col gap-1 md:gap-1.5 w-full">
        <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 truncate whitespace-nowrap min-h-[12px] md:min-h-[14px]">
            {label} {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        {children}
    </div>
);

export const LeadsModule: React.FC<{ onNavigate?: (tab: TabView) => void }> = ({ onNavigate }) => {
    const { 
        leads, addLead, updateLead, removeLead, addNotification, 
        setPendingQuoteData, employees, addLog, searchRecords, 
        fetchMoreData, clients, products, invoices, addClient, showConfirm,
        currentUser, isSystemAdmin
    } = useData();

    const isLeadAdmin = isSystemAdmin || 
                        currentUser?.role === 'SYSTEM_ADMIN' || 
                        currentUser?.email === 'sreekumar.career@gmail.com' ||
                        currentUser?.permissions?.[TabView.LEADS] === 'Admin';

    const [viewState, setViewState] = useState<'stock' | 'builder' | 'today'>('stock');
    const [builderMode, setBuilderMode] = useState<'add' | 'edit'>('add');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [emailDraft, setEmailDraft] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'followup'>('details');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
    const [serverLeads, setServerLeads] = useState<Lead[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showAddFollowUp, setShowAddFollowUp] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newFollowUp, setNewFollowUp] = useState<Partial<FollowUp>>({ 
        type: 'Call', 
        date: new Date().toISOString().split('T')[0] 
    });

    const DEFAULT_LEAD: Partial<Lead> = {
        name: '',
        quotationId: '',
        quotationNo: '',
        hospital: '',
        address: '',
        source: 'Quotation',
        status: LeadStatus.QUOTED,
        lostReason: '',
        productInterest: '',
        salesTakenBy: currentUser?.name || '',
        salesTakenById: currentUser?.id || '',
        employeeId: currentUser?.id || '',
        phone: '',
        contactPerson: '',
        email: '',
        value: 0,
        followUps: []
    };

    const [lead, setLead] = useState<Partial<Lead>>(DEFAULT_LEAD);

    // ─── ELIGIBLE QUOTATIONS & AUTHORIZED CUSTOMERS ───
    const allQuotations = useMemo(() => {
        return (invoices || []).filter(i => 
            i.documentType === 'Quotation' || 
            (i.invoiceNumber && i.invoiceNumber.toUpperCase().startsWith('QT'))
        );
    }, [invoices]);

    // Helper function to check if a quotation is handled by a particular employee
    const isQuotationHandledBy = (q: Invoice, empId?: string, empName?: string) => {
        if (!empId && !empName) return false;
        const qEmpId = (q.handlingEmployee || '').trim().toLowerCase();
        const qEmpName = (q.handlingEmployeeName || '').trim().toLowerCase();
        const targetId = (empId || '').trim().toLowerCase();
        const targetName = (empName || '').trim().toLowerCase();

        return (targetId && qEmpId && qEmpId === targetId) ||
               (targetName && qEmpName && qEmpName === targetName) ||
               (targetName && qEmpId && qEmpId === targetName) ||
               (targetId && qEmpName && qEmpName === targetId);
    };

    // The particular employee handling the lead:
    // Non-admin: strictly currentUser.
    // Admin: whichever employee is selected in Handled By (defaults to currentUser).
    const activeHandlerId = !isLeadAdmin ? currentUser?.id : (lead.employeeId || currentUser?.id);
    const activeHandlerName = !isLeadAdmin ? currentUser?.name : (lead.salesTakenBy || currentUser?.name);

    // Authorized quotations strictly based on "handle by in quote" (author / createdBy is NOT used):
    const authorizedQuotations = useMemo(() => {
        if (isLeadAdmin && activeHandlerId === 'ALL') {
            return allQuotations;
        }
        return allQuotations.filter(q => isQuotationHandledBy(q, activeHandlerId, activeHandlerName));
    }, [allQuotations, isLeadAdmin, activeHandlerId, activeHandlerName]);

    // Customers associated with quotations handled by this particular employee:
    const authorizedCustomers = useMemo(() => {
        const clientMap = new Map<string, Client>();
        
        // 1. Add matching clients from master client registry
        const clientNamesSet = new Set(authorizedQuotations.map(q => (q.customerName || '').trim().toUpperCase()).filter(Boolean));
        const clientIdsSet = new Set(authorizedQuotations.map(q => q.customerId).filter(Boolean));
        
        clients.forEach(c => {
            if (clientIdsSet.has(c.id) || clientNamesSet.has(c.name.trim().toUpperCase())) {
                clientMap.set(c.name.trim().toUpperCase(), c);
            }
        });

        // 2. Also ensure every unique customer from authorizedQuotations is present in suggestions
        authorizedQuotations.forEach(q => {
            const rawName = (q.customerName || '').trim();
            if (!rawName) return;
            const upper = rawName.toUpperCase();
            if (!clientMap.has(upper)) {
                clientMap.set(upper, {
                    id: q.customerId || `CLT-${upper}`,
                    name: rawName,
                    hospital: q.customerHospital || '',
                    address: q.customerAddress || '',
                    phone: q.phone || '',
                    email: q.email || '',
                    contactPerson: q.contactPerson || rawName
                });
            }
        });

        return Array.from(clientMap.values());
    }, [clients, authorizedQuotations]);

    // Filter available quotations for the selected customer:
    const availableQuotations = useMemo(() => {
        if (!lead.name?.trim()) return [];
        const targetName = lead.name.trim().toUpperCase();
        return authorizedQuotations.filter(q => 
            (q.customerName || '').trim().toUpperCase() === targetName
        );
    }, [authorizedQuotations, lead.name]);

    // Duplicate hospital check (warning)
    const existingHospitalLead = useMemo(() => {
        if (!lead.hospital || !lead.hospital.trim()) return null;
        const target = lead.hospital.trim().toLowerCase();
        return leads.find(l => l.id !== lead.id && (l.hospital || '').trim().toLowerCase() === target) || null;
    }, [leads, lead.hospital, lead.id]);

    // Autocomplete Customer Selection Handler
    const handleSelectCustomer = (customerName: string) => {
        const trimmedName = customerName.trim();
        const client = authorizedCustomers.find(c => 
            c.name.trim().toUpperCase() === trimmedName.toUpperCase() ||
            (c.hospital && c.hospital.trim().toUpperCase() === trimmedName.toUpperCase())
        );

        if (client) {
            setLead(prev => ({
                ...prev,
                name: client.name.toUpperCase(),
                hospital: client.hospital || prev.hospital || '',
                phone: client.phone || prev.phone || '',
                email: client.email || prev.email || '',
                address: client.address || prev.address || '',
                contactPerson: client.contactPerson || client.name || prev.contactPerson || '',
                // Clear linked quotation if it belonged to another customer
                quotationId: '',
                quotationNo: '',
                productInterest: '',
                value: 0
            }));
        } else {
            setLead(prev => ({
                ...prev,
                name: customerName,
                quotationId: '',
                quotationNo: '',
                productInterest: '',
                value: 0
            }));
        }
    };

    // Quotation Selection Handler
    const handleSelectQuotation = (quotationId: string) => {
        const q = availableQuotations.find(quote => quote.id === quotationId);
        if (!q) {
            setLead(prev => ({
                ...prev,
                quotationId: '',
                quotationNo: ''
            }));
            return;
        }

        // Extract products summary from quotation line items
        const productSummary = q.subject || (q.items && q.items.length > 0
            ? q.items.map(it => it.description || it.model).filter(Boolean).join(', ')
            : '');

        setLead(prev => ({
            ...prev,
            quotationId: q.id,
            quotationNo: q.invoiceNumber || 'QUOTATION',
            value: q.grandTotal || 0,
            productInterest: productSummary || prev.productInterest || '',
            hospital: prev.hospital || q.customerHospital || '',
            address: prev.address || q.customerAddress || '',
            phone: prev.phone || q.phone || '',
            email: prev.email || q.email || '',
            contactPerson: prev.contactPerson || q.contactPerson || ''
        }));
    };

    const handleDeepSearch = async () => {
        if (!searchQuery.trim()) {
            setServerLeads([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchRecords<Lead>("leads", "name", searchQuery);
            setServerLeads(results);
            if (results.length === 0) {
                addNotification('No Results', 'No matching records found in database.', 'info');
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDraftEmail = async (targetLead: Lead) => {
        setEmailDraft('');
        setIsGenerating(true);
        const tone = targetLead.source === 'Amazon' || targetLead.source === 'Flipkart' ? "Transactional" : "Professional";
        const draft = await generateEmailDraft(targetLead.name, targetLead.productInterest, tone);
        setEmailDraft(draft);
        setIsGenerating(false);
    };

    const handleConvertLead = (targetLead: Lead) => {
        const quoteSeed = {
            customerName: targetLead.name,
            customerHospital: targetLead.hospital,
            customerAddress: targetLead.address || '',
            subject: targetLead.productInterest,
            phone: targetLead.phone,
            items: [{
                id: `ITEM-SEED-${Date.now()}`,
                description: targetLead.productInterest,
                quantity: 1,
                unit: 'no',
                unitPrice: targetLead.value || 0,
                taxRate: 12,
                amount: targetLead.value || 0,
                gstValue: (targetLead.value || 0) * 0.12,
                priceWithGst: (targetLead.value || 0) * 1.12,
                hsn: '',
                model: ''
            }]
        };
        setPendingQuoteData(quoteSeed);
        addNotification('Lead Conversion', `Lead data for ${targetLead.name} prepared for Quotation.`, 'success');
        if (onNavigate) onNavigate(TabView.QUOTES);
    };

    const handleAddFollowUp = async () => {
        if (!selectedLead || !newFollowUp.date || !newFollowUp.notes) return;
        const followUp: FollowUp = {
            id: `FU-${Date.now()}`,
            date: newFollowUp.date,
            type: newFollowUp.type as any,
            notes: newFollowUp.notes,
            status: 'Pending'
        };
        const updatedFollowUps = [...(selectedLead.followUps || []), followUp];
        await updateLead(selectedLead.id, { followUps: updatedFollowUps });
        setSelectedLead({ ...selectedLead, followUps: updatedFollowUps });
        setShowAddFollowUp(false);
        setNewFollowUp({ type: 'Call', date: new Date().toISOString().split('T')[0], notes: '' });
        addNotification('Task Logged', `Follow-up set for ${selectedLead.name}.`, 'info');
    };

    const toggleFollowUpStatus = async (leadId: string, fuId: string) => {
        const targetLead = leads.find(l => l.id === leadId);
        if (!targetLead) return;
        const updated = targetLead.followUps?.map(f => f.id === fuId ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } as FollowUp : f);
        await updateLead(leadId, { followUps: updated });
        if (selectedLead?.id === leadId) {
            setSelectedLead({ ...selectedLead, followUps: updated });
        }
    };

    // ─── VALIDATION & SAVE ───
    const handleSave = async () => {
        if (isSubmitting) return;

        // Field 1: Contact / Entity Name *
        if (!lead.name || !lead.name.trim()) {
            addNotification('Validation Error', 'Field 1: Contact / Entity Name is required.', 'alert');
            return;
        }

        // Field 2: Quote Number *
        if (!lead.quotationId || !lead.quotationNo) {
            addNotification('Validation Error', 'Field 2: Quote Number is mandatory. Please select an eligible quotation.', 'alert');
            return;
        }

        // Verify selected quotation exists and belongs to current authorized list
        const quoteObj = authorizedQuotations.find(q => q.id === lead.quotationId);
        if (!quoteObj) {
            addNotification('Authorization Error', 'The selected quotation is not authorized or does not exist.', 'alert');
            return;
        }

        // Field 3: Hospital / Organization *
        if (!lead.hospital || !lead.hospital.trim()) {
            addNotification('Validation Error', 'Field 3: Hospital / Organization is required.', 'alert');
            return;
        }

        // Field 4: Geographical Location / Address *
        if (!lead.address || !lead.address.trim()) {
            addNotification('Validation Error', 'Field 4: Geographical Location / Address is required.', 'alert');
            return;
        }

        // Field 5: Acquisition Source *
        if (!lead.source || !lead.source.trim()) {
            addNotification('Validation Error', 'Field 5: Acquisition Source is required.', 'alert');
            return;
        }

        // Field 6: Pipeline Status *
        if (!lead.status || !lead.status.trim()) {
            addNotification('Validation Error', 'Field 6: Pipeline Status is required.', 'alert');
            return;
        }

        // Lost Reason: Conditionally Mandatory
        if (lead.status === 'Lost' || lead.status === LeadStatus.LOST) {
            if (!lead.lostReason || !lead.lostReason.trim()) {
                addNotification('Validation Error', 'Lost Reason is mandatory when Pipeline Status is Lost.', 'alert');
                return;
            }
        }

        // Field 7: Product Interest / Requirement *
        if (!lead.productInterest || !lead.productInterest.trim()) {
            addNotification('Validation Error', 'Field 7: Product Interest / Requirement is required.', 'alert');
            return;
        }

        // Field 8: Handled By *
        const handledByName = isLeadAdmin ? (lead.salesTakenBy || currentUser?.name || '') : (currentUser?.name || '');
        const handledById = isLeadAdmin ? (lead.employeeId || currentUser?.id || '') : (currentUser?.id || '');
        if (!handledByName.trim()) {
            addNotification('Validation Error', 'Field 8: Handled By employee is required.', 'alert');
            return;
        }

        // Field 9: Mobile / WhatsApp *
        if (!lead.phone || !lead.phone.trim()) {
            addNotification('Validation Error', 'Field 9: Mobile / WhatsApp is required.', 'alert');
            return;
        }
        const cleanPhone = lead.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            addNotification('Validation Error', 'Field 9: Mobile / WhatsApp must contain at least 10 digits.', 'alert');
            return;
        }

        // Field 10: Primary Point of Contact *
        if (!lead.contactPerson || !lead.contactPerson.trim()) {
            addNotification('Validation Error', 'Field 10: Primary Point of Contact is required.', 'alert');
            return;
        }

        // Field 11: Email Address (Optional, validated only if provided)
        if (lead.email && lead.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(lead.email.trim())) {
                addNotification('Validation Error', 'Field 11: Please enter a valid email address.', 'alert');
                return;
            }
        }

        // Duplicate check for name/phone confirmation
        const isDuplicate = leads.some(l => 
            (l.id !== lead.id) && 
            ((lead.phone && l.phone === lead.phone) || 
             (lead.name && l.name.toLowerCase().trim() === lead.name.toLowerCase().trim()))
        );
        if (isDuplicate) {
            const confirmed = await showConfirm(`A lead with name "${lead.name}" or phone "${lead.phone}" already exists. Save anyway?`, "Duplicate Detected");
            if (!confirmed) return;
        }

        setIsSubmitting(true);
        try {
            if (builderMode === 'add') {
                const finalLead: Lead = {
                    ...lead as Lead,
                    id: `L-${Date.now()}`,
                    name: lead.name.trim().toUpperCase(),
                    hospital: lead.hospital.trim(),
                    address: lead.address.trim(),
                    source: lead.source,
                    status: lead.status as LeadStatus,
                    lostReason: (lead.status === 'Lost' || lead.status === LeadStatus.LOST) ? lead.lostReason?.trim() : undefined,
                    productInterest: lead.productInterest.trim(),
                    salesTakenBy: handledByName,
                    salesTakenById: handledById,
                    employeeId: handledById,
                    assignedTo: handledByName,
                    phone: lead.phone.trim(),
                    contactPerson: lead.contactPerson.trim(),
                    email: lead.email?.trim() || '',
                    quotationId: lead.quotationId,
                    quotationNo: lead.quotationNo,
                    value: lead.value || quoteObj.grandTotal || 0,
                    lastContact: new Date().toISOString().split('T')[0],
                    createdAt: new Date().toISOString(),
                    followUps: []
                };

                await addLead(finalLead);
                addNotification('Lead Registered', `Opportunity for ${finalLead.name} linked to Quotation ${finalLead.quotationNo} successfully created.`, 'success');
            } else {
                const updates: Partial<Lead> = {
                    ...lead,
                    name: lead.name?.trim().toUpperCase(),
                    hospital: lead.hospital?.trim(),
                    address: lead.address?.trim(),
                    productInterest: lead.productInterest?.trim(),
                    contactPerson: lead.contactPerson?.trim(),
                    phone: lead.phone?.trim(),
                    email: lead.email?.trim() || '',
                    lostReason: (lead.status === 'Lost' || lead.status === LeadStatus.LOST) ? lead.lostReason?.trim() : undefined
                };
                if (isLeadAdmin) {
                    updates.salesTakenBy = handledByName;
                    updates.salesTakenById = handledById;
                    updates.employeeId = handledById;
                }
                await updateLead(lead.id!, updates);
                addNotification('Lead Updated', `Lead profile for ${lead.name} updated.`, 'success');

                // Auto-convert to Client when status is Won
                if (updates.status === LeadStatus.WON || updates.status === 'Won') {
                    const alreadyExists = clients.find(c => c.name.toUpperCase() === (updates.name || '').toUpperCase());
                    if (!alreadyExists) {
                        const newClient = {
                            id: `CLT-${Date.now()}`,
                            name: updates.name || lead.name || '',
                            hospital: updates.hospital || lead.hospital || '',
                            address: updates.address || lead.address || '',
                            email: updates.email || lead.email || '',
                            phone: updates.phone || lead.phone || '',
                            contactPerson: updates.contactPerson || lead.contactPerson || ''
                        };
                        await addClient(newClient);
                        await addLog('Leads', 'Auto Client Convert', `Lead ${newClient.name} won — added to Client registry.`);
                        addNotification('🎉 Lead Won!', `${newClient.name} has been added as a Client automatically.`, 'success');
                    }
                }
            }

            setViewState('stock');
            setLead(DEFAULT_LEAD);
        } catch (err: any) {
            console.error("Save lead failed:", err);
            addNotification('Submission Failed', err.message || 'Failed to save lead', 'alert');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (targetLead: Lead) => {
        if (!isLeadAdmin) {
            addNotification('Access Denied', 'Only administrators can delete leads.', 'alert');
            return;
        }
        const confirmed = await showConfirm(`Delete lead "${targetLead.name}"?`);
        if (confirmed) {
            try {
                await removeLead(targetLead.id);
                addNotification('Lead Deleted', `${targetLead.name} removed from registry.`, 'warning');
                if (selectedLead?.id === targetLead.id) setSelectedLead(null);
            } catch (err: any) {
                addNotification('Error', err.message || 'Failed to delete lead.', 'alert');
            }
        }
    };

    const getNextFollowUp = (targetLead: Lead) => {
        if (!targetLead.followUps || targetLead.followUps.length === 0) return null;
        const pending = targetLead.followUps.filter(f => f.status === 'Pending').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return pending.length > 0 ? pending[0] : null;
    };

    const todayTouchpoints = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const list: { lead: Lead; followUp: FollowUp }[] = [];
        leads.forEach(l => {
            if (l.followUps) {
                l.followUps.forEach(fu => {
                    if (fu.date === todayStr) {
                        list.push({ lead: l, followUp: fu });
                    }
                });
            }
        });
        return list.sort((a, b) => {
            if (a.followUp.status === b.followUp.status) {
                return a.lead.name.localeCompare(b.lead.name);
            }
            return a.followUp.status === 'Pending' ? -1 : 1;
        });
    }, [leads]);

    // ─── PIPELINE FILTERING & SEARCH ───
    const filteredLeads = useMemo(() => {
        const source = serverLeads.length > 0 ? serverLeads : leads;
        const lowQuery = searchQuery.toLowerCase().trim();

        return source.filter(l => {
            // Text search
            const matchesQuery = !lowQuery || 
                (l.name || '').toLowerCase().includes(lowQuery) ||
                (l.hospital || '').toLowerCase().includes(lowQuery) ||
                (l.productInterest || '').toLowerCase().includes(lowQuery) ||
                (l.quotationNo || '').toLowerCase().includes(lowQuery) ||
                (l.phone || '').includes(lowQuery);

            if (!matchesQuery) return false;

            // Pipeline status filter
            if (statusFilter !== 'ALL') {
                const normStatus = (l.status || '').toLowerCase();
                const targetStatus = statusFilter.toLowerCase();
                if (targetStatus === 'quoted' && normStatus !== 'quoted' && normStatus !== 'new') return false;
                if (targetStatus === 'on progress' && normStatus !== 'on progress' && normStatus !== 'on process') return false;
                if (targetStatus === 'won' && normStatus !== 'won') return false;
                if (targetStatus === 'lost' && normStatus !== 'lost') return false;
            }

            // Employee filter (for admins)
            if (isLeadAdmin && employeeFilter !== 'ALL') {
                if (l.employeeId !== employeeFilter && l.salesTakenBy !== employeeFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [leads, serverLeads, searchQuery, statusFilter, employeeFilter, isLeadAdmin]);

    // Pipeline Analytics
    const pipelineStats = useMemo(() => {
        const source = leads;
        let totalVal = 0;
        let quoted = 0;
        let onProgress = 0;
        let won = 0;
        let lost = 0;

        source.forEach(l => {
            totalVal += l.value || 0;
            const st = (l.status || '').toLowerCase();
            if (st === 'quoted' || st === 'new') quoted++;
            else if (st === 'on progress' || st === 'on process') onProgress++;
            else if (st === 'won') won++;
            else if (st === 'lost') lost++;
        });

        return {
            totalCount: source.length,
            totalVal,
            quoted,
            onProgress,
            won,
            lost
        };
    }, [leads]);

    // Export CSV (Authorized leads only; Lost Reason protected)
    const handleExportCSV = () => {
        const headers = ["Lead ID", "Contact / Entity Name", "Hospital / Organization", "Quote Number", "Valuation", "Status", "Acquisition Source", "Handled By", "Phone", "Email", "Contact Person", "Date Added"];
        if (isLeadAdmin) {
            headers.push("Lost Reason");
        }

        const rows = filteredLeads.map(l => {
            const row = [
                `"${l.id}"`,
                `"${(l.name || '').replace(/"/g, '""')}"`,
                `"${(l.hospital || '').replace(/"/g, '""')}"`,
                `"${l.quotationNo || 'N/A'}"`,
                l.value || 0,
                `"${l.status}"`,
                `"${l.source || ''}"`,
                `"${(l.salesTakenBy || '').replace(/"/g, '""')}"`,
                `"${l.phone || ''}"`,
                `"${l.email || ''}"`,
                `"${(l.contactPerson || '').replace(/"/g, '""')}"`,
                `"${l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : l.lastContact || ''}"`
            ];
            if (isLeadAdmin) {
                row.push(`"${(l.lostReason || '').replace(/"/g, '""')}"`);
            }
            return row.join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Lead_CRM_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addNotification('Export Complete', 'Authorized leads exported to CSV.', 'success');
    };

    // Check if current user can view Lost Reason for selected lead
    const canViewLostReason = useMemo(() => {
        if (!selectedLead) return false;
        if (isLeadAdmin) return true;
        return selectedLead.employeeId === currentUser?.id ||
               selectedLead.salesTakenById === currentUser?.id ||
               selectedLead.salesTakenBy?.toLowerCase() === currentUser?.name?.toLowerCase();
    }, [selectedLead, isLeadAdmin, currentUser]);

    return (
        <div className="h-full flex flex-col gap-3 md:gap-4 overflow-hidden p-2">
            {/* Top Navigation Tabs */}
            <div className="bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit max-w-full overflow-x-auto shrink-0 flex gap-1">
                <button 
                    onClick={() => setViewState('stock')} 
                    className={`px-6 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all ${
                        viewState === 'stock' 
                            ? 'bg-emerald-900 text-emerald-100 shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' 
                            : 'text-slate-400 hover:text-emerald-700 scale-95'
                    }`}
                >
                    <List size={14} /> Pipeline
                </button>
                <button 
                    onClick={() => setViewState('today')} 
                    className={`px-6 py-2 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all ${
                        viewState === 'today' 
                            ? 'bg-emerald-900 text-emerald-100 shadow-[0_10px_20px_-5px_rgba(6,78,59,0.5)] scale-100' 
                            : 'text-slate-400 hover:text-emerald-700 scale-95'
                    }`}
                >
                    <Calendar size={14} /> Today's Touchpoints
                </button>
            </div>

            {/* ========================================================================= */}
            {/* VIEW 1: PIPELINE / LEAD REGISTRY */}
            {/* ========================================================================= */}
            {viewState === 'stock' && (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 animate-in fade-in">
                    <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 md:gap-4">
                        
                        {/* Unified Green Gradient Toolbar */}
                        <div className="bg-gradient-to-br from-emerald-950 to-green-900 p-3.5 md:p-4.5 flex flex-wrap 2xl:flex-nowrap justify-between items-center gap-3 shadow-[0_20px_40px_-10px_rgba(4,47,46,0.5)] border border-emerald-800/30 shrink-0 z-20 rounded-[2rem] md:rounded-3xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 xl:w-11 xl:h-11 flex items-center justify-center text-[#c5a059] drop-shadow-md shrink-0">
                                    <Activity size={22} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base xl:text-lg font-playfair font-bold tracking-tight text-white uppercase leading-none whitespace-nowrap">
                                            Lead CRM
                                        </h2>
                                        {isLeadAdmin ? (
                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                                                <ShieldCheck size={10} /> Admin View
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[8px] font-black uppercase tracking-wider">
                                                {currentUser?.name || 'My Pipeline'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-emerald-100/80 text-[10px] md:text-xs font-semibold leading-relaxed mt-0.5 truncate">
                                        {leads.length} Opportunities {isLeadAdmin ? 'Organization-Wide' : 'Authorized to You'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
                                <div className="relative flex-1 sm:flex-initial sm:w-52 md:w-60 min-w-[150px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-100/50" size={14} />
                                    <input 
                                        type="text" 
                                        placeholder="Search leads, quote..." 
                                        className="w-full bg-emerald-900/40 border border-emerald-700/50 text-white placeholder-emerald-100/50 rounded-[2rem] py-2 pl-9 pr-9 text-[11px] font-bold outline-none focus:border-emerald-400 focus:bg-emerald-900/60 transition-all uppercase placeholder:normal-case shadow-inner" 
                                        value={searchQuery} 
                                        onChange={(e) => { setSearchQuery(e.target.value); if(!e.target.value) setServerLeads([]); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleDeepSearch()}
                                    />
                                    <button 
                                        onClick={handleDeepSearch} 
                                        disabled={isSearching}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                                        title="Deep Search Database"
                                    >
                                        <ArrowUpRight size={12} className={isSearching ? 'animate-spin' : ''} />
                                    </button>
                                </div>

                                <button 
                                    onClick={handleExportCSV} 
                                    className="p-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/50 rounded-full transition-all flex items-center justify-center shrink-0"
                                    title="Export Leads CSV"
                                >
                                    <Download size={14} />
                                </button>

                                <button 
                                    onClick={() => { 
                                        setViewState('builder'); 
                                        setBuilderMode('add'); 
                                        setLead(DEFAULT_LEAD); 
                                    }} 
                                    className="bg-gradient-to-r from-[#c5a059] to-[#e5c185] text-amber-950 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.12em] shadow-md hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                                >
                                    <Plus size={14} /> New Lead
                                </button>
                            </div>
                        </div>

                        {/* Pipeline KPI Cards & Filter Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3 shrink-0">
                            <button 
                                onClick={() => setStatusFilter('ALL')}
                                className={`p-3 rounded-2xl border text-left transition-all ${
                                    statusFilter === 'ALL' 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Leads</div>
                                <div className="text-base font-black mt-0.5">{pipelineStats.totalCount}</div>
                                <div className="text-[10px] font-bold text-slate-400">₹{pipelineStats.totalVal.toLocaleString('en-IN')}</div>
                            </button>

                            <button 
                                onClick={() => setStatusFilter('Quoted')}
                                className={`p-3 rounded-2xl border text-left transition-all ${
                                    statusFilter === 'Quoted' 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                        : 'bg-blue-50/50 text-blue-900 border-blue-100 hover:border-blue-200'
                                }`}
                            >
                                <div className="text-[9px] font-black uppercase tracking-widest text-blue-400">Quoted</div>
                                <div className="text-base font-black mt-0.5">{pipelineStats.quoted}</div>
                                <div className="text-[10px] font-bold opacity-75">In Pipeline</div>
                            </button>

                            <button 
                                onClick={() => setStatusFilter('On Progress')}
                                className={`p-3 rounded-2xl border text-left transition-all ${
                                    statusFilter === 'On Progress' 
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-md' 
                                        : 'bg-amber-50/50 text-amber-900 border-amber-100 hover:border-amber-200'
                                }`}
                            >
                                <div className="text-[9px] font-black uppercase tracking-widest text-amber-500">On Progress</div>
                                <div className="text-base font-black mt-0.5">{pipelineStats.onProgress}</div>
                                <div className="text-[10px] font-bold opacity-75">Active Touch</div>
                            </button>

                            <button 
                                onClick={() => setStatusFilter('Won')}
                                className={`p-3 rounded-2xl border text-left transition-all ${
                                    statusFilter === 'Won' 
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                                        : 'bg-emerald-50/50 text-emerald-900 border-emerald-100 hover:border-emerald-200'
                                }`}
                            >
                                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Won</div>
                                <div className="text-base font-black mt-0.5">{pipelineStats.won}</div>
                                <div className="text-[10px] font-bold opacity-75">Converted</div>
                            </button>

                            <button 
                                onClick={() => setStatusFilter('Lost')}
                                className={`p-3 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 ${
                                    statusFilter === 'Lost' 
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                                        : 'bg-rose-50/50 text-rose-900 border-rose-100 hover:border-rose-200'
                                }`}
                            >
                                <div className="text-[9px] font-black uppercase tracking-widest text-rose-400">Lost</div>
                                <div className="text-base font-black mt-0.5">{pipelineStats.lost}</div>
                                <div className="text-[10px] font-bold opacity-75">With Reason</div>
                            </button>
                        </div>

                        {/* Administrator Employee Filter Toolbar */}
                        {isLeadAdmin && (
                            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-slate-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Filter by Employee:
                                    </span>
                                </div>
                                <select 
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-[10px] font-black uppercase outline-none focus:border-emerald-500"
                                    value={employeeFilter}
                                    onChange={(e) => setEmployeeFilter(e.target.value)}
                                >
                                    <option value="ALL">All Employees ({leads.length} Leads)</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name} ({leads.filter(l => l.employeeId === emp.id || l.salesTakenBy === emp.name).length})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Leads Data Table */}
                        <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-left text-[11px] hidden lg:table">
                                    <thead className="bg-slate-50 sticky top-0 z-10 font-black uppercase text-[9px] text-slate-500 border-b tracking-widest shadow-[0_1px_0_0_#f1f5f9]">
                                        <tr>
                                            <th className="px-6 py-4">Date of Entry</th>
                                            <th className="px-6 py-4">Opportunity & Customer</th>
                                            <th className="px-6 py-4">Quote Number</th>
                                            <th className="px-6 py-4">Handled By</th>
                                            <th className="px-6 py-4">Interest / Valuation</th>
                                            <th className="px-6 py-4">Next Action</th>
                                            <th className="px-6 py-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredLeads.map(l => (
                                            <tr 
                                                key={l.id} 
                                                className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                                                    selectedLead?.id === l.id ? 'bg-emerald-50/40' : ''
                                                }`} 
                                                onClick={() => setSelectedLead(l)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : l.lastContact || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-800 uppercase text-[12px] tracking-tight">
                                                        {l.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                        {l.hospital}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {l.quotationNo ? (
                                                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase tracking-tight">
                                                            {l.quotationNo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase">Legacy Lead</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-600">
                                                            {(l.salesTakenBy || 'E').charAt(0)}
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-700 uppercase">
                                                            {l.salesTakenBy || 'Unassigned'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700 truncate max-w-[200px]" title={l.productInterest}>
                                                        {l.productInterest}
                                                    </div>
                                                    <div className="text-emerald-600 font-black mt-0.5">
                                                        ₹{(l.value || 0).toLocaleString('en-IN')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getNextFollowUp(l) ? (
                                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 w-fit uppercase tracking-tight">
                                                            <Calendar size={11} /> {getNextFollowUp(l)?.type} {getNextFollowUp(l)?.date}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-black uppercase tracking-widest text-[9px]">Awaiting Task</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${
                                                        l.status === 'Won' 
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                                            : l.status === 'Lost'
                                                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                                                            : l.status === 'On Progress' || l.status === 'On process'
                                                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                                                            : 'bg-blue-50 border-blue-200 text-blue-600'
                                                    }`}>
                                                        {l.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredLeads.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-32 text-center text-slate-300 font-black uppercase tracking-[0.4em] opacity-40 italic">
                                                    No Leads Found in Pipeline
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Card View */}
                                <div className="lg:hidden flex flex-col divide-y divide-slate-100">
                                    {filteredLeads.map(l => (
                                        <div 
                                            key={l.id} 
                                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col gap-2.5 ${
                                                selectedLead?.id === l.id ? 'bg-emerald-50/40' : ''
                                            }`} 
                                            onClick={() => setSelectedLead(l)}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-black text-slate-800 uppercase text-[12px] tracking-tight truncate">
                                                        {l.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                                                        {l.hospital}
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border shrink-0 ${
                                                    l.status === 'Won' 
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                                        : l.status === 'Lost'
                                                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                                                        : 'bg-blue-50 border-blue-200 text-blue-600'
                                                }`}>
                                                    {l.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase tracking-wider block">Quote:</span>
                                                    <span className="font-black text-indigo-700">{l.quotationNo || 'Direct'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-bold uppercase tracking-wider block">Handled By:</span>
                                                    <span className="font-bold text-slate-700">{l.salesTakenBy || 'Unassigned'}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px]">
                                                <span className="text-emerald-600 font-black">
                                                    ₹{(l.value || 0).toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    {l.source}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredLeads.length === 0 && (
                                        <div className="py-20 text-center text-slate-300 font-black uppercase tracking-[0.3em] opacity-40 italic text-[10px]">
                                            No Leads Found in Pipeline
                                        </div>
                                    )}
                                </div>
                            </div>

                            {serverLeads.length === 0 && (
                                <div className="p-4 flex justify-center bg-slate-50/50 border-t border-slate-100">
                                    <button 
                                        onClick={async () => { 
                                            setIsLoadingMore(true); 
                                            await fetchMoreData('leads', 'lastContact'); 
                                            setIsLoadingMore(false); 
                                        }} 
                                        disabled={isLoadingMore} 
                                        className="px-8 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-700 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        {isLoadingMore ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />} 
                                        Load More
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* DETAILS DRAWER */}
                    {/* ========================================================================= */}
                    {selectedLead && (
                        <div className="w-full lg:w-[420px] bg-white rounded-[2rem] shadow-xl border border-slate-200 flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-4">
                            <div className="p-6 border-b border-slate-200 bg-slate-50/60 relative">
                                <button 
                                    onClick={() => setSelectedLead(null)} 
                                    className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-200"
                                >
                                    <X size={18}/>
                                </button>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md">
                                        {selectedLead.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 pr-4">
                                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight truncate leading-tight">
                                            {selectedLead.name}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                            {selectedLead.hospital}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex bg-slate-200/70 p-1 rounded-2xl">
                                    <button 
                                        onClick={() => setActiveTab('details')} 
                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                            activeTab === 'details' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'
                                        }`}
                                    >
                                        Intelligence
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('followup')} 
                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                            activeTab === 'followup' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'
                                        }`}
                                    >
                                        Touchpoints
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                                {activeTab === 'details' ? (
                                    <>
                                        {/* Status & Ownership Badges */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Pipeline Status</p>
                                                <p className="text-xs font-black text-slate-800 mt-0.5">{selectedLead.status}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Handled By</p>
                                                <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{selectedLead.salesTakenBy || 'Unassigned'}</p>
                                            </div>
                                        </div>

                                        {/* Linked Quotation Information */}
                                        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[8px] font-black text-indigo-500 uppercase tracking-wider">Linked Quotation</p>
                                                <p className="text-xs font-black text-indigo-900 mt-0.5">{selectedLead.quotationNo || 'Direct / None'}</p>
                                            </div>
                                            {selectedLead.quotationId && (
                                                <button 
                                                    onClick={() => onNavigate?.(TabView.QUOTES)}
                                                    className="px-2.5 py-1 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-indigo-50 shadow-sm"
                                                >
                                                    View Quote
                                                </button>
                                            )}
                                        </div>

                                        {/* Lost Reason Card (Strict RBAC: Only shown to Admin or Handling Employee) */}
                                        {(selectedLead.status === 'Lost' || selectedLead.status === LeadStatus.LOST) && (
                                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                                                <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                                                    <AlertTriangle size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-wider">Lost Reason</span>
                                                </div>
                                                {canViewLostReason ? (
                                                    <p className="text-xs font-bold text-rose-900 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-rose-200/60">
                                                        {selectedLead.lostReason || 'No specific explanation recorded.'}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-rose-500 italic">
                                                        Confidential: Restricted to lead owner and administrators.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Contact Matrix */}
                                        <section className="space-y-2">
                                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Building2 size={12} /> Contact Node
                                            </h4>
                                            <div className="grid grid-cols-1 gap-2 text-xs">
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                    <User size={14} className="text-slate-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Primary Contact</p>
                                                        <p className="font-bold text-slate-800 truncate">{selectedLead.contactPerson || 'NOT SPECIFIED'}</p>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                    <Phone size={14} className="text-slate-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Phone / WhatsApp</p>
                                                        <p className="font-black text-slate-800">{selectedLead.phone || 'NO DATA'}</p>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                    <Mail size={14} className="text-slate-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Email Address</p>
                                                        <p className="font-bold text-slate-800 lowercase truncate">{selectedLead.email || 'NOT SPECIFIED'}</p>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase">Geographical Location</p>
                                                        <p className="font-bold text-slate-800 leading-tight">{selectedLead.address || 'NO PHYSICAL DATA'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Requirement Forecast Card */}
                                        <section className="p-5 bg-gradient-to-br from-emerald-800 to-green-900 rounded-2xl text-white shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-6 opacity-10"><Box size={80} /></div>
                                            <p className="text-[9px] font-black text-emerald-200 uppercase tracking-widest mb-1">Quoted Requirement</p>
                                            <h4 className="text-sm font-black tracking-tight leading-snug">{selectedLead.productInterest}</h4>
                                            <div className="mt-4 flex items-center justify-between border-t border-emerald-700/50 pt-3">
                                                <div>
                                                    <span className="text-[8px] font-black text-emerald-200 uppercase block">Total Valuation</span>
                                                    <span className="text-lg font-black">₹{(selectedLead.value || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                                <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[9px] font-black uppercase">
                                                    {selectedLead.source}
                                                </span>
                                            </div>
                                        </section>

                                        {/* Action buttons */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button 
                                                onClick={() => handleDraftEmail(selectedLead)} 
                                                disabled={isGenerating} 
                                                className="py-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:border-emerald-300 transition-all text-[9px] font-black uppercase tracking-wider text-slate-600"
                                            >
                                                {isGenerating ? <RefreshCw size={14} className="animate-spin text-emerald-600" /> : <Sparkles size={14} className="text-emerald-600" />}
                                                Draft Pitch
                                            </button>
                                            <button 
                                                onClick={() => handleConvertLead(selectedLead)} 
                                                className="py-3 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 shadow-md hover:bg-black transition-all text-[9px] font-black uppercase tracking-wider"
                                            >
                                                <FileText size={14} className="text-emerald-400"/>
                                                Quotation
                                            </button>
                                        </div>

                                        {emailDraft && (
                                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in zoom-in-95">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Wand2 size={12}/> AI Pitch Draft
                                                    </span>
                                                    <button onClick={() => setEmailDraft('')} className="text-emerald-400 hover:text-emerald-600"><X size={14}/></button>
                                                </div>
                                                <pre className="whitespace-pre-wrap font-sans text-[10px] font-semibold text-emerald-950 leading-relaxed italic">{emailDraft}</pre>
                                                <button 
                                                    onClick={() => { 
                                                        navigator.clipboard.writeText(emailDraft); 
                                                        addNotification('Copied', 'Draft copied to clipboard.', 'success'); 
                                                    }} 
                                                    className="w-full mt-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm"
                                                >
                                                    Copy Pitch
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="space-y-5">
                                        <button 
                                            onClick={() => setShowAddFollowUp(!showAddFollowUp)} 
                                            className="w-full bg-slate-50 border border-slate-200 border-dashed py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-emerald-700 hover:border-emerald-300 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={14} /> Schedule Touchpoint
                                        </button>
                                        
                                        {showAddFollowUp && (
                                            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-lg space-y-3 animate-in slide-in-from-top-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormRow label="Channel">
                                                        <select 
                                                            className="w-full h-[36px] border border-slate-200 rounded-xl px-3 text-[10px] font-black uppercase" 
                                                            value={newFollowUp.type} 
                                                            onChange={e => setNewFollowUp({ ...newFollowUp, type: e.target.value as any })}
                                                        >
                                                            <option>Call</option>
                                                            <option>Meeting</option>
                                                            <option>WhatsApp</option>
                                                        </select>
                                                    </FormRow>
                                                    <FormRow label="Date">
                                                        <input 
                                                            type="date" 
                                                            className="w-full h-[36px] border border-slate-200 rounded-xl px-3 text-[10px] font-black" 
                                                            value={newFollowUp.date} 
                                                            onChange={e => setNewFollowUp({ ...newFollowUp, date: e.target.value })} 
                                                        />
                                                    </FormRow>
                                                </div>
                                                <FormRow label="Notes">
                                                    <textarea 
                                                        className="w-full min-h-[60px] border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-emerald-500" 
                                                        placeholder="Context for next touchpoint..." 
                                                        value={newFollowUp.notes || ''} 
                                                        onChange={e => setNewFollowUp({ ...newFollowUp, notes: e.target.value })} 
                                                    />
                                                </FormRow>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setShowAddFollowUp(false)} className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-wider">Cancel</button>
                                                    <button onClick={handleAddFollowUp} className="flex-[2] py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm">Save Touchpoint</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            {selectedLead.followUps?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(fu => (
                                                <div key={fu.id} className={`p-4 rounded-2xl border transition-all ${fu.status === 'Completed' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">{fu.type}</span>
                                                        <span className="text-[9px] font-black text-slate-400">{fu.date}</span>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed mb-3">{fu.notes}</p>
                                                    <button 
                                                        onClick={() => toggleFollowUpStatus(selectedLead.id, fu.id)} 
                                                        className={`w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                                            fu.status === 'Pending' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'bg-slate-100 text-slate-500'
                                                        }`}
                                                    >
                                                        {fu.status === 'Pending' ? <><CheckSquare size={12}/> Mark Complete</> : <><RefreshCw size={12}/> Reopen</>}
                                                    </button>
                                                </div>
                                            ))}
                                            {(!selectedLead.followUps || selectedLead.followUps.length === 0) && (
                                                <div className="py-12 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    No touchpoints recorded
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex gap-2">
                                {isLeadAdmin && (
                                    <button 
                                        onClick={() => handleDelete(selectedLead)} 
                                        className="p-3 bg-white border border-rose-200 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm"
                                        title="Delete Lead (Admin Only)"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                )}
                                {selectedLead.phone && (
                                    <a
                                        href={`https://wa.me/91${selectedLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${selectedLead.name}, this is Sreemeditec following up on ${selectedLead.productInterest}.`)}`}
                                        target="_blank" rel="noreferrer"
                                        className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center"
                                        title="WhatsApp Customer"
                                    >
                                        <Send size={16}/>
                                    </a>
                                )}
                                <button 
                                    onClick={() => { 
                                        setLead({ ...selectedLead }); 
                                        setViewState('builder'); 
                                        setBuilderMode('edit'); 
                                    }} 
                                    className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-md hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={14}/> Edit Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: TODAY'S TOUCHPOINTS */}
            {/* ========================================================================= */}
            {viewState === 'today' && (
                <div className="flex-1 min-w-0 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in">
                    <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-200 text-slate-800">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    Today's Scheduled Engagements
                                </h3>
                                <p className="text-xl font-bold tracking-tight text-slate-800 leading-none">
                                    {todayTouchpoints.filter(t => t.followUp.status === 'Pending').length} Pending / {todayTouchpoints.length} Total
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar p-6">
                        {todayTouchpoints.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {todayTouchpoints.map(({ lead: l, followUp: fu }) => (
                                    <div key={fu.id} className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${fu.status === 'Completed' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-800">{fu.type}</span>
                                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${fu.status === 'Completed' ? 'bg-slate-200 text-slate-500' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                    {fu.status}
                                                </span>
                                            </div>

                                            <div className="mb-2">
                                                <h4 className="font-black text-slate-800 uppercase text-[12px] tracking-tight">{l.name}</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{l.hospital}</p>
                                            </div>

                                            <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">{fu.notes}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleFollowUpStatus(l.id, fu.id)} 
                                                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                                    fu.status === 'Pending' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white' : 'bg-slate-200 text-slate-500'
                                                }`}
                                            >
                                                {fu.status === 'Pending' ? <><CheckSquare size={12}/> Complete</> : <><RefreshCw size={12}/> Reopen</>}
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedLead(l); setViewState('stock'); }}
                                                className="p-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                                                title="View Lead"
                                            >
                                                <User size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center opacity-30 flex flex-col items-center justify-center">
                                <Calendar size={40} className="mb-3 text-slate-400" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No Touchpoints Scheduled for Today</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 3: MANUAL OPPORTUNITY ENTRY (THE UPDATED FORM) */}
            {/* ========================================================================= */}
            {viewState === 'builder' && (
                <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl md:rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
                    {/* Form Header */}
                    <div className="flex bg-slate-50 border-b border-slate-200 shrink-0 px-6 md:px-10 py-5 justify-between items-center">
                        <div>
                            <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
                                {builderMode === 'add' ? 'Manual Opportunity Entry' : 'Update Lead Profile'}
                            </h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Linked Quotation & Role-Authorized CRM Registration
                            </p>
                        </div>
                        <button 
                            onClick={() => { setViewState('stock'); setLead(DEFAULT_LEAD); }} 
                            className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full shadow-sm"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Form Content - 11 Fields in Specified Sequence */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 md:space-y-8 custom-scrollbar pb-28">
                        
                        {/* Notice Banner */}
                        <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl flex items-start gap-3">
                            <ShieldCheck size={18} className="text-emerald-700 mt-0.5 shrink-0" />
                            <div className="text-[11px] text-emerald-950">
                                <span className="font-black uppercase tracking-wider block mb-0.5">Authorized Registration Active</span>
                                Logged in as <strong className="font-black">{currentUser?.name}</strong> ({isLeadAdmin ? 'Administrator' : 'Sales Representative'}). 
                                Suggestions in Contact / Entity Name display customers with quotations authorized to you.
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* SECTION A: CUSTOMER & QUOTATION IDENTIFIERS */}
                        {/* ========================================================================= */}
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Building2 size={14} className="text-emerald-600" />
                                1. Customer & Quotation Reference
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                
                                {/* FIELD 1: Contact / Entity Name * */}
                                <FormRow label="1. Contact / Entity Name" required>
                                    <AutoSuggest
                                        value={lead.name || ''}
                                        onChange={val => handleSelectCustomer(val.toUpperCase())}
                                        onSelect={client => handleSelectCustomer(client.name.toUpperCase())}
                                        suggestions={authorizedCustomers}
                                        filterKey="name"
                                        className="w-full h-[44px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                                        placeholder="SEARCH AUTHORIZED CUSTOMER..."
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                                        Showing {authorizedCustomers.length} authorized customers with active quotations.
                                    </p>
                                </FormRow>

                                {/* FIELD 2: Quote Number * */}
                                <FormRow label="2. Quote Number" required>
                                    {availableQuotations.length > 0 ? (
                                        <select
                                            className="w-full h-[44px] bg-slate-50 border border-slate-300 rounded-2xl px-4 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                                            value={lead.quotationId || ''}
                                            onChange={e => handleSelectQuotation(e.target.value)}
                                        >
                                            <option value="">SELECT ELIGIBLE QUOTATION...</option>
                                            {availableQuotations.map(q => (
                                                <option key={q.id} value={q.id}>
                                                    {q.invoiceNumber} — {q.invoiceDate || q.date || 'Active'} (₹{(q.grandTotal || 0).toLocaleString('en-IN')})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <div className="w-full h-[44px] bg-amber-50 border border-amber-200 rounded-2xl px-4 flex items-center text-xs font-bold text-amber-800">
                                                {lead.name ? 'No eligible quotations for this customer.' : 'Select a customer first.'}
                                            </div>
                                            {lead.name && (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-bold text-amber-700">Need a quote?</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => onNavigate?.(TabView.QUOTES)} 
                                                        className="text-[9px] font-black uppercase text-indigo-600 underline"
                                                    >
                                                        Create Quotation Now →
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {lead.quotationNo && (
                                        <span className="text-[9px] font-black text-emerald-700 mt-1 block">
                                            ✓ Linked to DB Record ID: {lead.quotationId} (₹{(lead.value || 0).toLocaleString('en-IN')})
                                        </span>
                                    )}
                                </FormRow>

                                {/* FIELD 3: Hospital / Organization * */}
                                <FormRow label="3. Hospital / Organization" required>
                                    <input 
                                        type="text" 
                                        className={`w-full h-[44px] bg-white border rounded-2xl px-4 text-xs font-bold outline-none uppercase focus:ring-2 focus:ring-emerald-500 ${
                                            existingHospitalLead ? 'border-amber-400 bg-amber-50/20' : 'border-slate-300'
                                        }`}
                                        placeholder="HOSPITAL OR CLINIC NAME"
                                        value={lead.hospital || ''}
                                        onChange={e => setLead({ ...lead, hospital: e.target.value })}
                                    />
                                    {existingHospitalLead && (
                                        <p className="text-[9px] font-black text-amber-600 mt-1 uppercase">
                                            ⚠️ Existing lead for "{existingHospitalLead.name}" also references this facility.
                                        </p>
                                    )}
                                </FormRow>

                                {/* FIELD 4: Geographical Location / Address * */}
                                <div className="md:col-span-2">
                                    <FormRow label="4. Geographical Location / Address" required>
                                        <textarea 
                                            className="w-full min-h-[70px] bg-white border border-slate-300 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500" 
                                            placeholder="FULL POSTAL ADDRESS / CITY / DISTRICT..." 
                                            value={lead.address || ''} 
                                            onChange={e => setLead({ ...lead, address: e.target.value })} 
                                        />
                                    </FormRow>
                                </div>
                            </div>
                        </section>

                        {/* ========================================================================= */}
                        {/* SECTION B: PIPELINE & REQUIREMENT DETAILS */}
                        {/* ========================================================================= */}
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-600" />
                                2. Opportunity Intelligence & Pipeline
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                
                                {/* FIELD 5: Acquisition Source * */}
                                <FormRow label="5. Acquisition Source" required>
                                    <select 
                                        className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
                                        value={lead.source || 'Quotation'} 
                                        onChange={e => setLead({ ...lead, source: e.target.value })}
                                    >
                                        <option>Quotation</option>
                                        <option>Website</option>
                                        <option>Amazon</option>
                                        <option>Flipkart</option>
                                        <option>Referral</option>
                                        <option>Direct</option>
                                        <option>Sales</option>
                                        <option>IndiaMART</option>
                                    </select>
                                </FormRow>

                                {/* FIELD 6: Pipeline Status * */}
                                <FormRow label="6. Pipeline Status" required>
                                    <select 
                                        className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
                                        value={lead.status || LeadStatus.QUOTED} 
                                        onChange={e => setLead({ ...lead, status: e.target.value as any })}
                                    >
                                        <option value="Quoted">Quoted</option>
                                        <option value="On Progress">On Progress</option>
                                        <option value="Won">Won</option>
                                        <option value="Lost">Lost</option>
                                    </select>
                                </FormRow>

                                {/* FIELD 8: Handled By * */}
                                <div className="md:col-span-2">
                                    <FormRow label="8. Handled By" required>
                                        {isLeadAdmin ? (
                                            <select
                                                className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                                                value={lead.employeeId || currentUser?.id || ''}
                                                onChange={e => {
                                                    const emp = employees.find(empItem => empItem.id === e.target.value);
                                                    setLead({
                                                        ...lead,
                                                        employeeId: e.target.value,
                                                        salesTakenById: e.target.value,
                                                        salesTakenBy: emp?.name || currentUser?.name || ''
                                                    });
                                                }}
                                            >
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.name} ({emp.department || 'Sales'})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                readOnly
                                                className="w-full h-[44px] bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl px-4 text-xs font-black uppercase cursor-not-allowed outline-none" 
                                                value={`${currentUser?.name} (Verified ID: ${currentUser?.id})`}
                                            />
                                        )}
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">
                                            {isLeadAdmin ? 'Admin permitted to reassign handler.' : 'Locked to authenticated employee.'}
                                        </p>
                                    </FormRow>
                                </div>

                                {/* CONDITIONAL: Lost Reason (Mandatory when Pipeline Status is Lost) */}
                                {(lead.status === 'Lost' || lead.status === LeadStatus.LOST) && (
                                    <div className="md:col-span-2 lg:col-span-4 bg-rose-50/60 p-4 rounded-2xl border border-rose-200 animate-in fade-in">
                                        <FormRow label="Lost Reason (Mandatory for Lost Status)" required>
                                            <textarea 
                                                autoFocus
                                                className="w-full min-h-[70px] bg-white border border-rose-300 rounded-2xl px-4 py-2.5 text-xs font-bold text-rose-950 outline-none focus:ring-2 focus:ring-rose-500"
                                                placeholder="PLEASE PROVIDE A DETAILED EXPLANATION FOR WHY THIS OPPORTUNITY WAS LOST..."
                                                value={lead.lostReason || ''}
                                                onChange={e => setLead({ ...lead, lostReason: e.target.value })}
                                            />
                                            <p className="text-[9px] font-bold text-rose-600 mt-1">
                                                Restricted field: Visible only to handling employee and system administrators.
                                            </p>
                                        </FormRow>
                                    </div>
                                )}

                                {/* FIELD 7: Product Interest / Requirement * */}
                                <div className="md:col-span-2 lg:col-span-4">
                                    <FormRow label="7. Product Interest / Requirement" required>
                                        <AutoSuggest
                                            value={lead.productInterest || ''}
                                            onChange={val => setLead({ ...lead, productInterest: val })}
                                            onSelect={prod => setLead({ ...lead, productInterest: prod.name })}
                                            suggestions={products}
                                            filterKey="name"
                                            className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-black uppercase font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="EQUIPMENT / PRODUCT REQUIREMENTS (RETRIEVED FROM QUOTE)..."
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">
                                            Populated automatically from selected quotation. You may edit specifications without altering the quotation record.
                                        </p>
                                    </FormRow>
                                </div>
                            </div>
                        </section>

                        {/* ========================================================================= */}
                        {/* SECTION C: COMMUNICATION & CONTACT PERSON */}
                        {/* ========================================================================= */}
                        <section className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Phone size={14} className="text-emerald-600" />
                                3. Communication & Contact Points
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                
                                {/* FIELD 9: Mobile / WhatsApp * */}
                                <FormRow label="9. Mobile / WhatsApp" required>
                                    <input 
                                        type="tel" 
                                        className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-black font-mono outline-none focus:ring-2 focus:ring-emerald-500" 
                                        placeholder="+91 9876543210" 
                                        value={lead.phone || ''} 
                                        onChange={e => setLead({ ...lead, phone: e.target.value })} 
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                                        Primary phone number with at least 10 digits.
                                    </p>
                                </FormRow>

                                {/* FIELD 10: Primary Point of Contact * */}
                                <FormRow label="10. Primary Point of Contact" required>
                                    <input 
                                        type="text" 
                                        className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
                                        placeholder="DIRECTOR / DOCTOR / BIOMEDICAL HEAD..." 
                                        value={lead.contactPerson || ''} 
                                        onChange={e => setLead({ ...lead, contactPerson: e.target.value })} 
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                                        Responsible person at hospital/organization.
                                    </p>
                                </FormRow>

                                {/* FIELD 11: Email Address (Optional) */}
                                <FormRow label="11. Email Address (Optional)" required={false}>
                                    <input 
                                        type="email" 
                                        className="w-full h-[44px] bg-white border border-slate-300 rounded-2xl px-4 text-xs font-bold lowercase outline-none focus:ring-2 focus:ring-emerald-500" 
                                        placeholder="CLIENT@FACILITY.COM" 
                                        value={lead.email || ''} 
                                        onChange={e => setLead({ ...lead, email: e.target.value })} 
                                    />
                                    <p className="text-[9px] font-bold text-slate-400 mt-1">
                                        Optional. Validated only when provided.
                                    </p>
                                </FormRow>
                            </div>
                        </section>

                    </div>

                    {/* Form Sticky Footer Actions */}
                    <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-end gap-3 z-30 shrink-0 px-6 md:px-10">
                        <button 
                            type="button"
                            onClick={() => { setViewState('stock'); setLead(DEFAULT_LEAD); }} 
                            className="px-6 md:px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSave} 
                            className="px-8 md:px-12 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/30 active:scale-95 transition-all hover:brightness-110 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <><RefreshCw size={14} className="animate-spin" /> Saving...</>
                            ) : (
                                builderMode === 'add' ? 'Register Lead' : 'Update Opportunity'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
