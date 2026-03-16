"""
setup_iuran_db.py
Membuat tabel fee_definitions & student_payments di database lokal (SQLite)
dan cloud (PostgreSQL via Supabase), lalu menyemai data iuran wajib awal.
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
LOCAL_DATABASE_URL  = "sqlite:///./pesantren_local.db"

# ---------- DDL: Cloud PostgreSQL ----------
CLOUD_DDL = [
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feeperiodenum') THEN
            CREATE TYPE feeperiodenum AS ENUM ('BULANAN','SEMESTER','TAHUNAN','INSIDENTAL');
        END IF;
    END $$;
    """,
    """
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'paymentstatusenum') THEN
            CREATE TYPE paymentstatusenum AS ENUM ('LUNAS','DICICIL','BELUM_BAYAR');
        END IF;
    END $$;
    """,
    """
    CREATE TABLE IF NOT EXISTS fee_definitions (
        id           SERIAL PRIMARY KEY,
        nama_iuran   VARCHAR(255) NOT NULL,
        tipe_periode VARCHAR(20) NOT NULL,
        nominal      FLOAT NOT NULL,
        kategori_dana VARCHAR(100),
        is_active    BOOLEAN DEFAULT TRUE,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sync_status  BOOLEAN DEFAULT FALSE
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS student_payments (
        id                  SERIAL PRIMARY KEY,
        student_id          INTEGER REFERENCES students(student_id),
        fee_definition_id   INTEGER REFERENCES fee_definitions(id),
        periode_label       VARCHAR(20),
        tanggal_bayar       DATE,
        nominal_dibayar     FLOAT DEFAULT 0,
        status              VARCHAR(20) DEFAULT 'BELUM_BAYAR',
        catatan             TEXT,
        received_by_user_id INTEGER REFERENCES users(user_id),
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sync_status         BOOLEAN DEFAULT FALSE
    );
    """,
]

# ---------- DDL: Local SQLite ----------
LOCAL_DDL = [
    """
    CREATE TABLE IF NOT EXISTS fee_definitions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_iuran    VARCHAR(255) NOT NULL,
        tipe_periode  VARCHAR(20) NOT NULL,
        nominal       FLOAT NOT NULL,
        kategori_dana VARCHAR(100),
        is_active     INTEGER DEFAULT 1,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sync_status   INTEGER DEFAULT 0
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS student_payments (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id          INTEGER REFERENCES students(student_id),
        fee_definition_id   INTEGER REFERENCES fee_definitions(id),
        periode_label       VARCHAR(20),
        tanggal_bayar       DATE,
        nominal_dibayar     FLOAT DEFAULT 0,
        status              VARCHAR(20) DEFAULT 'BELUM_BAYAR',
        catatan             TEXT,
        received_by_user_id INTEGER REFERENCES users(user_id),
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sync_status         INTEGER DEFAULT 0
    );
    """,
]

# ---------- SEED DATA ----------
SEED_IURAN = [
    ("Makan",          "BULANAN",    250000, "Makan"),
    ("Syahriyah/Gedung","BULANAN",    50000, "Pembangunan"),
    ("PHBI",           "TAHUNAN",   120000, "Kegiatan"),
    ("Haflah",         "TAHUNAN",   100000, "Kegiatan"),
    ("Harlah",         "TAHUNAN",   100000, "Kegiatan"),
    ("Semesteran",     "SEMESTER",  150000, "Kegiatan"),
]

def run_many(engine, statements, db_name):
    with engine.connect() as conn:
        for sql in statements:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  [{db_name}] OK: {sql.strip()[:60]}...")
            except Exception as e:
                print(f"  [{db_name}] SKIP/ERROR: {e}")

def seed_fee_definitions(engine, db_name):
    for (nama, periode, nominal, kategori) in SEED_IURAN:
        # Each row gets its own connection to avoid cascading transaction abort
        with engine.connect() as conn:
            try:
                existing = conn.execute(
                    text("SELECT id FROM fee_definitions WHERE nama_iuran = :n"),
                    {"n": nama}
                ).fetchone()
                if existing:
                    print(f"  [{db_name}] SKIP (already exists): {nama}")
                    continue
                conn.execute(
                    text("""INSERT INTO fee_definitions
                            (nama_iuran, tipe_periode, nominal, kategori_dana, is_active)
                            VALUES (:n, :p, :nom, :k, TRUE)"""),
                    {"n": nama, "p": periode, "nom": nominal, "k": kategori}
                )
                conn.commit()
                print(f"  [{db_name}] SEEDED: {nama} – Rp {nominal:,}")
            except Exception as e:
                print(f"  [{db_name}] SEED ERROR for {nama}: {e}")

print("=== Migrasi Modul Iuran Santri ===\n")

# Local
local_engine = create_engine(LOCAL_DATABASE_URL)
print("[1] Membuat tabel di SQLite lokal...")
run_many(local_engine, LOCAL_DDL, "SQLite")
print("[2] Seed data iuran awal ke SQLite...")
seed_fee_definitions(local_engine, "SQLite")

# Cloud
if CLOUD_DATABASE_URL:
    cloud_engine = create_engine(CLOUD_DATABASE_URL)
    print("\n[3] Membuat tabel di Cloud PostgreSQL...")
    run_many(cloud_engine, CLOUD_DDL, "Postgres")
    print("[4] Seed data iuran awal ke Postgres...")
    seed_fee_definitions(cloud_engine, "Postgres")
else:
    print("\n[SKIP] CLOUD_DATABASE_URL tidak diset, lewati migrasi cloud.")

print("\n=== Selesai! ===")
