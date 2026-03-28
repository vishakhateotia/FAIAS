"""
Run this once to add the access_requests table to your faias.db
Usage: python migrate_db.py
"""

import sqlite3

DB_PATH = "/Users/vindhayteotia/Downloads/aura-secure-dashboard/faias.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# access_requests table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS access_requests (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        image_path  TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
""")

conn.commit()
conn.close()

print("Migration complete: access_requests table ready.")