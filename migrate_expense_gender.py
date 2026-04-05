import sqlite3

try:
    print("Connecting to DB...")
    conn = sqlite3.connect('database.db', timeout=5.0)
    cursor = conn.cursor()
    print("Checking if column exists...")
    cursor.execute("PRAGMA table_info(expenses)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'gender_scope' not in columns:
        print("Column gender_scope NOT FOUND! Adding it...")
        conn.execute('ALTER TABLE expenses ADD COLUMN gender_scope VARCHAR(10);')
        print("Column added successfully!")
    else:
        print("Column gender_scope already exists.")
        
    conn.commit()
except sqlite3.OperationalError as e:
    print(f"Database Error (might be locked by backend): {e}")
except Exception as e:
    print(f"Error: {e}")
finally:
    try:
        conn.close()
    except:
        pass
    print("Done")
