import sqlite3
import os

def fix_db():
    dir_path = os.path.dirname(__file__)
    possible_paths = [
        os.path.join(dir_path, 'pesantren_local.db'),
        os.path.join(dir_path, 'data', 'database.db'),
        os.path.join(dir_path, 'pesantren.db'),
        'pesantren_local.db'
    ]
    
    db_path = None
    for p in possible_paths:
        if os.path.exists(p):
            db_path = p
            break
            
    if not db_path:
        print(f"ERROR FATAL: File database SQLite tidak ditemukan sama sekali di dalam folder ini!")
        return
        
    print(f"Database ditemukan di: {db_path}")
    
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
