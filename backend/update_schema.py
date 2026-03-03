import sqlite3
import sys

def update_schema():
    print("Updating schema...")
    try:
        conn = sqlite3.connect('pesantren_local.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE students ADD COLUMN batas_jajan_harian INTEGER DEFAULT 15000")
        conn.commit()
        print("Successfully added batas_jajan_harian")
        conn.close()
    except Exception as e:
        print(f"Error, column likely already exists: {e}")

if __name__ == '__main__':
    update_schema()
