import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")

if not CLOUD_DATABASE_URL:
    print("Error: CLOUD_DATABASE_URL not found in .env")
    exit(1)

engine = create_engine(CLOUD_DATABASE_URL)

def run_sql(sql):
    with engine.connect() as conn:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"Executed: {sql[:50]}...")
        except Exception as e:
            print(f"Error executing SQL: {e}")

migrations = [
    # 1. Add missing columns to student_leaves
    "ALTER TABLE student_leaves ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT FALSE",
    "ALTER TABLE student_leaves ADD COLUMN IF NOT EXISTS return_timestamp TIMESTAMP",
    "ALTER TABLE student_leaves ADD COLUMN IF NOT EXISTS start_time VARCHAR",
    "ALTER TABLE student_leaves ADD COLUMN IF NOT EXISTS end_time VARCHAR",
    "ALTER TABLE student_leaves ADD COLUMN IF NOT EXISTS sync_status BOOLEAN DEFAULT FALSE",
    
    # 2. Update StudentLeaveReasonEnum (PostgreSQL type is usually lowercase)
    "ALTER TYPE studentleavereasonenum ADD VALUE IF NOT EXISTS 'IZIN_KELUAR'",
    "ALTER TYPE studentleavereasonenum ADD VALUE IF NOT EXISTS 'PULANG'",
    
    # 3. Update AttendanceTypeEnum (ensure all values exist)
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'SHALAT_SUBUH'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'SHALAT_DZUHUR'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'SHALAT_ASHAR'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'SHALAT_MAGHRIB'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'SHALAT_ISYA'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'SEKOLAH_PAGI'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'DINIYAH_SORE'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'KLASIKAL'",
    "ALTER TYPE attendancetypeenum ADD VALUE IF NOT EXISTS 'MALAM_KAMAR'",
    
    # 4. Add sync_status to student_violations if missing
    "ALTER TABLE student_violations ADD COLUMN IF NOT EXISTS sync_status BOOLEAN DEFAULT FALSE"
]

print("Starting Cloud Migration...")
for m in migrations:
    run_sql(m)
print("Cloud Migration Finished!")
