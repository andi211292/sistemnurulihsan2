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
    # 5. Create medical_records table in Cloud DB
    """
    CREATE TABLE IF NOT EXISTS medical_records (
        medical_id INTEGER PRIMARY KEY,
        student_id INTEGER NOT NULL,
        complaint TEXT NOT NULL,
        diagnosis TEXT,
        medicine_given TEXT,
        handled_by_user_id INTEGER,
        timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sync_status BOOLEAN DEFAULT TRUE
    );
    """
]

print("Starting Cloud Migration for Medical Records...")
for m in migrations:
    run_sql(m)
print("Cloud Migration Finished!")
