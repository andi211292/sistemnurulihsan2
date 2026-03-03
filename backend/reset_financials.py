import os
import sqlite3
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# --- 1. Reset Local SQLite DB ---
print("Resetting Local SQLite Database (pesantren_local.db)...")
try:
    local_conn = sqlite3.connect("pesantren_local.db")
    local_cur = local_conn.cursor()
    
    # Hapus data transaksi dan tagihan
    local_cur.execute("DELETE FROM payment_transactions;")
    local_cur.execute("DELETE FROM billings;")
    local_cur.execute("DELETE FROM transactions;") # e-money transactions (pastikan nama tabelnya transactions)
    
    # Reset saldo emoney menjadi 0 di tabel wallets (bukan students)
    local_cur.execute("UPDATE wallets SET balance = 0.0;")
    local_conn.commit()
    print("✅ Local Database Reset Successful.")
except Exception as e:
    print(f"❌ Error resetting local database: {e}")
finally:
    if 'local_conn' in locals():
        local_conn.close()

# --- 2. Reset Cloud Supabase DB ---
print("\nResetting Cloud Supabase Database...")
db_url = os.environ.get("CLOUD_DATABASE_URL")

if not db_url:
    print("❌ CLOUD_DATABASE_URL is not set! Skipping Supabase reset.")
else:
    try:
        cloud_conn = psycopg2.connect(db_url)
        cloud_conn.autocommit = True
        cloud_cur = cloud_conn.cursor()
        
        # Di Supabase mungkin nama tabel transaksi disamakan atau tidak disinkronisasi,
        # tapi tagihan dan pembayarannya disinkronisasi.
        cloud_cur.execute("DELETE FROM payment_transactions;")
        cloud_cur.execute("DELETE FROM billings;")
        
        try:
           cloud_cur.execute("DELETE FROM transactions;") 
        except Exception:
           pass 
        
        # Di Supabase, emoney_balance ada di tabel students (disinkronisasi dari relasi wallets lokal)
        cloud_cur.execute("UPDATE students SET emoney_balance = 0.0;")
        
        print("✅ Cloud Database Reset Successful.")
    except Exception as e:
        print(f"❌ Error resetting cloud database: {e}")
    finally:
        if 'cloud_conn' in locals():
            cloud_cur.close()
            cloud_conn.close()

print("\n🎉 Semua data keuangan (Tagihan, Transaksi, Saldo E-Money) berhasil dikosongkan untuk santri yang sudah ada.")
