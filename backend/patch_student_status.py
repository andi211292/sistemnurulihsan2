import sqlite3
import os

def patch_db():
    db_path = "pesantren_local.db"
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add the 'status' column to 'students' table with a default value of 'AKTIF'
        cursor.execute("ALTER TABLE students ADD COLUMN status VARCHAR(20) DEFAULT 'AKTIF'")
        conn.commit()
        print("Success: 'status' column added to 'students' table.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Info: 'status' column already exists in 'students' table.")
        else:
            print("Error adding column:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    patch_db()
