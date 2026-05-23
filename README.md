# Event-Driven Accounting

Accounting entries are now auto-generated from business events, eliminating manual journal entry for standard flows.

## Auto-Generated Entries

| Event | Voucher Type | Entries | Location |
|---|---|---|---|
| **Invoice finalized** (status ≠ Draft/Cancelled) | Sales | Debtor (customer ledger) Dr., Sales Account Cr., Output CGST Cr., Output SGST Cr. | `addInvoice` → `postToLedger` |
| **Invoice marked Paid** | Receipt | Bank A/c Dr., Debtor (customer ledger) Cr. | `updateInvoice` → `postToLedger` |
| **Invoice cancelled** | (reversal) | Existing vouchers auto-reversed via `reverseVoucher` | `updateInvoice` → `reverseVoucher` |
| **Purchase record created** | Purchase | Purchase A/c Dr., Creditor (supplier ledger) Cr. | `addPurchaseRecord` → `postToLedger` |
| **Expense approved** | Payment | Expense ledger Dr., Cash/Bank Cr. | `ExpenseModule.handleApprove` → `postToLedger` |

## Auto-Created Ledgers

Customer and supplier ledgers are created on first use via `ensurePartyLedger`:
- **Debtors** → `GRP-DEBTORS` group (for invoice customers)
- **Creditors** → `GRP-CREDTIORS` group (for purchase suppliers)

Contact details (GSTIN, email, phone) are synced from the source document.

## Design Decisions

- Stock impact is handled by **BillingModule** (already existing) — not duplicated in accounting
- Auto-generated vouchers use **real ledger IDs** (not empty strings) so balances update correctly
- All failures are **logged and warned** — never silently swallowed
- The **Voucher Terminal** still allows manual override for non-standard scenarios

## Remaining Items

| Priority | Item |
|---|---|
| **Medium** | 5. Stats cards use hardcoded group IDs (`GRP-CASH`, `GRP-DEBTORS`, `GRP-CREDITORS`) — custom groups invisible |
| **Low** | 8. Tally export group mappings hardcoded — unknown groups fall back to "Suspense Account" |
