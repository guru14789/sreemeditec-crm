
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { ExpenseRecord } from '../types';

export class Archiver {
  /**
   * Converts a list of objects to a CSV string.
   */
  static toCSV(data: any[]): string {
    if (!data.length) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n');
    return `${headers}\n${rows}`;
  }

  /**
   * Archives monthly expenses to Firestore as a CSV blob.
   */
  static async archiveMonthlyExpenses(monthId: string, expenses: ExpenseRecord[]): Promise<void> {
    const csvContent = this.toCSV(expenses);
    await setDoc(doc(db, "archived_reports", `EXPENSES-${monthId}`), {
      type: 'monthly_expenses',
      monthId,
      csvContent,
      timestamp: new Date().toISOString(),
      recordCount: expenses.length
    });
  }

  /**
   * Consolidates all monthly CSVs of a financial year into one.
   * Format: FY-2025-26
   */
  static async consolidateAnnualReport(fyId: string): Promise<void> {
    const reportsRef = collection(db, "archived_reports");
    const q = query(reportsRef, where("type", "==", "monthly_expenses"));
    const snap = await getDocs(q);
    
    // Filter for months belonging to this FY (April to March)
    // FY 2025-26 starts 2025-04 and ends 2026-03
    const [startYear, endYearSuffix] = fyId.replace('FY-', '').split('-');
    const fullEndYear = `20${endYearSuffix}`;
    
    const monthlyDocs = snap.docs.filter(d => {
      const mId = d.data().monthId; // YYYY-MM
      return (mId >= `${startYear}-04` && mId <= `${fullEndYear}-03`);
    });

    if (monthlyDocs.length === 0) return;

    let headers = "";
    let combinedRows = "";

    monthlyDocs.sort((a, b) => a.data().monthId.localeCompare(b.data().monthId)).forEach((doc, idx) => {
      const lines = doc.data().csvContent.split('\n');
      if (idx === 0) headers = lines[0];
      combinedRows += lines.slice(1).join('\n') + '\n';
    });

    const annualCSV = `${headers}\n${combinedRows.trim()}`;
    await setDoc(doc(db, "archived_reports", `ANNUAL-${fyId}`), {
      type: 'annual_expenses',
      fyId,
      csvContent: annualCSV,
      timestamp: new Date().toISOString(),
      monthsIncluded: monthlyDocs.map(d => d.data().monthId)
    });
  }

  /**
   * Resets operational data for the new financial year.
   * CRITICAL: Use only after archival.
   */
  static async performFinancialYearReset(): Promise<void> {
    const batch = writeBatch(db);
    const collectionsToReset = [
      "invoices", 
      "expenses", 
      "stockMovements", 
      "leads", 
      "tasks", 
      "attendance",
      "serviceTickets",
      "serviceReports",
      "installationReports"
    ];

    for (const colName of collectionsToReset) {
      const snap = await getDocs(collection(db, colName));
      snap.forEach(d => batch.delete(d.ref));
    }
    
    await batch.commit();
  }
}
