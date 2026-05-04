
import { Ledger, AccountingVoucher } from '../types';

export class TallyService {
  /**
   * Generates Tally-compatible XML for Ledgers (Masters)
   */
  static generateLedgerXML(ledgers: Ledger[]): string {
    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    ledgers.forEach(ledger => {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <LEDGER NAME="${ledger.name}" RESERVEDNAME="">\n`;
      xml += `            <NAME.LIST>\n              <NAME>${ledger.name}</NAME>\n            </NAME.LIST>\n`;
      xml += `            <PARENT>${this.mapToTallyGroup(ledger.groupId)}</PARENT>\n`;
      xml += `            <OPENINGBALANCE>${ledger.openingBalance > 0 ? `-${ledger.openingBalance}` : Math.abs(ledger.openingBalance)}</OPENINGBALANCE>\n`;
      xml += `            <ISBILLWISEON>Yes</ISBILLWISEON>\n`;
      xml += `            <LEDGERMOBILE>${ledger.phone || ''}</LEDGERMOBILE>\n`;
      xml += `            <LEDGERCONTACT>${ledger.name}</LEDGERCONTACT>\n`;
      xml += `            <EMAIL>${ledger.email || ''}</EMAIL>\n`;
      xml += `            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>\n`;
      xml += `            <PARTYGSTIN>${ledger.gstin || ''}</PARTYGSTIN>\n`;
      xml += `          </LEDGER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    });

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  }

  /**
   * Generates Tally-compatible XML for Vouchers
   */
  static generateVoucherXML(vouchers: AccountingVoucher[]): string {
    let xml = `<?xml version="1.0"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    vouchers.forEach(v => {
      const tallyVchType = this.mapToTallyVoucherType(v.type);
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `          <VOUCHER VCHTYPE="${tallyVchType}" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
      xml += `            <DATE>${v.date.replace(/-/g, '')}</DATE>\n`;
      xml += `            <VOUCHERTYPENAME>${tallyVchType}</VOUCHERTYPENAME>\n`;
      xml += `            <VOUCHERNUMBER>${v.voucherNumber}</VOUCHERNUMBER>\n`;
      xml += `            <NARRATION>${v.narration}</NARRATION>\n`;
      
      v.entries.forEach(entry => {
        const amount = entry.debit > 0 ? -entry.debit : entry.credit;
        xml += `            <ALLLEDGERENTRIES.LIST>\n`;
        xml += `              <LEDGERNAME>${entry.ledgerName}</LEDGERNAME>\n`;
        xml += `              <ISDEEMEDPOSITIVE>${entry.debit > 0 ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>\n`;
        xml += `              <AMOUNT>${amount}</AMOUNT>\n`;
        xml += `            </ALLLEDGERENTRIES.LIST>\n`;
      });

      xml += `          </VOUCHER>\n`;
      xml += `        </TALLYMESSAGE>\n`;
    });

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    return xml;
  }

  private static mapToTallyGroup(groupId: string): string {
    const maps: { [key: string]: string } = {
      'GRP-CASH': 'Cash-in-Hand',
      'GRP-BANK': 'Bank Accounts',
      'GRP-DEBTORS': 'Sundry Debtors',
      'GRP-CREDITORS': 'Sundry Creditors',
      'GRP-REVENUE': 'Sales Accounts',
      'GRP-EXPENSE': 'Indirect Expenses',
      'GRP-ASSET': 'Fixed Assets',
      'GRP-LIABILITY': 'Current Liabilities'
    };
    return maps[groupId] || 'Suspense Account';
  }

  private static mapToTallyVoucherType(type: string): string {
    const maps: { [key: string]: string } = {
      'Sales': 'Sales',
      'Purchase': 'Purchase',
      'Payment': 'Payment',
      'Receipt': 'Receipt',
      'Contra': 'Contra',
      'Journal': 'Journal',
      'Debit Note': 'Debit Note',
      'Credit Note': 'Credit Note'
    };
    return maps[type] || 'Journal';
  }
}
