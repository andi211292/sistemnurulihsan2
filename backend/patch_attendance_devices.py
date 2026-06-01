import sqlite3

def patch_db():
    db_path = "pesantren_local.db"
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Altering table attendance_devices...")
        cursor.execute("ALTER TABLE attendance_devices ADD COLUMN allowed_classes VARCHAR")
        print("Success: added allowed_classes column.")
    except sqlite3.OperationalError as e:
        print(f"OperationalError: {e} (Column might already exist)")
    except Exception as e:
        print(f"Error: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    patch_db()
