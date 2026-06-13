const fs = require('fs');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/DataContext.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. addClient
const oldAddClient = `    const addClient = async (c: Client) => { 
        setClients(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "clients", c.id), sanitizeData(c)); 
        await addLog('System', 'Added Client', \`New client: \${c.name}\`); 
    };`;
const newAddClient = `    const addClient = async (c: Client) => { 
        setClients(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "clients", c.id), sanitizeData(c)); 
        await addLog('System', 'Added Client', \`New client: \${c.name}\`); 
        try {
            await ensurePartyLedger(c.name, 'GRP-DEBTORS', { email: c.email, phone: c.phone });
        } catch (err) { console.warn('Ledger auto-create failed for client:', err); }
    };`;
content = content.replace(oldAddClient, newAddClient);

// 2. updateClient
const oldUpdateClient = `    const updateClient = async (id: string, c: Partial<Client>) => {
        const existing = clients.find(cl => cl.id === id);
        if (existing) setClients(prev => prev.map(cl => cl.id === id ? { ...cl, ...c } as Client : cl).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "clients", id), sanitizeData(c));
        await addLog('System', 'Updated Client', \`Client updated: \${existing?.name || id}\`, existing, { ...existing, ...c });
    };`;
const newUpdateClient = `    const updateClient = async (id: string, c: Partial<Client>) => {
        const existing = clients.find(cl => cl.id === id);
        if (existing) setClients(prev => prev.map(cl => cl.id === id ? { ...cl, ...c } as Client : cl).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "clients", id), sanitizeData(c));
        await addLog('System', 'Updated Client', \`Client updated: \${existing?.name || id}\`, existing, { ...existing, ...c });
        
        if (c.name && existing && c.name !== existing.name) {
            try {
                const ldg = ledgers.find(l => l.name === existing.name && l.groupId === 'GRP-DEBTORS');
                if (ldg) await updateLedger(ldg.id, { name: c.name });
            } catch (err) { console.warn('Ledger name update failed:', err); }
        }
    };`;
content = content.replace(oldUpdateClient, newUpdateClient);

// 3. addVendor
const oldAddVendor = `    const addVendor = async (v: Vendor) => { 
        setVendors(prev => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "vendors", v.id), sanitizeData(v)); 
        await addLog('System', 'Added Vendor', v.name); 
    };`;
const newAddVendor = `    const addVendor = async (v: Vendor) => { 
        setVendors(prev => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
        await setDoc(doc(db, "vendors", v.id), sanitizeData(v)); 
        await addLog('System', 'Added Vendor', v.name); 
        try {
            await ensurePartyLedger(v.name, 'GRP-CREDITORS');
        } catch (err) { console.warn('Ledger auto-create failed for vendor:', err); }
    };`;
content = content.replace(oldAddVendor, newAddVendor);

// 4. updateVendor
const oldUpdateVendor = `    const updateVendor = async (id: string, v: Partial<Vendor>) => {
        const existing = vendors.find(ven => ven.id === id);
        if (existing) setVendors(prev => prev.map(ven => ven.id === id ? { ...ven, ...v } as Vendor : ven).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "vendors", id), sanitizeData(v));
        await addLog('System', 'Updated Vendor', existing?.name || id, existing, { ...existing, ...v });
    };`;
const newUpdateVendor = `    const updateVendor = async (id: string, v: Partial<Vendor>) => {
        const existing = vendors.find(ven => ven.id === id);
        if (existing) setVendors(prev => prev.map(ven => ven.id === id ? { ...ven, ...v } as Vendor : ven).sort((a, b) => a.name.localeCompare(b.name)));
        await updateDoc(doc(db, "vendors", id), sanitizeData(v));
        await addLog('System', 'Updated Vendor', existing?.name || id, existing, { ...existing, ...v });
        
        if (v.name && existing && v.name !== existing.name) {
            try {
                const ldg = ledgers.find(l => l.name === existing.name && l.groupId === 'GRP-CREDITORS');
                if (ldg) await updateLedger(ldg.id, { name: v.name });
            } catch (err) { console.warn('Ledger name update failed:', err); }
        }
    };`;
content = content.replace(oldUpdateVendor, newUpdateVendor);

// 5. Inject Voucher Helpers before addInvoice
const helperInjectionMarker = `    const removeVendor = async (id: string) => { 
        setVendors(prev => prev.filter(v => v.id !== id));
        await deleteDoc(doc(db, "vendors", id)); 
        await addLog('System', 'Removed Vendor', id); 
    };`;

const helpers = `
    const postSalesVoucher = async (i: Invoice) => {
        try {
            const total = i.grandTotal || 0;
            if (total <= 0) return;
            const debtorId = await ensurePartyLedger(i.customerName, 'GRP-DEBTORS', { gstin: i.customerGstin, email: i.email, phone: i.phone });
            const salesLdg = ledgers.find(l => l.id === 'LDG-SALES');
            const cgstLdg = ledgers.find(l => l.id === 'LDG-CGST-OUT');
            const sgstLdg = ledgers.find(l => l.id === 'LDG-SGST-OUT');
            const igstLdg = ledgers.find(l => l.name === 'Output IGST'); // Assuming IGST ledger might exist or need creation
            let roundOffLdg = ledgers.find(l => l.name === 'Round Off');
            if (!roundOffLdg) {
                // Auto-create round off ledger
                const roId = 'LED-ROUNDOFF';
                roundOffLdg = { id: roId, name: 'Round Off', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 };
                try { await addLedger(roundOffLdg); } catch (e) {}
            }

            if (!salesLdg) console.warn('LDG-SALES ledger not found');

            let taxableAmt = 0, cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
            if (i.items && i.items.length > 0) {
                i.items.forEach(it => {
                    const qty = Number(it.quantity) || 0;
                    const rate = Number(it.rate) || 0;
                    const amt = qty * rate;
                    taxableAmt += amt;
                    cgstAmt += amt * ((Number(it.cgstPercent) || 0) / 100);
                    sgstAmt += amt * ((Number(it.sgstPercent) || 0) / 100);
                    igstAmt += amt * ((Number(it.igstPercent) || 0) / 100);
                });
            } else {
                taxableAmt = Math.round(total * 0.82 * 100) / 100;
                cgstAmt = Math.round(total * 0.09 * 100) / 100;
                sgstAmt = Math.round(total * 0.09 * 100) / 100;
            }

            const entries: any[] = [
                { id: \`\${i.id}-DEBTOR\`, ledgerId: debtorId, ledgerName: i.customerName, debit: total, credit: 0 },
                { id: \`\${i.id}-SALES\`, ledgerId: salesLdg?.id || '', ledgerName: 'Sales Account', debit: 0, credit: taxableAmt }
            ];

            if (cgstAmt > 0) entries.push({ id: \`\${i.id}-CGST\`, ledgerId: cgstLdg?.id || '', ledgerName: 'Output CGST', debit: 0, credit: cgstAmt });
            if (sgstAmt > 0) entries.push({ id: \`\${i.id}-SGST\`, ledgerId: sgstLdg?.id || '', ledgerName: 'Output SGST', debit: 0, credit: sgstAmt });
            if (igstAmt > 0) entries.push({ id: \`\${i.id}-IGST\`, ledgerId: igstLdg?.id || '', ledgerName: 'Output IGST', debit: 0, credit: igstAmt });

            if (i.isRoundOff && i.roundOffAmount) {
                const roAmt = Number(i.roundOffAmount);
                if (roAmt > 0) {
                    entries.push({ id: \`\${i.id}-RO-CR\`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: 0, credit: roAmt });
                } else if (roAmt < 0) {
                    entries.push({ id: \`\${i.id}-RO-DR\`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: Math.abs(roAmt), credit: 0 });
                }
            }

            await postToLedger({
                date: i.date,
                type: 'Sales',
                entries,
                totalAmount: total,
                narration: \`Auto: Invoice \${i.invoiceNumber} — \${i.customerName}\`,
                referenceId: i.id,
                referenceNumber: i.invoiceNumber
            });
            await addLog('Accounting', 'Auto Sales Entry', \`Invoice \${i.invoiceNumber} → Sales voucher posted\`);
        } catch (err) {
            console.warn('Auto-accounting failed for invoice:', err);
        }
    };

    const postPurchaseVoucher = async (r: PurchaseRecord) => {
        try {
            const total = r.total || 0;
            if (total <= 0 || !r.supplier) return;
            const creditorId = await ensurePartyLedger(r.supplier, 'GRP-CREDITORS');
            const purchaseLdg = ledgers.find(l => l.id === 'LDG-PURCHASE');
            let cgstLdg = ledgers.find(l => l.name === 'Input CGST');
            let sgstLdg = ledgers.find(l => l.name === 'Input SGST');
            let igstLdg = ledgers.find(l => l.name === 'Input IGST');
            let roundOffLdg = ledgers.find(l => l.name === 'Round Off');

            if (!purchaseLdg) console.warn('LDG-PURCHASE ledger not found');

            let taxableAmt = 0, cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
            if (r.items && r.items.length > 0) {
                r.items.forEach(it => {
                    const qty = Number(it.qty) || 0;
                    const rate = Number(it.rate) || 0;
                    const amt = qty * rate;
                    taxableAmt += amt;
                    cgstAmt += amt * ((Number(it.cgstPercent) || 0) / 100);
                    sgstAmt += amt * ((Number(it.sgstPercent) || 0) / 100);
                    igstAmt += amt * ((Number(it.igstPercent) || 0) / 100);
                });
            } else {
                taxableAmt = total;
            }

            const entries: any[] = [
                { id: \`\${r.id}-CREDITOR\`, ledgerId: creditorId, ledgerName: r.supplier, debit: 0, credit: total },
                { id: \`\${r.id}-PUR\`, ledgerId: purchaseLdg?.id || '', ledgerName: 'Purchase Account', debit: taxableAmt, credit: 0 }
            ];

            if (cgstAmt > 0 && cgstLdg) entries.push({ id: \`\${r.id}-CGST\`, ledgerId: cgstLdg.id, ledgerName: 'Input CGST', debit: cgstAmt, credit: 0 });
            if (sgstAmt > 0 && sgstLdg) entries.push({ id: \`\${r.id}-SGST\`, ledgerId: sgstLdg.id, ledgerName: 'Input SGST', debit: sgstAmt, credit: 0 });
            if (igstAmt > 0 && igstLdg) entries.push({ id: \`\${r.id}-IGST\`, ledgerId: igstLdg.id, ledgerName: 'Input IGST', debit: igstAmt, credit: 0 });

            if (r.isRoundOff && r.roundOffAmount) {
                const roAmt = Number(r.roundOffAmount);
                if (roAmt > 0) {
                    entries.push({ id: \`\${r.id}-RO-DR\`, ledgerId: roundOffLdg?.id || '', ledgerName: 'Round Off', debit: roAmt, credit: 0 });
                } else if (roAmt < 0) {
                    entries.push({ id: \`\${r.id}-RO-CR\`, ledgerId: roundOffLdg?.id || '', ledgerName: 'Round Off', debit: 0, credit: Math.abs(roAmt) });
                }
            }

            await postToLedger({
                date: r.dateSupply || new Date().toISOString().split('T')[0],
                type: 'Purchase',
                entries,
                totalAmount: total,
                narration: \`Auto: Purchase from \${r.supplier} — \${r.invoiceNo}\`,
                referenceId: r.id,
                referenceNumber: r.invoiceNo || ''
            });
            await addLog('Accounting', 'Auto Purchase Entry', \`Purchase \${r.id} → Purchase voucher posted\`);
        } catch (err) {
            console.warn('Auto-accounting failed for purchase:', err);
        }
    };
`;
content = content.replace(helperInjectionMarker, helperInjectionMarker + helpers);

// 6. Rewrite addInvoice
const oldAddInvoiceBlock = `        // Event-driven accounting: auto-post Sales voucher for finalized invoices
        if (i.documentType === 'Invoice' && i.status !== 'Draft' && i.status !== 'Cancelled') {
            try {
                const total = i.grandTotal || 0;
                if (total <= 0) return;
                const debtorId = await ensurePartyLedger(i.customerName, 'GRP-DEBTORS', { gstin: i.customerGstin, email: i.email, phone: i.phone });
                const salesLdg = ledgers.find(l => l.id === 'LDG-SALES');
                const cgstLdg = ledgers.find(l => l.id === 'LDG-CGST-OUT');
                const sgstLdg = ledgers.find(l => l.id === 'LDG-SGST-OUT');
                if (!salesLdg) console.warn('LDG-SALES ledger not found — sales entry will have empty ledgerId');
                if (!cgstLdg) console.warn('LDG-CGST-OUT ledger not found — CGST entry will have empty ledgerId');
                if (!sgstLdg) console.warn('LDG-SGST-OUT ledger not found — SGST entry will have empty ledgerId');
                const salesAmt = Math.round(total * 0.82 * 100) / 100;
                const taxAmt = Math.round(total * 0.09 * 100) / 100;
                await postToLedger({
                    date: i.date,
                    type: 'Sales',
                    entries: [
                        { id: \`\${i.id}-DEBTOR\`, ledgerId: debtorId, ledgerName: i.customerName, debit: total, credit: 0 },
                        { id: \`\${i.id}-SALES\`, ledgerId: salesLdg?.id || '', ledgerName: 'Sales Account', debit: 0, credit: salesAmt },
                        { id: \`\${i.id}-CGST\`, ledgerId: cgstLdg?.id || '', ledgerName: 'Output CGST', debit: 0, credit: taxAmt },
                        { id: \`\${i.id}-SGST\`, ledgerId: sgstLdg?.id || '', ledgerName: 'Output SGST', debit: 0, credit: taxAmt },
                    ],
                    totalAmount: total,
                    narration: \`Auto: Invoice \${i.invoiceNumber} — \${i.customerName}\`,
                    referenceId: i.id,
                    referenceNumber: i.invoiceNumber
                });
                await addLog('Accounting', 'Auto Sales Entry', \`Invoice \${i.invoiceNumber} → Sales voucher posted\`);
            } catch (err) {
                console.warn('Auto-accounting failed for invoice:', err);
                await addLog('Accounting', 'Auto-Entry Failed', \`Invoice \${i.invoiceNumber}: \${err}\`);
            }
        }`;
const newAddInvoiceBlock = `        // Event-driven accounting: auto-post Sales voucher for finalized invoices
        if (i.documentType === 'Invoice' && i.status !== 'Draft' && i.status !== 'Cancelled') {
            await postSalesVoucher(i);
        }`;
content = content.replace(oldAddInvoiceBlock, newAddInvoiceBlock);


// 7. Rewrite auto-post Purchase voucher block in addPurchaseRecord
const oldPurchaseAutoPost = `        // Event-driven accounting: auto-post Purchase voucher
        try {
            const total = r.total || 0;
            if (total > 0 && r.supplier) {
                const creditorId = await ensurePartyLedger(r.supplier, 'GRP-CREDITORS');
                const purchaseLdg = ledgers.find(l => l.id === 'LDG-PURCHASE');
                if (!purchaseLdg) console.warn('LDG-PURCHASE ledger not found — purchase entry will have empty ledgerId');
                await postToLedger({
                    date: r.dateSupply || new Date().toISOString().split('T')[0],
                    type: 'Purchase',
                    entries: [
                        { id: \`\${r.id}-PUR\`, ledgerId: purchaseLdg?.id || '', ledgerName: 'Purchase Account', debit: total, credit: 0 },
                        { id: \`\${r.id}-CREDITOR\`, ledgerId: creditorId, ledgerName: r.supplier, debit: 0, credit: total },
                    ],
                    totalAmount: total,
                    narration: \`Auto: Purchase from \${r.supplier} — \${itemsStr}\`,
                    referenceId: r.id,
                    referenceNumber: r.invoiceNo || ''
                });
                await addLog('Accounting', 'Auto Purchase Entry', \`Purchase \${r.id} → Purchase voucher posted\`);
            }
        } catch (err) {
            console.warn('Auto-accounting failed for purchase:', err);
            await addLog('Accounting', 'Auto-Entry Failed', \`Purchase \${r.id}: \${err}\`);
        }`;
const newPurchaseAutoPost = `        // Event-driven accounting: auto-post Purchase voucher
        await postPurchaseVoucher(r);`;
content = content.replace(oldPurchaseAutoPost, newPurchaseAutoPost);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Helpers and add replacements done.');
