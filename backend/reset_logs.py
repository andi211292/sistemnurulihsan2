import os
import sqlite3
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# --- 1. Reset Local SQLite DB ---
print("Resetting Local RFID Logs (pesantren_local.db)...")
try:
    local_conn = sqlite3.connect("pesantren_local.db")
    local_cur = local_conn.cursor()
    
    # Hapus data log RFID dari tabel yang benar
    local_cur.execute("DELETE FROM attendances;")
    local_cur.execute("DELETE FROM meal_logs;")
    local_conn.commit()
    print("✅ Local RFID Logs Reset Successful.")
except Exception as e:
    print(f"❌ Error resetting local rfid logs: {e}")
finally:
    if 'local_conn' in locals():
        local_conn.close()

# --- 2. Reset Cloud Supabase DB ---
print("\nResetting Cloud Supabase RFID Logs...")
db_url = os.environ.get("CLOUD_DATABASE_URL")

if not db_url:
    print("❌ CLOUD_DATABASE_URL is not set! Skipping Supabase reset.")
else:
    try:
        cloud_conn = psycopg2.connect(db_url)
        cloud_conn.autocommit = True
        cloud_cur = cloud_conn.cursor()
        
        # Hapus data log RFID di awan dari tabel yang benar
        try:
           cloud_cur.execute("DELETE FROM attendances;")
        except Exception:
           pass
           
        try:
           cloud_cur.execute("DELETE FROM meal_logs;")
        except Exception:
           pass
        
        print("✅ Cloud RFID Logs Reset Successful.")
    except Exception as e:
        print(f"❌ Error resetting cloud rfid logs: {e}")
    finally:
        if 'cloud_conn' in locals():
            cloud_cur.close()
            cloud_conn.close()

print("\n🎉 Semua aktivitas pemantauan (Live Monitor RFID) telah di-reset secara tuntas.")
