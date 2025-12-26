# Safe Database Migration Guide

## ⚠️ IMPORTANT: Follow These Steps for Any Schema Changes

Whenever you need to modify the database schema (add/remove columns, change data types, etc.), **always** follow this procedure to preserve user data:

---

## Step-by-Step Migration Process

### 1️⃣ Backup Current Data
**BEFORE making any schema changes**, create a backup:

```bash
python backup_user_data.py
```

This creates a timestamped JSON file like `user_data_backup_20251227_020000.json` containing:
- User accounts (with hashed passwords)
- All subscriptions
- All watchlist items
- User interests and ratings

### 2️⃣ Update the Schema

#### Option A: Add/Modify Column (Preferred)
Use SQLite's `ALTER TABLE` for simple changes:

```python
# Example: patch_db_v5.py
import sqlite3

conn = sqlite3.connect('subscriptions.db')
cursor = conn.cursor()

# Add a new column
cursor.execute("ALTER TABLE table_name ADD COLUMN new_column TEXT DEFAULT 'default_value'")

conn.commit()
conn.close()
```

#### Option B: Recreate Database (Last Resort)
Only if ALTER TABLE won't work:

```bash
# Recreate all tables with new schema
python recreate_db.py

# Re-seed service catalog
python seed_data.py
```

### 3️⃣ Restore User Data
Load the backup to restore all user information:

```bash
python restore_user_data.py user_data_backup_20251227_020000.json
```

### 4️⃣ Verify Everything Works
Check that data was restored correctly:

```bash
python verify_db.py
```

---

## 📋 Quick Reference Commands

```bash
# Full migration workflow
python backup_user_data.py              # 1. Backup
python recreate_db.py                   # 2. Recreate schema
python seed_data.py                     # 3. Seed services
python restore_user_data.py backup.json # 4. Restore users
python verify_db.py                     # 5. Verify
```

---

## 🔐 Backup File Format

Backups are stored as JSON with this structure:

```json
{
  "backup_timestamp": "2025-12-27T02:00:00",
  "users": [
    {
      "email": "user@example.com",
      "hashed_password": "...",
      "is_active": true,
      "country": "IN"
    }
  ],
  "subscriptions": [...],
  "watchlist_items": [...],
  "user_interests": [...]
}
```

## 🚨 Emergency Recovery

If you forgot to backup before a schema change:

1. **Check for automatic backups** in the backend directory
2. If no backup exists, data cannot be recovered
3. Users will need to re-add their subscriptions and watchlist items

---

## ✅ Best Practices

1. **Always backup first** - No exceptions!
2. **Test migrations locally** before production
3. **Keep recent backups** - Don't delete old backup files immediately
4. **Document schema changes** in this file
5. **Use ALTER TABLE** when possible instead of recreating tables

## 📝 Migration History

### 2025-12-27: Added billing_cycle to Plan model
- **Backup**: `user_data_backup_20251227_015430.json`
- **Method**: Full recreation (no data preserved - lesson learned!)
- **Lesson**: Should have used ALTER TABLE or created backup first

---

## 🛠️ Migration Scripts Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `backup_user_data.py` | Create data backup | Before any schema change |
| `restore_user_data.py` | Restore from backup | After schema change |
| `recreate_db.py` | Drop and recreate all tables | Major schema overhaul |
| `patch_db_v*.py` | Incremental schema update | Simple column additions |
| `verify_db.py` | Check database integrity | After any migration |
