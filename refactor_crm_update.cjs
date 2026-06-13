const fs = require('fs');

const filePath = '/Users/sureshkumar/Downloads/nirva/components/DataContext.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. updateInvoice ---
const oldUpdateInvoiceBlock1 = `            // Invoice marked as Paid or Completed → auto-post Receipt voucher`;
const newUpdateInvoiceBlock1 = `            // Invoice changed from Draft to non-Draft non-Cancelled -> post Sales Voucher
            if (existing.status === 'Draft' && newStatus !== 'Draft' && newStatus !== 'Cancelled') {
                await postSalesVoucher({ ...existing, ...u } as Invoice);
            }
            // Invoice details updated while it was already active -> reverse and post new Sales Voucher
            else if (existing.status !== 'Draft' && existing.status !== 'Cancelled' && newStatus !== 'Cancelled') {
                const isAmountOrDetailChanged = (u.grandTotal !== undefined && u.grandTotal !== existing.grandTotal) || 
                                                (u.items !== undefined) || 
                                                (u.isRoundOff !== undefined) || 
                                                (u.roundOffAmount !== undefined);
                if (isAmountOrDetailChanged) {
                    const salesVouchers = vouchers.filter(v => v.referenceId === existing.id && v.type === 'Sales' && !v.voucherNumber?.startsWith('REV-'));
                    for (const vch of salesVouchers) {
                        try {
                            await reverseVoucher(vch.id, \`Auto-reversed: Invoice \${existing.invoiceNumber} details updated\`);
                        } catch (err) {}
                    }
                    await postSalesVoucher({ ...existing, ...u } as Invoice);
                }
            }

            // Invoice marked as Paid or Completed → auto-post Receipt voucher`;

content = content.replace(oldUpdateInvoiceBlock1, newUpdateInvoiceBlock1);


// --- 2. updatePurchaseRecord ---
const oldUpdatePurchaseRecordBlock = `        if (updates.supplier && updates.supplier !== oldSupplier) {
            await updateVendorProcurementVolume(updates.supplier);
        }
    };`;
const newUpdatePurchaseRecordBlock = `        if (updates.supplier && updates.supplier !== oldSupplier) {
            await updateVendorProcurementVolume(updates.supplier);
        }

        // Reverse old purchase vouchers and post updated one
        const purchaseVouchers = vouchers.filter(v => v.referenceId === existing?.id && v.type === 'Purchase' && !v.voucherNumber?.startsWith('REV-'));
        for (const vch of purchaseVouchers) {
            try {
                await reverseVoucher(vch.id, \`Auto-reversed: Purchase Record \${existing?.invoiceNo} updated\`);
            } catch (err) {}
        }
        await postPurchaseVoucher({ ...existing, ...updates } as PurchaseRecord);
    };`;
content = content.replace(oldUpdatePurchaseRecordBlock, newUpdatePurchaseRecordBlock);


// --- 3. removePurchaseRecord ---
const oldRemovePurchaseRecordBlock = `        if (supplier) {
            await updateVendorProcurementVolume(supplier);
        }
    };`;
const newRemovePurchaseRecordBlock = `        if (supplier) {
            await updateVendorProcurementVolume(supplier);
        }

        // Reverse associated purchase vouchers
        const purchaseVouchers = vouchers.filter(v => v.referenceId === id && v.type === 'Purchase' && !v.voucherNumber?.startsWith('REV-'));
        for (const vch of purchaseVouchers) {
            try {
                await reverseVoucher(vch.id, \`Auto-reversed: Purchase Record removed\`);
            } catch (err) {}
        }
    };`;
content = content.replace(oldRemovePurchaseRecordBlock, newRemovePurchaseRecordBlock);


// --- 4. autoPostServiceReportVouchers ---
const oldServiceReportBlock = `            if (spares > 0) {
                const sparesRevLdg = ledgers.find(l => l.id === 'LDG-SPARES-REV');
                entries.push({ id: \`\${r.id}-CR-SPARES\`, ledgerId: sparesRevLdg?.id || 'LDG-SPARES-REV', ledgerName: 'Spares Revenue', debit: 0, credit: spares });
            }

            await postToLedger({`;
const newServiceReportBlock = `            if (spares > 0) {
                const sparesRevLdg = ledgers.find(l => l.id === 'LDG-SPARES-REV');
                entries.push({ id: \`\${r.id}-CR-SPARES\`, ledgerId: sparesRevLdg?.id || 'LDG-SPARES-REV', ledgerName: 'Spares Revenue', debit: 0, credit: spares });
            }

            if (r.isRoundOff && r.roundOffAmount) {
                const roAmt = Number(r.roundOffAmount);
                let roundOffLdg = ledgers.find(l => l.name === 'Round Off');
                if (!roundOffLdg) {
                    const roId = 'LED-ROUNDOFF';
                    roundOffLdg = { id: roId, name: 'Round Off', groupId: 'GRP-INCOME', openingBalance: 0, currentBalance: 0 };
                    try { await addLedger(roundOffLdg); } catch(e){}
                }
                if (roundOffLdg && roAmt > 0) {
                    entries.push({ id: \`\${r.id}-RO-CR\`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: 0, credit: roAmt });
                } else if (roundOffLdg && roAmt < 0) {
                    entries.push({ id: \`\${r.id}-RO-DR\`, ledgerId: roundOffLdg.id, ledgerName: 'Round Off', debit: Math.abs(roAmt), credit: 0 });
                }
            }

            await postToLedger({`;
content = content.replace(oldServiceReportBlock, newServiceReportBlock);


fs.writeFileSync(filePath, content, 'utf8');
console.log('Update/Remove replacements done.');
