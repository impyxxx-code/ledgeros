-- ============================================================================
-- CANONICALIZE_BANK_TRANSFER.sql
-- Fix payment-method fragmentation: legacy 'bank_transfer' -> canonical 'bank'
--
-- Context: the mobile "Mark as Paid" sheet used to store method = 'bank_transfer',
-- while the entire rest of LedgerOS (BankingPage tiles, dashboards, reports,
-- CustomerStatement, InvoiceModal) uses 'bank'. Rows written as 'bank_transfer'
-- were therefore invisible in every bank-payment total.
--
-- The code fix (option value bank_transfer -> bank) stops NEW fragmentation.
-- This script cleans up EXISTING rows in both affected tables.
--
-- Safe to run more than once (idempotent). Read-only preview first, then migrate.
-- Run the whole file in the Supabase SQL editor.
-- ============================================================================

-- 1) PREVIEW — how many rows are affected (run this alone first if you like)
SELECT 'invoices.payment_method' AS location, count(*) AS rows_to_fix
FROM invoices        WHERE payment_method = 'bank_transfer'
UNION ALL
SELECT 'invoice_payments.method', count(*)
FROM invoice_payments WHERE method = 'bank_transfer';

-- 2) MIGRATE — canonicalize to 'bank'
UPDATE invoices
   SET payment_method = 'bank'
 WHERE payment_method = 'bank_transfer';

UPDATE invoice_payments
   SET method = 'bank'
 WHERE method = 'bank_transfer';

-- 3) VERIFY — both counts must return 0 after the migration
SELECT 'invoices.payment_method' AS location, count(*) AS remaining_bank_transfer
FROM invoices        WHERE payment_method = 'bank_transfer'
UNION ALL
SELECT 'invoice_payments.method', count(*)
FROM invoice_payments WHERE method = 'bank_transfer';

-- 4) OPTIONAL — full method distribution after migration (sanity check the vocabulary)
SELECT 'invoices' AS tbl, coalesce(payment_method,'(null)') AS method, count(*)
FROM invoices GROUP BY payment_method
UNION ALL
SELECT 'invoice_payments', coalesce(method,'(null)'), count(*)
FROM invoice_payments GROUP BY method
ORDER BY tbl, method;
