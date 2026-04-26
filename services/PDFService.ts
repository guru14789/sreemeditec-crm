import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, ServiceReport, DeliveryChallan, InvoiceItem } from '../types';

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
    const grandTotal = taxableValue + taxTotal;
    const freightTotal = freight + freightTax;
    
    return { taxableValue, taxTotal, cgst, sgst, grandTotal, totalQty, freight, freightTax, itemsTax, freightTotal };
};

export const PDFService = {
    async generateInvoicePDF(data: Partial<Invoice>, isQuotation: boolean = false) {
        const doc = new jsPDF();
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

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('SREE MEDITEC', margin + 2, startY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Old No.2 New No.18, Bajanai Koil Street,', margin + 2, startY + 11);
        doc.text('Rajakilpakkam, Chennai -73', margin + 2, startY + 15);
        doc.text('Ph.9884818398/ 7200025642', margin + 2, startY + 19);
        doc.text('GSTIN/UIN: 33APGPS4675G2ZL', margin + 2, startY + 23);
        doc.text('E-Mail : sreemeditec@gmail.com', margin + 2, startY + 27);

        doc.line(margin, startY + 35, midX, startY + 35);
        doc.setFontSize(7);
        doc.text('Consignee (Ship to)', margin + 2, startY + 39);
        doc.setFont('helvetica', 'bold');
        doc.text(data.customerName || '', margin + 2, startY + 43);
        doc.setFont('helvetica', 'normal');
        const cAddr = doc.splitTextToSize(data.customerAddress || '', midX - margin - 5);
        doc.text(cAddr, margin + 2, startY + 47);
        const cGstY = startY + 47 + (cAddr.length * 3) + 2;
        doc.text(`GSTIN/UIN       : ${data.customerGstin || ''}`, margin + 2, cGstY);

        doc.line(margin, startY + 67, midX, startY + 67);
        doc.text('Buyer (Bill to)', margin + 2, startY + 71);
        doc.setFont('helvetica', 'bold');
        doc.text(data.buyerName || data.customerName || '', margin + 2, startY + 75);
        doc.setFont('helvetica', 'normal');
        const bAddr = doc.splitTextToSize(data.buyerAddress || data.customerAddress || '', midX - margin - 5);
        doc.text(bAddr, margin + 2, startY + 79);
        const bGstY = startY + 79 + (bAddr.length * 3) + 2;
        doc.text(`GSTIN/UIN       : ${data.buyerGstin || data.customerGstin || ''}`, margin + 2, bGstY);
        doc.text('Place of Supply : Tamil Nadu', margin + 2, bGstY + 3);

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
            doc.text(row.l, midX + 1, y + 4);
            doc.text(row.r, innerMid + 1, y + 4);
            doc.setFont('helvetica', 'bold');
            doc.text(row.v || '', midX + 1, y + 9);
            doc.text(row.rv || '', innerMid + 1, y + 9);
            if (i < 6) doc.line(innerMid, y, innerMid, y + 14);
        });

        const itemsBody = (data.items || []).map((it, idx) => {
            const base = it.quantity * it.unitPrice;
            return [
                idx + 1, 
                { content: it.features ? `${it.description}\n${it.features}` : it.description, styles: { fontStyle: 'bold' } as any }, 
                it.hsn || '', 
                `${it.taxRate}%`, 
                `${it.quantity.toFixed(2)} nos`, 
                it.unitPrice.toFixed(2), 
                'nos', 
                '', 
                base.toFixed(2)
            ];
        });

        itemsBody.push(
            ['', { content: 'Freight', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', `${data.freightTaxRate || 0}%`, '', '', '', '', docTotals.freight.toFixed(2)],
            ['', { content: 'Output CGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', docTotals.cgst.toFixed(2)],
            ['', { content: 'Output SGST', styles: { fontStyle: 'italic', textColor: [100, 100, 100] } as any }, '', '', '', '', '', '', docTotals.sgst.toFixed(2)]
        );

        autoTable(doc, {
            startY: startY + totalHeaderH,
            margin: { left: margin, right: margin },
            head: [['Sl\nNo.', 'Description of Goods', 'HSN/SAC', 'GST Rate', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']],
            body: itemsBody,
            foot: [[
                '', 
                { content: 'Total', styles: { halign: 'right', fontStyle: 'bold' } as any }, 
                '', 
                '', 
                { content: `${docTotals.totalQty.toFixed(2)} nos`, styles: { halign: 'center', fontStyle: 'bold' } as any }, 
                '', 
                '', 
                '', 
                { content: `Rs. ${docTotals.grandTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } as any }
            ]],
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center', fontSize: 7, cellPadding: 1 },
            footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 8, cellPadding: 1 },
            styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
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
                ['9402', docTotals.taxableValue.toFixed(2), '9%', docTotals.cgst.toFixed(2), '9%', docTotals.sgst.toFixed(2), (docTotals.cgst + docTotals.sgst).toFixed(2)],
                [{ content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } as any }, { content: docTotals.taxableValue.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any }, '', { content: docTotals.cgst.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any }, '', { content: docTotals.sgst.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any }, { content: (docTotals.cgst + docTotals.sgst).toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } as any }]
            ];

            autoTable(doc, {
                startY: wordsY + 6,
                margin: { left: margin, right: margin },
                head: [
                    [{ content: 'HSN/SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } as any }, { content: 'Taxable\nValue', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } as any }, { content: 'Central Tax', colSpan: 2, styles: { halign: 'center' } as any }, { content: 'State Tax', colSpan: 2, styles: { halign: 'center' } as any }, { content: 'Total\nTax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } as any }],
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
        doc.text('Bank Name', midX + 2, bottomY + 10); doc.text(': KVB Bank', midX + 30, bottomY + 10);
        doc.text('A/c No.', midX + 2, bottomY + 14); doc.text(': 1617135000000754', midX + 30, bottomY + 14);
        doc.text('Branch & IFS Code', midX + 2, bottomY + 18); doc.text(': Selaiyur & KVBL0001617', midX + 30, bottomY + 18);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer\'s Seal and Signature', margin + 2, bottomY + 55);
        doc.text('for SREE MEDITEC', pageWidth - margin - 2, bottomY + 35, { align: 'right' });
        doc.text('Authorised Signatory', pageWidth - margin - 2, bottomY + 55, { align: 'right' });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text(`This is a Computer Generated ${isQuotation ? 'Quotation' : 'Invoice'}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

        return doc.output('blob');
    },

    async generatePurchaseOrderPDF(data: Partial<Invoice>, isCustomerPO: boolean = true) {
        const doc = new jsPDF();
        
        const calculatePOTotals = (order: Partial<Invoice>) => {
            const items = order.items || [];
            const subTotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
            const taxTotal = items.reduce((sum, p) => sum + (p.quantity * p.unitPrice * (p.taxRate / 100)), 0);
            const totalWithGst = subTotal + taxTotal;
            const discount = order.discount || 0;
            const grandTotal = totalWithGst - discount;
            return { subTotal, taxTotal, totalWithGst, discount, grandTotal };
        };

        const totals = calculatePOTotals(data);
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const colWidth = (pageWidth - 20) / 2;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('SREE MEDITEC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 24, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 29, { align: 'center' });

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
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
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
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 25, lineColor: [0, 0, 0], lineWidth: 0.1 },
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
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [`${isCustomerPO ? 'Customer' : 'Vendor'} GST No: ${data.customerGstin || ''}`, `Our GST No: ${data.bankDetails || '33APGPS4675G2ZL'}`]
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
            styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            head: [['Sl no.', 'Product', 'Qty', 'Rate', 'Amount', 'Gst %', 'Gst value', 'Price with Gst']],
            body: (data.items || []).map((it, idx) => {
                const amount = it.quantity * it.unitPrice;
                const gstValue = amount * (it.taxRate / 100);
                return [idx + 1, it.description, it.quantity, it.unitPrice.toLocaleString('en-IN'), amount.toLocaleString('en-IN'), `${it.taxRate}%`, gstValue.toLocaleString('en-IN'), (amount + gstValue).toLocaleString('en-IN')];
            }),
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right', cellWidth: 20 }, 4: { halign: 'right', cellWidth: 25 }, 5: { halign: 'center', cellWidth: 12 }, 6: { halign: 'right', cellWidth: 25 }, 7: { halign: 'right', cellWidth: 30 } }
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY,
            margin: { left: margin },
            tableWidth: pageWidth - 20,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
            body: [
                [{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: totals.totalWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold' } }],
                [{ content: 'Discount/Adjustment', styles: { fontStyle: 'bold' } }, { content: (data.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }],
                [{ content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 9 } }, { content: totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9 } }]
            ],
            columnStyles: { 0: { cellWidth: pageWidth - 20 - 30 }, 1: { cellWidth: 30 } }
        });

        return doc.output('blob');
    },

    async generateServiceReportPDF(data: Partial<ServiceReport>) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('SREE MEDITEC', pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 73.', pageWidth / 2, 20, { align: 'center' });
        doc.text('Ph: 9884818398 / 7200025642 | Email: sreemeditec@gmail.com', pageWidth / 2, 24, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(margin, 28, pageWidth - margin, 28);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('SERVICE REPORT', pageWidth / 2, 34, { align: 'center' });

        autoTable(doc, {
            startY: 38,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            body: [
                [`Report No: ${data.reportNumber || ''}`, `Date: ${formatDateDDMMYYYY(data.date)}`],
                [`Customer: ${data.customerName || ''}`, `Engineer: ${data.engineerName || ''}`],
                [`Equipment: ${data.equipmentName || ''}`, `Problem: ${data.problemReported || 'Standard Service'}`]
            ]
        });

        return doc.output('blob');
    },

    async generateDeliveryChallanPDF(data: Partial<DeliveryChallan>) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const midX = pageWidth / 2;

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
        doc.text('SREE MEDITEC', margin + 2, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Old No.2 New No.18, Bajanai Koil Street, Rajakilpakkam, Chennai -73', margin + 2, 23);

        autoTable(doc, {
            startY: 92,
            margin: { left: margin, right: margin },
            head: [['Sl No.', 'Description', 'Quantity', 'Unit']],
            body: (data.items || []).map((it: any, idx: number) => [idx + 1, it.description, it.quantity, 'nos']),
            theme: 'grid',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: 8 }
        });

        return doc.output('blob');
    },

    async generateInstallationReportPDF(data: any) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('SREE MEDITEC', pageWidth / 2, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('New No: 18, Old No: 2, Bajanai Koil Street, Rajakilpakkam, Chennai - 600 073.', pageWidth / 2, 32, { align: 'center' });
        doc.text('Mob: 9884818398', pageWidth / 2, 38, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('INSTALLATION REPORT', pageWidth / 2, 48, { align: 'center' });

        doc.setFontSize(11);
        doc.text(`SMIR No: ${data.smirNo || ''}`, margin, 58);
        doc.text(`DATE: ${formatDateDDMMYYYY(data.date)}`, pageWidth - margin - 40, 58);

        autoTable(doc, {
            startY: 62,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 70, fontStyle: 'bold' } },
            body: [
                ['1', 'Installation of Equipment', data.installationOf || ''],
                ['2', 'Name of the Customer', data.customerName || ''],
                ['3', 'Hospital/Clinic Name', data.customerHospital || ''],
                ['4', 'Address', data.customerAddress || ''],
                ['5', 'Equipment Serial Number', data.serialNumber || ''],
                ['6', 'Trained Persons', data.trainedPersons || ''],
                ['7', 'Status', data.status || 'Completed']
            ]
        });

        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Signature', margin, finalY);
        doc.text('Engineer Signature', pageWidth - margin - 40, finalY);

        return doc.output('blob');
    }
};
