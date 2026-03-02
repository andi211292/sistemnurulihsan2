import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

db_url = os.environ.get("CLOUD_DATABASE_URL")
if not db_url:
    print("CLOUD_DATABASE_URL is not set!")
    exit(1)

print("Connecting to Supabase Database...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

try:
    print("Adding 'emoney_balance' column to 'students' table...")
    cur.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS emoney_balance FLOAT DEFAULT 0.0;")
    print("Column 'emoney_balance' successfully added.")
except Exception as e:
    print(f"Error adding column: {e}")
finally:
    cur.close()
    conn.close()
