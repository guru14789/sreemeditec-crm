import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, ServiceReport, DeliveryChallan, ChallanItem, BankDetails } from '../types';
import { COMPANY_DETAILS, BANK_DETAILS, PDF_STYLES } from './PDFConstants';

const formatDateDDMMYYYY = (dateStr?: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

const numberToWords = (num: number): string => {
    if (isNaN(num) || num === null || num === undefined) return '';
    if (num === 0) return 'Zero Only';
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n: number): string => {
        if (isNaN(n)) return '';
        if (n < 20) return a[n] || '';
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + 'crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
    };
    const result = inWords(Math.floor(num));
    return result ? '(' + result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + ' only)' : '';
};

export const calculateDetailedTotals = (data: Partial<Invoice>) => {
    const items = data.items || [];
    const subtotal = items.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice)), 0);
    const itemGstTotal = items.reduce((sum, p) => sum + ((Number(p.quantity) * Number(p.unitPrice)) * (Number(p.taxRate) / 100)), 0);
    
    const freight = Number(data.freightAmount) || 0;
    const freightGst = freight * ((Number(data.freightTaxRate) || 0) / 100);
    const discount = Number(data.discount) || 0;

    // Split GST into CGST/SGST halves (intra-state) for the tax breakdown table
    const cgst = itemGstTotal / 2;
    const sgst = itemGstTotal / 2;

    // Sum of quantities across all line items
    const totalQty = items.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    // Taxable value = subtotal before GST, after discount
    const taxableValue = subtotal - discount;

    const grandTotalRaw = subtotal + itemGstTotal + freight + freightGst - discount;
    let roundOff = 0;
    let grandTotal = grandTotalRaw;
    if (data.isRoundOff) {
        grandTotal = Math.round(grandTotalRaw);
        roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
    }
    return { subtotal, itemGstTotal, freight, freightGst, discount, grandTotal, cgst, sgst, totalQty, taxableValue, roundOff, grandTotalRaw };
};


export const PDFService = {
    async generateInvoicePDF(data: Partial<Invoice>, isQuotation: boolean = false, bankDetails?: BankDetails) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        const docTotals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const col0W = 10;
        const col1W = 80;
        const midX = margin + col0W + col1W;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(isQuotation ? 'Quotation' : 'Tax Invoice', midX, 10, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('(ORIGINAL FOR RECIPIENT)', pageWidth - margin, 10, { align: 'right' });

        doc.setLineWidth(0.1);
        const startY = 12;
        const totalHeaderH = 100;
        doc.rect(margin, startY, pageWidth - (margin * 2), totalHeaderH);
        doc.line(midX, startY, midX, startY + totalHeaderH);

        const seller = data.sellerProfile || COMPANY_DETAILS;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(seller.name || (seller as any).companyName || 'SREE MEDITEC', margin + 3, startY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const sellerAddr = doc.splitTextToSize(seller.address || '', midX - margin - 5);
        doc.text(sellerAddr, margin + 3, startY + 11);
        
        const nextY = startY + 11 + (sellerAddr.length * 3.5);
        doc.text(`Ph.${seller.phone || ''}`, margin + 3, nextY);
        doc.text(`GSTIN/UIN: ${seller.gstin || ''}`, margin + 3, nextY + 4);
        doc.text(`E-Mail : ${seller.email || ''}`, margin + 3, nextY + 8);

        doc.line(margin, startY + 35, midX, startY + 35);
        doc.setFontSize(7);
        doc.text('Consignee (Ship to)', margin + 3, startY + 39);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 3, startY + 43);
        doc.setFont('helvetica', 'normal');
        const cAddr = doc.splitTextToSize(data.customerAddress || '', midX - margin - 5);
        doc.text(cAddr, margin + 3, startY + 47);
        const cGstY = startY + 47 + (cAddr.length * 3) + 2;
        doc.text(`GSTIN/UIN       : ${data.customerGstin || ''}`, margin + 3, cGstY);

        doc.line(margin, startY + 67, midX, startY + 67);
        doc.text('Buyer (Bill to)', margin + 3, startY + 71);
        doc.setFont('helvetica', 'bold');
        doc.text(data.buyerName || data.customerName || '', margin + 3, startY + 75);
        doc.setFont('helvetica', 'normal');
        const bAddr = doc.splitTextToSize(data.buyerAddress || data.customerAddress || '', midX - margin - 5);
        doc.text(bAddr, margin + 3, startY + 79);
        const bGstY = startY + 79 + (bAddr.length * 3) + 2;
        doc.text(`GSTIN/UIN       : ${data.buyerGstin || data.customerGstin || ''}`, margin + 3, bGstY);
        doc.text('Place of Supply : Tamil Nadu', margin + 3, bGstY + 3);

        const innerMid = midX + ((pageWidth - margin - midX) / 2);
        const metadataRows = [
            { l: isQuotation ? 'Quotation No.' : 'Invoice No.', v: data.invoiceNumber, r: 'Dated', rv: formatDateDDMMYYYY(data.date) },
            { l: 'Delivery Note', v: '', r: 'Mode/Terms of Payment', rv: data.deliveryTime || 'Immediately' },
            { l: 'Reference No. & Date.', v: '', r: 'Other References', rv: '' },
            { l: 'Buyer\'s Order No.', v: data.smcpoNumber, r: 'Dated', rv: formatDateDDMMYYYY(data.date) },
            { l: 'Dispatch Doc No.', v: '', r: 'Delivery Note Date', rv: '' },
            { l: 'Dispatched through', v: data.dispatchedThrough || 'Person', r: 'Destination', rv: data.specialNote || 'Chennai' },
            { l: 'Terms of Delivery', v: '', r: '', rv: '' }
        ];

        metadataRows.forEach((row, i) => {
            const y = startY + (i * 14);
            if (i > 0) doc.line(midX, y, pageWidth - margin, y);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(row.l, midX + 2, y + 4);
            doc.text(row.r, innerMid + 2, y + 4);
            doc.setFont('helvetica', 'bold');
            doc.text(row.v || '', midX + 2, y + 9);
            doc.text(row.rv || '', innerMid + 2, y + 9);
            if (i < 6) doc.line(innerMid, y, innerMid, y + 14);
        });

        const itemsBody = (data.items || []).map((it, idx) => {
            const qty = Number(it.quantity) || 0;
            const price = Number(it.unitPrice) || 0;
            const tax = Number(it.taxRate) || 0;
            const base = qty * price;
            return [
                idx + 1, 
                { content: it.features ? `${it.description}\n${it.features}` : it.description, styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, 
                it.hsn || '', 
                `${tax}%`, 
                `${(Number(qty) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} nos`, 
                (Number(price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                'nos', 
                '', 
                (Number(base) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];
        });

        itemsBody.push(
            ['', { content: 'Freight', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', `${data.freightTaxRate || 0}%`, '', '', '', '', (Number(docTotals.freight) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
            ['', { content: 'Output CGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', (Number(docTotals.cgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
            ['', { content: 'Output SGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', (Number(docTotals.sgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]
        );

        if (data.isRoundOff && docTotals.roundOff !== 0) {
            itemsBody.push(
                ['', { content: 'Round Off', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', (Number(docTotals.roundOff) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })]
            );
        }

        autoTable(doc, {
            startY: startY + totalHeaderH,
            margin: { left: margin, right: margin },
            head: [['Sl\nNo.', 'Description of Goods', 'HSN/SAC', 'GST Rate', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']],
            body: itemsBody,
            foot: [[
                '', 
                { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, 
                '', 
                '', 
                { content: `${(Number(docTotals.totalQty) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} nos`, styles: { halign: 'center', fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, 
                '', 
                '', 
                '', 
                { content: `Rs. ${(Number(docTotals.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } as any }
            ]],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', fontSize: 7, cellPadding: 1 },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8, cellPadding: 1 },
            styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            columnStyles: { 
                0: { cellWidth: col0W, halign: 'center' },
                1: { cellWidth: col1W },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 12, halign: 'center' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 15, halign: 'right' },
                6: { cellWidth: 10, halign: 'center' },
                7: { cellWidth: 8, halign: 'center' },
                8: { cellWidth: pageWidth - (margin * 2) - col0W - col1W - 15 - 12 - 20 - 15 - 10 - 8, halign: 'right' }
            }
        });

        const tableFinalY = (doc as any).lastAutoTable.finalY;
        const wordsY = tableFinalY + 8;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`Amount (in words): INR ${numberToWords(docTotals.grandTotal)}`, margin, wordsY);
        doc.text('E. & O.E', pageWidth - margin, wordsY, { align: 'right' });

        let currentY = wordsY + 6;

        if (!isQuotation) {
            const taxBreakdownBody = [
                ['9402', (Number(docTotals.taxableValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '9%', (Number(docTotals.cgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), '9%', (Number(docTotals.sgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), (Number(docTotals.cgst + docTotals.sgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
                [{ content: 'Total', styles: { fontStyle: 'bold', halign: 'right' , textColor: [0, 0, 0] } as any }, { content: (Number(docTotals.taxableValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' , textColor: [0, 0, 0] } as any }, '', { content: (Number(docTotals.cgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' , textColor: [0, 0, 0] } as any }, '', { content: (Number(docTotals.sgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' , textColor: [0, 0, 0] } as any }, { content: (Number(docTotals.cgst + docTotals.sgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' , textColor: [0, 0, 0] } as any }]
            ];

            autoTable(doc, {
                startY: wordsY + 6,
                margin: { left: margin, right: margin },
                head: [
                    [{ content: 'HSN/SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' , textColor: [0, 0, 0] } as any }, { content: 'Taxable\nValue', rowSpan: 2, styles: { halign: 'center', valign: 'middle' , textColor: [0, 0, 0] } as any }, { content: 'Central Tax', colSpan: 2, styles: { halign: 'center' , textColor: [0, 0, 0] } as any }, { content: 'State Tax', colSpan: 2, styles: { halign: 'center' , textColor: [0, 0, 0] } as any }, { content: 'Total\nTax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' , textColor: [0, 0, 0] } as any }],
                    ['Rate', 'Amount', 'Rate', 'Amount']
                ],
                body: taxBreakdownBody,
                theme: 'grid',
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 7, fontStyle: 'bold' },
                styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
            });
            currentY = (doc as any).lastAutoTable.finalY + 5;
            doc.setFontSize(8);
            doc.text(`Tax Amount (in words) : INR ${numberToWords(docTotals.cgst + docTotals.sgst)}`, margin, currentY);
        } else {
            // Space for quotation terms
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Terms & Conditions:', margin, currentY);
            doc.text('1. Validity: 30 Days from date of quotation.', margin, currentY + 5);
            doc.text('2. Delivery: Immediate after order confirmation.', margin, currentY + 10);
            doc.text('3. Payment: 100% advance or as agreed.', margin, currentY + 15);
            currentY += 20;
        }

        const footerH = 50;
        const bottomY = currentY + 5;
        doc.rect(margin, bottomY, pageWidth - (margin * 2), footerH);
        doc.setFont('helvetica', 'bold');
        doc.text('Declaration', margin + 2, bottomY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const declLines = doc.splitTextToSize('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', (midX - margin) - 4);
        doc.text(declLines, margin + 2, bottomY + 10);

        doc.line(midX, bottomY, midX, bottomY + footerH);
        doc.line(margin, bottomY + 25, pageWidth - margin, bottomY + 25);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Company\'s Bank Details', midX + 2, bottomY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const displayBank = bankDetails || data.selectedBank || (isQuotation ? BANK_DETAILS.icici : BANK_DETAILS.kvb);
        doc.text('Bank Name', midX + 2, bottomY + 10); doc.text(`: ${displayBank.bankName}`, midX + 30, bottomY + 10);
        doc.text('A/c No.', midX + 2, bottomY + 14); doc.text(`: ${displayBank.accountNo}`, midX + 30, bottomY + 14);
        doc.text('Branch & IFS Code', midX + 2, bottomY + 18); doc.text(`: ${displayBank.branchIfsc || ((displayBank as any).branch && (displayBank as any).ifsc ? (displayBank as any).branch + ' & ' + (displayBank as any).ifsc : '')}`, midX + 30, bottomY + 18);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer\'s Seal and Signature', margin + 2, bottomY + 55);
        doc.text(`For ${seller.companyName || seller.name || 'SREE MEDITEC'}`, pageWidth - margin, bottomY + 35, { align: 'right' });
        doc.text('Authorised Signatory', pageWidth - margin - 2, bottomY + 55, { align: 'right' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text(`This is a Computer Generated ${isQuotation ? 'Quotation' : 'Invoice'}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

        return doc.output('blob');
    },

    async generateQuotationPDF(data: Partial<Invoice>, brandAssets: { logo: string | null, signature: string | null, seal: string | null, repName: string, repPhone: string }, bankDetails?: BankDetails) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        const totals = calculateDetailedTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const seller = data.sellerProfile || COMPANY_DETAILS;

        const drawHeader = () => {
            if (brandAssets.logo) doc.addImage(brandAssets.logo, 'PNG', 10, 10, 25, 25);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text(seller.companyName || seller.name || 'SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(seller.address, pageWidth / 2, 24, { align: 'center' });
            doc.text(`Mob: ${seller.phone}.`, pageWidth / 2, 28, { align: 'center' });
            doc.text(`GST NO: ${seller.gstin}`, pageWidth / 2, 32, { align: 'center' });
        };
        drawHeader();

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Quotation', pageWidth / 2, 40, { align: 'center' });
        doc.line(pageWidth / 2 - 10, 41, pageWidth / 2 + 10, 41);

        doc.setFontSize(10);
        doc.text(`Ref: ${data.invoiceNumber}`, 15, 48);
        doc.text(`Date: ${formatDateDDMMYYYY(data.date)}`, pageWidth - 15, 48, { align: 'right' });

        doc.text('To,', 15, 56);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '---', 15, 61);
        doc.setFont('helvetica', 'normal');
        const addrLines = doc.splitTextToSize(data.customerAddress || '', 100);
        doc.text(addrLines, 15, 66);
        let currentY = 66 + (addrLines.length * 5);
        if (data.customerGstin) {
            doc.text(`GST: ${data.customerGstin}`, 15, currentY + 2);
            currentY += 7;
        } else currentY += 5;

        currentY += 8;
        doc.setFont('helvetica', 'bold');
        doc.text(`Sub: Reg. Price Quotation for ${data.subject || '---'}.`, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text('Sir, this is with ref to the discussion we had with you we are happy in submitting our quotation for the same.', 15, currentY + 6, { maxWidth: pageWidth - 30 });
        currentY += 14;

        autoTable(doc, {
            startY: currentY,
            head: [['Product', 'Model', 'Features', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Amount']],
            body: (data.items || []).map(it => {
                const gstAmt = (Number(it.unitPrice) * Number(it.quantity)) * (Number(it.taxRate) / 100);
                const lineTotal = (Number(it.unitPrice) * Number(it.quantity)) + gstAmt;
                return [
                    it.description, it.model || '-', it.features ? it.features : '-', `${it.quantity}\n${it.unit}`,
                    `Rs.${Number(it.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${it.taxRate}%`, `Rs.${gstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    { content: `Rs.${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n${numberToWords(lineTotal)}`, styles: { halign: 'right' , textColor: [0, 0, 0] } }
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center' },
            styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 20 }, 2: { cellWidth: 35 }, 3: { cellWidth: 10, halign: 'center' }, 4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 10, halign: 'center' }, 6: { cellWidth: 18, halign: 'right' }, 7: { cellWidth: 35 } }
        });

        let finalY = (doc as any).lastAutoTable.finalY;
        let summaryRows = [
            { label: 'Gross Total:', value: `Rs.${totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Freight:', value: `Rs.${(totals.freight + totals.freightGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Discount:', value: `(-) Rs.${totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
            { label: 'Total GST:', value: `Rs.${totals.itemGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
        ];

        if (data.isRoundOff && totals.roundOff !== 0) {
            summaryRows.push({
                label: 'Round Off:',
                value: `${totals.roundOff > 0 ? '(+) ' : '(-) '}Rs.${Math.abs(totals.roundOff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            });
        }

        const requiredHeight = 10 + (summaryRows.length * 6) + 12; // safety margin
        if (finalY + requiredHeight > pageHeight - margin) { doc.addPage(); finalY = 20; }
        const summaryX = pageWidth - 80;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        let currentSumY = finalY + 8;
        summaryRows.forEach(row => {
            doc.text(row.label, summaryX, currentSumY);
            doc.text(row.value, pageWidth - 15, currentSumY, { align: 'right' });
            currentSumY += 6;
        });

        doc.setFontSize(11);
        doc.text('Grand Total:', summaryX, currentSumY + 2);
        doc.text(`Rs.${totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 15, currentSumY + 2, { align: 'right' });
        finalY = currentSumY + 10;

        if (finalY + 45 > pageHeight - margin) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms and condition:', 15, finalY);
        doc.setFont('helvetica', 'normal');
        const displayBank = data.selectedBank || bankDetails || BANK_DETAILS.icici;
        const termsList = [
            ['Validity', `: The above price is valid up to 30 days from the date of submission of the Quotation.`],
            ['Taxes', `: GST is applicable to the price mentioned as per item-wise rates.`],
            ['Payment', `: ${data.paymentTerms}`],
            ['Banking details', `: Bank name: ${displayBank.bankName}, Branch & IFS Code: ${displayBank.branchIfsc || ((displayBank as any).branch && (displayBank as any).ifsc ? (displayBank as any).branch + ' & ' + (displayBank as any).ifsc : 'Selaiyur & ICIC0006037')},\n  A/C No: ${displayBank.accountNo}, A/C name: Sreemeditec, A/C type: CA`],
            ['Delivery', `: ${data.deliveryTerms}`],
            ['Warranty', `: ${data.warrantyTerms}`]
        ];
        autoTable(doc, { startY: finalY + 2, margin: { left: 15 }, theme: 'plain', styles: { fontSize: 10.5, cellPadding: 1 , textColor: [0, 0, 0] }, columnStyles: { 0: { cellWidth: 28, fontStyle: 'bold' }, 1: { cellWidth: 150 } }, body: termsList });

        let signOffY = (doc as any).lastAutoTable.finalY + 10;
        if (signOffY + 50 > pageHeight - margin) { doc.addPage(); signOffY = 20; }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Thanking you and looking forward for your order.', 15, signOffY);
        doc.text('With Regards,', 15, signOffY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(`For ${seller.companyName || seller.name || 'SREE MEDITEC'},`, 15, signOffY + 14);
        if (brandAssets.signature) doc.addImage(brandAssets.signature, 'PNG', 15, signOffY + 16, 35, 12);
        if (brandAssets.seal) doc.addImage(brandAssets.seal, 'PNG', 70, signOffY + 14, 22, 22);
        doc.text(brandAssets.repName, 15, signOffY + 36);
        doc.setFont('helvetica', 'normal');
        doc.text(brandAssets.repPhone, 15, signOffY + 41);
        
        return doc.output('blob');
    },

    async generatePurchaseOrderPDF(data: Partial<Invoice>, isCustomerPO: boolean = true) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        const seller = data.sellerProfile || COMPANY_DETAILS;
        
        const calculatePOTotals = (order: Partial<Invoice>) => {
            const items = order.items || [];
            const subTotal = items.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice)), 0);
            const taxTotal = items.reduce((sum, p) => sum + (Number(p.quantity) * Number(p.unitPrice) * (Number(p.taxRate) / 100)), 0);
            const freight = Number(order.freightAmount) || 0;
            const freightGst = freight * ((Number(order.freightTaxRate) || 0) / 100);
            const totalWithGst = subTotal + taxTotal;
            const discount = Number(order.discount) || 0;
            const grandTotalRaw = totalWithGst + freight + freightGst - discount;
            let roundOff = 0;
            let grandTotal = grandTotalRaw;
            if (order.isRoundOff) {
                grandTotal = Math.round(grandTotalRaw);
                roundOff = Number((grandTotal - grandTotalRaw).toFixed(2));
            }
            return { subTotal, taxTotal, totalWithGst, discount, freight, freightGst, grandTotal, roundOff, grandTotalRaw };
        };

        const totals = calculatePOTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const colWidth = (pageWidth - 20) / 2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(seller.companyName || seller.name || 'SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(seller.address, pageWidth / 2, 24, { align: 'center' });
        doc.text(`Mob: ${seller.phone}`, pageWidth / 2, 29, { align: 'center' });

        doc.setLineWidth(0.1);
        doc.rect(margin, 34, pageWidth - 20, 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(isCustomerPO ? 'CUSTOMER PURCHASE ORDER' : 'SUPPLIER PURCHASE ORDER', pageWidth / 2, 39.5, { align: 'center' });

        autoTable(doc, {
            startY: 42,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`${isCustomerPO ? 'SMCPO' : 'SMPOC'} NO: ${data.invoiceNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.date)}`],
                [`${isCustomerPO ? 'CPO' : 'VENDOR REF'} NO: ${data.cpoNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.cpoDate)}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 25, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Name of the ${isCustomerPO ? 'Customer' : 'Vendor'} and Address:\n\n${data.customerName || ''}\n${data.customerAddress || ''}`, `${isCustomerPO ? 'Delivery' : 'Dispatch'} Address:\n\n${data.deliveryAddress || data.customerAddress || ''}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`${isCustomerPO ? 'Customer' : 'Vendor'} GST No: ${data.customerGstin || ''}`, `Our GST No: ${COMPANY_DETAILS.gstin}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 7);
        doc.setFont('helvetica', 'bold');
        doc.text('ORDER DETAILS', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4.5, { align: 'center' });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 7,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            head: [['Sl no.', 'Product', 'Qty', 'Rate', 'Amount', 'Gst %', 'Gst value', 'Price with Gst']],
            body: (data.items || []).map((it, idx) => {
                const qty = Number(it.quantity) || 0;
                const price = Number(it.unitPrice) || 0;
                const tax = Number(it.taxRate) || 0;
                const amount = qty * price;
                const gstValue = amount * (tax / 100);
                return [
                    idx + 1, 
                    it.description, 
                    qty, 
                    (Number(price) || 0).toLocaleString('en-IN'), 
                    (Number(amount) || 0).toLocaleString('en-IN'), 
                    `${tax}%`, 
                    (Number(gstValue) || 0).toLocaleString('en-IN'), 
                    (Number(amount + gstValue) || 0).toLocaleString('en-IN')
                ];
            }),
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right', cellWidth: 20 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'center', cellWidth: 12 }, 6: { halign: 'right', cellWidth: 25 }, 7: { halign: 'right', cellWidth: 30 } }
        });

        const totalRows: any[] = [
            [{ content: 'Total', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, { content: (Number(totals.totalWithGst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } as any }]
        ];
        if (totals.freight > 0) {
            totalRows.push(
                [{ content: 'Freight', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, { content: (Number(totals.freight + totals.freightGst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' , textColor: [0, 0, 0] } as any }]
            );
        }
        totalRows.push(
            [{ content: 'Discount/Adjustment', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, { content: (Number(data.discount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' , textColor: [0, 0, 0] } as any }]
        );
        if (data.isRoundOff && totals.roundOff !== 0) {
            totalRows.push(
                [{ content: 'Round Off', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } as any }, { content: (Number(totals.roundOff) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' , textColor: [0, 0, 0] } as any }]
            );
        }
        totalRows.push(
            [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 9 , textColor: [0, 0, 0] } as any }, { content: (Number(totals.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 , textColor: [0, 0, 0] } as any }]
        );

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: totalRows,
            columnStyles: { 0: { cellWidth: pageWidth - 20 - 30 }, 1: { cellWidth: 30 } }
        });

        // Advance Payment details
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Advance Payment details: ${data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString('en-IN')} via ${data.paymentMethod || ''} on ${formatDateDDMMYYYY(data.advanceDate)}` : 'nil'}`]
            ]
        });

        // PAYMENT DETAILS Banner
        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('PAYMENT DETAILS', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4.5, { align: 'center' });

        // Payment Details table (Settlement Matrix)
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 6,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            head: [['Bank and Branch', 'Mode of payment', 'Date', 'Amount']],
            body: [
                [data.bankAndBranch || '---', data.paymentMethod || '---', formatDateDDMMYYYY(data.advanceDate), data.advanceAmount ? `Rs. ${data.advanceAmount.toLocaleString('en-IN')}` : '']
            ],
            columnStyles: { 0: { cellWidth: colWidth * 0.9 }, 1: { cellWidth: colWidth * 0.4, halign: 'center' }, 2: { cellWidth: colWidth * 0.3, halign: 'center' }, 3: { cellWidth: colWidth * 0.4, halign: 'right' } }
        });

        // Delivery time
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Delivery time: ${data.deliveryTime || ''}`]
            ]
        });

        // Special notes
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 15, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Any special note regarding supply, payment terms(to be filled by company personal):\n${data.specialNote || 'Payment will be done on delivery of material.'}`]
            ]
        });

        // Signatures boxes
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 25, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Customer seal and signature:\n\n\n`, `Sreemeditec representative signature:\n\n\nFor SREE MEDITEC\nAuthorised Signatory`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        return doc.output('blob');
    },

    async generateServiceOrderPDF(data: Partial<Invoice>) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        
        const calculateServiceTotals = (order: Partial<Invoice>) => {
            const items = order.items || [];
            const subTotal = items.reduce((sum, p) => sum + (Number(p.quantity || 0) * Number(p.unitPrice || 0)), 0);
            const taxTotal = items.reduce((sum, p) => {
                const itemAmount = Number(p.quantity || 0) * Number(p.unitPrice || 0);
                return sum + (itemAmount * (Number(p.taxRate || 0) / 100));
            }, 0);
            const totalWithGst = subTotal + taxTotal;
            const discount = Number(order.discount || 0);
            const grandTotal = totalWithGst - discount;
            return { subTotal, taxTotal, totalWithGst, discount, grandTotal };
        };

        const totals = calculateServiceTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const colWidth = (pageWidth - 20) / 2;
        const seller = data.sellerProfile || COMPANY_DETAILS;

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(seller.companyName || seller.name || 'SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(seller.address, pageWidth / 2, 24, { align: 'center' });
        doc.text(`Mob: ${seller.phone} | Email: ${seller.email}`, pageWidth / 2, 29, { align: 'center' });

        doc.setLineWidth(0.1);
        doc.rect(margin, 34, pageWidth - 20, 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SERVICE ORDER', pageWidth / 2, 39.5, { align: 'center' });

        // Meta Info Table
        autoTable(doc, {
            startY: 42,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`ORDER NO: ${data.invoiceNumber || ''}`, `DATE: ${formatDateDDMMYYYY(data.date)}`],
                [`VISIT TYPE: ${data.visitType || '---'}`, `PRIORITY: ${data.priority || '---'}`],
                [`DUE DATE: ${formatDateDDMMYYYY(data.expectedResolutionDate)}`, `STATUS: ${data.status || '---'}`]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        // Client & Machine Info Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 40, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [
                    `CUSTOMER DETAILS:\n\n${data.customerHospital || ''}\n${data.customerName || ''}\n${data.customerAddress || ''}\nGST: ${data.customerGstin || ''}\nPhone: ${data.phone || ''}`,
                    `EQUIPMENT DETAILS:\n\nInstrument: ${data.equipmentName || ''}\nModel: ${data.model || ''}\nS/N: ${data.serialNumber || ''}\nDept: ${data.department || '---'}\nLoc: ${data.machineLocation || '---'}\nWarranty: ${data.machineStatus || ''}\nEngineer: ${data.engineerName || ''}\nProblem: ${data.problemReported || ''}`
                ]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - 20, 7);
        doc.setFont('helvetica', 'bold');
        doc.text('ORDER ITEMIZATION', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4.5, { align: 'center' });

        // Items Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 7,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            head: [['Sl no.', 'Description / Spares', 'Qty', 'Rate', 'Taxable', 'Gst %', 'Gst value', 'Amount']],
            body: (data.items || []).map((it, idx) => {
                const qty = Number(it.quantity) || 0;
                const price = Number(it.unitPrice) || 0;
                const tax = Number(it.taxRate) || 0;
                const taxable = qty * price;
                const gstValue = taxable * (tax / 100);
                return [
                    idx + 1,
                    it.description,
                    qty,
                    price.toLocaleString('en-IN'),
                    taxable.toLocaleString('en-IN'),
                    `${tax}%`,
                    gstValue.toLocaleString('en-IN'),
                    (taxable + gstValue).toLocaleString('en-IN')
                ];
            }),
            columnStyles: { 
                0: { halign: 'center', cellWidth: 10 }, 
                2: { halign: 'center', cellWidth: 10 }, 
                3: { halign: 'right', cellWidth: 20 }, 
                4: { halign: 'right', cellWidth: 25 }, 
                5: { halign: 'center', cellWidth: 12 }, 
                6: { halign: 'right', cellWidth: 25 }, 
                7: { halign: 'right', cellWidth: 30 } 
            }
        });

        // Totals Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [{ content: 'Sub-Total (Before Discount)', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } }, { content: (Number(totals.totalWithGst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } }],
                [{ content: 'Adjustments / Discount', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } }, { content: `- ${(Number(data.discount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', textColor: [220, 38, 38] } }],
                [{ content: 'Grand Total (Net Amount)', styles: { fontStyle: 'bold', fontSize: 9 , textColor: [0, 0, 0] } }, { content: (Number(totals.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 , textColor: [0, 0, 0] } }]
            ],
            columnStyles: { 0: { cellWidth: pageWidth - 20 - 40 }, 1: { cellWidth: 40 } }
        });

        // Terms & Notes
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [`Payment Terms: ${data.paymentMethod || ''} | Bank: ${data.paymentBank || data.bankAndBranch || ''}\nAdvance: ₹${(data.advanceAmount || 0).toLocaleString('en-IN')} | Date: ${formatDateDDMMYYYY(data.paymentDate)}`, `Execution Schedule: ${data.deliveryTime || 'As per schedule'}\nWarranty: ${data.warrantyTerms || 'Standard'}`],
                [{ content: `Special Instructions: ${data.specialNote || 'No additional instructions provided.'}`, colSpan: 2, styles: { fontStyle: 'italic' , textColor: [0, 0, 0] } }]
            ],
            columnStyles: { 0: { cellWidth: colWidth }, 1: { cellWidth: colWidth } }
        });

        // Signatures
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Client Acknowledgment', margin, finalY - 20);
        doc.line(margin, finalY - 5, margin + 50, finalY - 5);
        doc.text('Seal & Signature', margin, finalY);

        doc.text(`For ${seller.companyName || seller.name || 'SREE MEDITEC'}`, pageWidth - margin - 50, finalY - 20, { align: 'left' });
        doc.line(pageWidth - margin - 50, finalY - 5, pageWidth - margin, finalY - 5);
        doc.text('Authorised Signatory', pageWidth - margin - 50, finalY);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('This is a computer generated service order and does not require a physical signature unless specified.', pageWidth / 2, pageWidth === 210 ? 285 : doc.internal.pageSize.getHeight() - 10, { align: 'center' });

        return doc.output('blob');
    },

    async generateServiceReportPDF(data: Partial<ServiceReport>) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const seller = data.sellerProfile || COMPANY_DETAILS;
        
        // Custom Colors from Tailwind Config
        const medical600 = [5, 150, 105]; // #059669
        const slate50 = [248, 250, 252]; // #f8fafc
        const slate100 = [241, 245, 249]; // #f1f7f9
        const rose600 = [225, 29, 72]; // #e11d48
        
        // 1. Header Section
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text(seller.companyName || seller.name || 'SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(seller.address, pageWidth / 2, 23, { align: 'center' });
        doc.text(`Mob: ${seller.phone}`, pageWidth / 2, 27, { align: 'center' });
        
        // 2. Service Report Banner
        doc.setLineWidth(0.2);
        doc.setDrawColor(0);
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, 32, pageWidth - (margin * 2), 8, 'FD');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SERVICE REPORT', pageWidth / 2, 37.5, { align: 'center' });

        // 3. Info Grid (5 Columns)
        autoTable(doc, {
            startY: 40,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' , textColor: [0, 0, 0] },
            body: [
                [
                    { content: `Sr No: ${data.reportNumber || ''}`, styles: { textColor: medical600 as any } },
                    { content: `Office: ${data.office || 'Chennai'}`, styles: { fontStyle: 'normal' , textColor: [0, 0, 0] } },
                    { content: `Engineer: ${(data.engineerName || '').toUpperCase()}`, styles: { fontStyle: 'normal' , textColor: [0, 0, 0] } },
                    { content: `Date: ${formatDateDDMMYYYY(data.date)}`, styles: { fontStyle: 'normal' , textColor: [0, 0, 0] } },
                    { content: `Time: ${data.time || ''}`, styles: { fontStyle: 'normal' , textColor: [0, 0, 0] } }
                ]
            ],
            columnStyles: { 
                0: { cellWidth: 38 }, 1: { cellWidth: 30 }, 2: { cellWidth: 45 }, 3: { cellWidth: 35 }, 4: { cellWidth: 'auto' } 
            }
        });

        // 4. Customer & Machine Grid
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' , textColor: [0, 0, 0] },
            body: [
                [
                    { content: `Customer: ${(data.customerName || '').toUpperCase()}` },
                    { content: `Machine: ${(data.equipmentName || '').toUpperCase()}` }
                ]
            ]
        });

        // 5. Address & Machine Status Grid
        const status = data.machineStatus || 'Warranty';
        const checkboxSize = 3;
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [
                    { 
                        content: `Address:\n\n${(data.customerAddress || '').toUpperCase()}`, 
                        styles: { minCellHeight: 25, fontSize: 7.5, fontStyle: 'bold' , textColor: [0, 0, 0] } 
                    },
                    { 
                        content: `Machine Status:\n\n\n\n\n\nSoftware version: ${data.softwareVersion || '---'}`, 
                        styles: { minCellHeight: 25, fontSize: 7.5, fontStyle: 'bold' , textColor: [0, 0, 0] } 
                    }
                ]
            ],
            columnStyles: { 0: { cellWidth: (pageWidth - 20) * 0.5 }, 1: { cellWidth: (pageWidth - 20) * 0.5 } },
            didDrawCell: (dataCell) => {
                if (dataCell.column.index === 1 && dataCell.section === 'body') {
                    const x = dataCell.cell.x + 2;
                    const y = dataCell.cell.y + 8;
                    const options = ['Warranty', 'Out Of Warranty', 'AMC'];
                    
                    doc.setFontSize(7);
                    options.forEach((opt, idx) => {
                        const optX = x + (idx * 30);
                        doc.rect(optX, y, checkboxSize, checkboxSize);
                        if (status === opt) {
                            doc.setFillColor(0, 0, 0);
                            doc.rect(optX + 0.5, y + 0.5, checkboxSize - 1, checkboxSize - 1, 'F');
                        }
                        doc.text(opt, optX + 5, y + 2.5);
                    });
                }
            }
        });

        // 6. Complaint & Observations Grid
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [
                    { 
                        content: `Complaint Summary:\n\n${data.problemReported || '---'}`, 
                        styles: { minCellHeight: 25, fontStyle: 'italic' , textColor: [0, 0, 0] } 
                    },
                    { 
                        content: `Engineer's observations:\n\n${data.engineerObservations || '---'}`, 
                        styles: { minCellHeight: 25, fontStyle: 'italic' , textColor: [0, 0, 0] } 
                    }
                ]
            ],
            head: [[
                { content: 'COMPLAINT SUMMARY', styles: { fontSize: 7, fontStyle: 'bold' , textColor: [0, 0, 0] } },
                { content: "ENGINEER'S OBSERVATIONS", styles: { fontSize: 7, fontStyle: 'bold' , textColor: [0, 0, 0] } }
            ]],
            showHead: 'everyPage' as any
        });

        // 7. PO/WO Number
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' , textColor: [0, 0, 0] },
            body: [
                [`PO/WO Number from Customer:   ${data.poWoNumber || '---'}`]
            ]
        });

        // 8. Action Taken Banner
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, (doc as any).lastAutoTable.finalY, pageWidth - (margin * 2), 7, 'FD');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('ACTION TAKEN BY ENGINEER', pageWidth / 2, (doc as any).lastAutoTable.finalY + 4.5, { align: 'center' });

        // 9. Action Grid
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 7,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                ['Hardware/Spares:', data.actionHardware || '---'],
                ['Operational Fix:', data.actionOperational || '---'],
                ['Software Update:', data.actionSoftware || '---']
            ],
            columnStyles: { 
                0: { cellWidth: 40, fontStyle: 'bold', fillColor: slate50 as any },
                1: { fontStyle: 'normal' }
            }
        });

        // 10. Financial & Remarks Section (Split)
        const sparesSum = (data.itemsUsed || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const pastBal = Number(data.pastBalance) || 0;
        const visitChg = Number(data.visitCharges) || 0;
        const totalRec = pastBal + visitChg + sparesSum;
        const recvd = Number(data.amountReceived) || 0;
        const balance = totalRec - recvd;

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - (margin * 2),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 0, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            body: [
                [
                    { 
                        content: `Follow up / Remarks:\n\n${data.queriesRemarks || '---'}\n\n\n\n\n\n\n\n\nCustomer Signature\n(Seal & Stamp Required)`, 
                        styles: { minCellHeight: 80, halign: 'center', valign: 'bottom', cellPadding: 5, fontStyle: 'italic', fontSize: 7.5 , textColor: [0, 0, 0] } 
                    },
                    {
                        content: '', // Placeholder for the sub-table
                        styles: { minCellHeight: 80, valign: 'top' , textColor: [0, 0, 0] }
                    }
                ]
            ],
            columnStyles: { 0: { cellWidth: (pageWidth - 20) * 0.55 }, 1: { cellWidth: (pageWidth - 20) * 0.45 } },
            didDrawCell: (dataCell) => {
                if (dataCell.column.index === 1 && dataCell.section === 'body') {
                    // Draw the financial sub-table inside this cell manually or using another autoTable
                    autoTable(doc, {
                        startY: dataCell.cell.y,
                        margin: { left: dataCell.cell.x },
                        tableWidth: dataCell.cell.width,
                        theme: 'grid',
                        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                        body: [
                            [{ content: 'Past balance (A):', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } }, { content: pastBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } }],
                            [{ content: 'Visit Charges (B):', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } }, { content: visitChg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } }],
                            [{ content: 'Spares Charges (C):', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } }, { content: sparesSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } }],
                            [{ content: 'Total receivable (A+B+C):', styles: { fontStyle: 'bold', fillColor: slate50 as any , textColor: [0, 0, 0] } }, { content: totalRec.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 10, fillColor: slate50 as any , textColor: [0, 0, 0] } }],
                            [{ content: 'Amount received (D):', styles: { fontStyle: 'bold' , textColor: [0, 0, 0] } }, { content: recvd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', textColor: medical600 as any } }],
                            [{ content: 'Balance (Total-D):', styles: { fontStyle: 'bold', fillColor: slate100 as any , textColor: [0, 0, 0] } }, { content: balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', textColor: rose600 as any, fillColor: slate100 as any } }],
                            [{ content: 'Memo No:', styles: { fontStyle: 'italic' , textColor: [0, 0, 0] } }, { content: data.memoNumber || '---', styles: { halign: 'right', fontStyle: 'bold' , textColor: [0, 0, 0] } }]
                        ]
                    });

                    // Add Engineer Signature area below the sub-table
                    const finalY = (doc as any).lastAutoTable.finalY + 10;
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Engineer Signature', dataCell.cell.x + (dataCell.cell.width / 2), finalY + 15, { align: 'center' });
                    doc.setFontSize(8);
                    doc.setTextColor(PDF_STYLES.colors.medical600[0], PDF_STYLES.colors.medical600[1], PDF_STYLES.colors.medical600[2]);
                    doc.text(`FOR ${seller.companyName || seller.name || 'SREE MEDITEC'}`, dataCell.cell.x + (dataCell.cell.width / 2), finalY + 20, { align: 'center' });
                    doc.setTextColor(0);
                }
            }
        });

        return doc.output('blob');
    },

    async generateDeliveryChallanPDF(data: Partial<DeliveryChallan>) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const midX = pageWidth / 2;
        const seller = data.sellerProfile || COMPANY_DETAILS;

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
        doc.text(seller.companyName || seller.name || 'SREE MEDITEC', margin + 3, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const sellerAddr = doc.splitTextToSize(seller.address, midX - margin - 5);
        doc.text(sellerAddr, margin + 3, 23);
        
        const nextY = 23 + (sellerAddr.length * 4);
        doc.text(`Ph: ${seller.phone}`, margin + 3, nextY);
        doc.text(`GSTIN/UIN: ${seller.gstin}`, margin + 3, nextY + 4);

        // Metadata on right
        const metadataY = 18;
        doc.setFont('helvetica', 'bold');
        doc.text(`Challan No: ${data.challanNumber || ''}`, midX + 3, metadataY);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${formatDateDDMMYYYY(data.date)}`, midX + 3, metadataY + 5);
        doc.text(`Reference: ${data.subject || '---'}`, midX + 3, metadataY + 10);

        doc.line(margin, 40, pageWidth - margin, 40);
        doc.text('Consignee:', margin + 3, 45);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 3, 50);
        doc.setFont('helvetica', 'normal');
        const addr = doc.splitTextToSize(data.customerAddress || '', midX - margin - 5);
        doc.text(addr, margin + 3, 54);

        autoTable(doc, {
            startY: 92,
            margin: { left: margin, right: margin },
            head: [['Sl No.', 'Description of Goods', 'Quantity', 'Unit', 'Remarks']],
            body: (data.items || []).map((it: ChallanItem, idx: number) => [
                idx + 1, 
                it.description, 
                it.quantity, 
                it.unit || 'nos',
                it.remarks || ''
            ]),
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, textColor: [0, 0, 0] },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 30 }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const totalQty = (data.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Quantity: ${totalQty} nos`, margin, finalY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const termsY = finalY + 10;
        doc.text('Terms & Conditions:', margin, termsY);
        doc.text('1. Goods once sold will not be taken back.', margin, termsY + 4);
        doc.text('2. Any discrepancy should be reported within 24 hours.', margin, termsY + 8);
        
        const footerY = termsY + 30;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Receiver\'s Signature', margin, footerY);
        doc.text(`for ${seller.companyName || seller.name || 'SREE MEDITEC'}`, pageWidth - margin - 5, footerY - 15, { align: 'right' });
        doc.text('Authorised Signatory', pageWidth - margin - 5, footerY, { align: 'right' });

        return doc.output('blob');
    },

    async generateInstallationReportPDF(data: any) {
        const doc = new jsPDF();
        doc.setTextColor(0, 0, 0);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const seller = data.sellerProfile || COMPANY_DETAILS;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text(seller.companyName || seller.name || 'SREE MEDITEC', pageWidth / 2, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(seller.address, pageWidth / 2, 32, { align: 'center' });
        doc.text(`Mob: ${seller.phone}`, pageWidth / 2, 38, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(margin, 42, pageWidth - margin, 42);
        doc.text('INSTALLATION REPORT', pageWidth / 2, 50, { align: 'center' });
        doc.line(margin, 54, pageWidth - margin, 54);

        doc.setFontSize(10);
        doc.text(`Report No: ${data.smirNo || '---'}`, margin, 62);
        doc.text(`Date: ${formatDateDDMMYYYY(data.date)}`, pageWidth - margin, 62, { align: 'right' });

        autoTable(doc, {
            startY: 68,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            columnStyles: { 
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fillColor: [245, 245, 245] }, 
                1: { cellWidth: 60, fontStyle: 'bold', fillColor: [245, 245, 245] },
                2: { fontStyle: 'normal' }
            },
            body: [
                ['1', 'Equipment Details', `${data.installationOf || '---'}\nModel: ${data.model || '---'}`],
                ['2', 'Serial Number', data.serialNumber || '---'],
                ['3', 'Software Version', data.softwareVersion || '---'],
                ['4', 'Customer Name', (data.customerName || '').toUpperCase()],
                ['5', 'Hospital / Clinic', data.customerHospital || '---'],
                ['6', 'Address', data.customerAddress || '---'],
                ['7', 'Installation Date', formatDateDDMMYYYY(data.date)],
                ['8', 'Trained Personnel', data.trainedPersons || '---'],
                ['9', 'Working Status', { content: data.status || 'Successfully Installed & Working', styles: { fontStyle: 'bold', textColor: [5, 150, 105] } }],
                ['10', 'Warranty Period', data.warrantyPeriod || '1 Year Standard']
            ]
        });

        const currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('Note: The above equipment has been installed and demonstrated to our satisfaction.', margin, currentY);

        const footerY = currentY + 35;
        doc.setLineWidth(0.1);
        doc.line(margin, footerY - 5, margin + 50, footerY - 5);
        doc.line(pageWidth - margin - 50, footerY - 5, pageWidth - margin, footerY - 5);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Signature & Seal', margin, footerY);
        doc.text('Service Engineer Signature', pageWidth - margin, footerY, { align: 'right' });

        return doc.output('blob');
    }
};
