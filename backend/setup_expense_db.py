import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
CLOUD_DATABASE_URL = os.getenv("CLOUD_DATABASE_URL")
LOCAL_DATABASE_URL = "sqlite:///./pesantren_local.db"

cloud_engine = create_engine(CLOUD_DATABASE_URL) if CLOUD_DATABASE_URL else None
local_engine = create_engine(LOCAL_DATABASE_URL)

expense_categories_sql = """
CREATE TABLE IF NOT EXISTS expense_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    frequency VARCHAR(50) DEFAULT 'INSIDENTAL',
    is_active BOOLEAN DEFAULT TRUE,
    sync_status BOOLEAN DEFAULT FALSE
);
"""

expenses_sql = """
CREATE TABLE IF NOT EXISTS expenses (
    expense_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES expense_categories(category_id),
    amount FLOAT NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    recorded_by_user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status BOOLEAN DEFAULT FALSE
);
"""

expense_categories_sqlite = """
CREATE TABLE IF NOT EXISTS expense_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,
    frequency VARCHAR(50) DEFAULT 'INSIDENTAL',
    is_active BOOLEAN DEFAULT 1,
    sync_status BOOLEAN DEFAULT 0
);
"""

expenses_sqlite = """
CREATE TABLE IF NOT EXISTS expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES expense_categories(category_id),
    amount FLOAT NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    recorded_by_user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status BOOLEAN DEFAULT 0
);
"""

def run_sql(engine, sqls, db_name):
    with engine.connect() as conn:
        for sql in sqls:
            try:
                conn.execute(text(sql))
                conn.commit()
                # Print just a snippet of SQL applied for clarity
                print(f"[{db_name}] Executed SQL successfully.")
            except Exception as e:
                print(f"[{db_name}] Error executing SQL: {e}")

print("Running Migrations for Expense Module...")

# 1. Update Cloud DB
if cloud_engine:
    run_sql(cloud_engine, [expense_categories_sql, expenses_sql], "Cloud Postgres")
else:
    print("Skipping Cloud Postgres (URL not set in .env)")

# 2. Update Local SQLite DB
run_sql(local_engine, [expense_categories_sqlite, expenses_sqlite], "Local SQLite")

print("Migration Finished!")
