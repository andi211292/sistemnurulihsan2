import sqlite3

def patch_db():
    db_path = "pesantren_local.db"
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Altering table attendance_device_sesi...")
        cursor.execute("ALTER TABLE attendance_device_sesi ADD COLUMN allowed_classes VARCHAR")
        print("Success: added allowed_classes column to attendance_device_sesi.")
    except sqlite3.OperationalError as e:
        print(f"OperationalError (column might already exist): {e}")
    except Exception as e:
        print(f"Error: {e}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    patch_db()
