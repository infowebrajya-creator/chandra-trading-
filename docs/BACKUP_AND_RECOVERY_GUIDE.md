# WebRajya Billing POS — Backup & Recovery Guide

## 1. Overview & Data Protection Architecture

WebRajya Billing POS employs a **hybrid dual-tier storage strategy** to ensure zero data loss during power outages, internet disconnections, or system failures:

1. **Local Tier (Client Browser - IndexedDB via Dexie)**:
   - Stores active billing session drafts (`db.drafts`), full offline product catalogue (`db.products`), offline saved invoices (`db.invoices`), stock movements (`db.stockMovements`), and audit logs (`db.auditLogs`).
   - Ensures continuous point-of-sale operation even when internet connectivity is completely lost.

2. **Cloud Tier (Supabase PostgreSQL)**:
   - Primary cloud relational database for single-store synchronization.
   - Houses atomic transaction functions (`complete_sale`), row-level locks, stock movement ledgers, and audit logs.

---

## 2. Supabase Cloud PostgreSQL Automated Backup Capabilities

Supabase provides automated database backups based on the project plan:

| Supabase Plan | Backup Mechanism | Retention Period | Point-In-Time-Recovery (PITR) |
| :--- | :--- | :--- | :--- |
| **Free Tier** | Daily Automated Physical Backups (pg_dump / WAL) | 7 Days | Not Available |
| **Pro Plan** | Daily Automated Backups + Daily WAL Archiving | 7 Days (up to 30 days) | Available (Down to the Second) |
| **Enterprise** | Dedicated WAL Archiving & Custom Retention | Custom | Available |

### Supabase Cloud Restoration Steps:
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** -> **Database** -> **Backups**.
3. Under **Daily Backups**, locate the target backup snapshot timestamp.
4. Click **Restore Backup** (or select a specific timestamp if PITR is enabled).
5. Alternatively, perform a manual database restoration via `pg_restore`:
   ```bash
   pg_restore -h db.your-supabase-project.supabase.co -U postgres -d postgres db_backup_file.dump
   ```

---

## 3. Data Export (CSV) vs Full Database Backup

| Feature | CSV Data Export | JSON / DB Snapshot Backup |
| :--- | :--- | :--- |
| **Purpose** | Accounting analysis, Excel reporting, tax filing | Complete system disaster recovery |
| **Contents** | Tabular sheets (Invoices, Items, Payments, Products, Stock Ledgers) | Full relational data schemas & internal keys |
| **Restoration Ability** | Readable in Excel, re-importable via Products Import | Full 1-click database state restoration |

---

## 4. Local Drafts & Offline Recovery

- Unsaved cashier bills are automatically persisted to IndexedDB (`db.keyValueSettings` -> `activeBillingCart`).
- Held bill drafts are saved to `db.drafts`.
- If the browser tab or system reboots unexpectedly, the cashier can restore the exact active cart or draft upon reopening WebRajya POS.

