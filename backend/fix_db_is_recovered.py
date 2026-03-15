import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
LOCAL_DATABASE_URL = "sqlite:///./pesantren_local.db"

cloud_engine = create_engine(CLOUD_DATABASE_URL)
local_engine = create_engine(LOCAL_DATABASE_URL)

def run_sql(engine, sql, db_name):
    with engine.connect() as conn:
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"[{db_name}] Executed: {sql[:50]}...")
        except Exception as e:
            print(f"[{db_name}] Error executing SQL (might already exist): {e}")

# 1. Update Cloud DB
run_sql(cloud_engine, "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS is_recovered BOOLEAN DEFAULT FALSE;", "Cloud")

# 2. Update Local SQLite DB
# SQLite doesn't directly support IF NOT EXISTS in ALTER TABLE ADD COLUMN in some older versions,
# but we can try-catch it silently.
run_sql(local_engine, "ALTER TABLE medical_records ADD COLUMN is_recovered BOOLEAN DEFAULT 0;", "Local")

print("Migration Finished!")
