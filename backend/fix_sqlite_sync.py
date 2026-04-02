import sqlite3
import os

def fix_db():
    db_path = os.path.join(os.path.dirname(__file__), 'data', 'database.db')
    if not os.path.exists(db_path):
        print(f"File tidak ditemukan di {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute('UPDATE student_payments SET sync_status = 0 WHERE sync_status IS NULL')
        p_count = cur.rowcount
        cur.execute('UPDATE student_leaves SET sync_status = 0 WHERE sync_status IS NULL')
        l_count = cur.rowcount
        
        conn.commit()
        conn.close()
        print(f"Sukses BONGKAR MESIN SQLITE: {p_count} Tagihan & {l_count} Perizinan berhasil diantrikan ke jalur Sync.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
