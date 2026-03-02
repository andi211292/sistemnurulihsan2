import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Gunakan CLOUD_DATABASE_URL (koneksi ke sisi database Supabase)
db_url = os.environ.get("CLOUD_DATABASE_URL")
if not db_url:
    print("CLOUD_DATABASE_URL is not set!")
    exit(1)

print("Connecting to Supabase Database...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

try:
    print("Enabling RLS and adding SELECT policy for 'students'...")
    cur.execute("ALTER TABLE students ENABLE ROW LEVEL SECURITY;")
    cur.execute("CREATE POLICY \"Enable read access for all users on students\" ON students FOR SELECT USING (true);")
    print("Policy successfully applied to 'students' table.")
except Exception as e:
    print(f"Error applying policy (It might already exist): {e}")
finally:
    cur.close()
    conn.close()
