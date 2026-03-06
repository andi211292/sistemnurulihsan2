"""
Migrasi SQLite — Tambah kolom baru untuk fitur Absensi Multi-Lokasi
Jalankan sekali: python migrate_absensi.py
"""
import sqlite3
import os

# Path database SQLite lokal
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pesantren_local.db")
print(f"Database: {db_path}")

conn = sqlite3.connect(db_path, timeout=10)
cursor = conn.cursor()

migrations = [
    # Students — kolom baru
    "ALTER TABLE students ADD COLUMN kelas_sekolah INTEGER",
    "ALTER TABLE students ADD COLUMN tingkatan_diniyah TEXT",
    # Attendances — kolom baru
    "ALTER TABLE attendances ADD COLUMN device_id TEXT",
    "ALTER TABLE attendances ADD COLUMN sesi TEXT",
    # Tabel baru attendance_devices
    """CREATE TABLE IF NOT EXISTS attendance_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        nama_lokasi TEXT,
        tipe_sesi TEXT,
        jam_mulai INTEGER DEFAULT 0,
        jam_selesai INTEGER DEFAULT 23,
        is_active INTEGER DEFAULT 1
    )""",
    # Update AttendanceTypeEnum — SQLite tidak perlu alter enum, kolom pakai TEXT
]

for sql in migrations:
    try:
        cursor.execute(sql)
        print(f"✅ OK: {sql[:60]}...")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e) or "already exists" in str(e):
            print(f"⏩ Sudah ada, skip: {str(e)}")
        else:
            print(f"❌ Error: {e}")

conn.commit()
conn.close()
print("\n✅ Migrasi selesai!")
