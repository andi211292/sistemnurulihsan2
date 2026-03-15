import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
LOCAL_DATABASE_URL = "sqlite:///./pesantren_local.db"

# Target tables to wipe out dummy data. Order matters for SQLite (Child first, then Parent)
TABLES_TO_CLEAR = [
    "payment_transactions",
    "billings",
    "transactions",
    "wallets",
    "medical_records",
    "academic_grades",
    "mutabaah_records",
    "tahfidz_records",
    "attendances",
    "meal_logs",
    "student_violations",
    "student_leaves",
    "student_rankings",
    "gallery_activities",
    "announcements",
    "teacher_attendances",
    "class_schedules",
    "teachers",
    "students",
    "guardians"
]

def clear_local_sqlite():
    print("Clearing LOCAL SQLite Database...")
    engine = create_engine(LOCAL_DATABASE_URL)
    with engine.connect() as conn:
        for table in TABLES_TO_CLEAR:
            try:
                conn.execute(text(f"DELETE FROM {table};"))
                # Reset Auto Increment on SQLite
                conn.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table}';"))
                print(f"  [OK] Local: Cleared {table}")
            except Exception as e:
                print(f"  [SKIP] Local {table}: {e}")
        conn.commit()
    print("Local SQLite Cleanup Completed.\n")

def clear_cloud_postgres():
    print("Clearing CLOUD PostgreSQL Database...")
    if not CLOUD_DATABASE_URL:
        print("  => SKIP: CLOUD_DATABASE_URL is not set.")
        return
    
    engine = create_engine(CLOUD_DATABASE_URL)
    with engine.connect() as conn:
        for table in TABLES_TO_CLEAR:
            try:
                # TRUNCATE CASCADE works well for Postgres to handle Foreign Keys easily and restart sequences
                conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE;"))
                print(f"  [OK] Cloud: Truncated {table}")
            except Exception as e:
                print(f"  [SKIP] Cloud {table}: {e}")
        conn.commit()
    print("Cloud Postgres Cleanup Completed.\n")

if __name__ == "__main__":
    print("WARNING: This script will DELETE ALL DUMMY DATA (Students, Transactions, Absences, etc.)")
    print("But it will KEEP Admin Accounts (`users`), and RFID Settings (`attendance_devices`).\n")
    
    confirm = input("Are you sure you want to proceed? Type 'YES' to continue: ")
    if confirm == 'YES':
        clear_local_sqlite()
        clear_cloud_postgres()
        print("Database Reset Successful! The system is now ready for production.")
    else:
        print("Operation cancelled.")
