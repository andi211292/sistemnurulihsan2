import sys
import os

sys.path.append(r"d:\sistemnurulihsan")
from backend.app.database_cloud import cloud_engine
from sqlalchemy import text, inspect

print("Fixing Supabase API Permissions (GRANTs)...")
try:
    with cloud_engine.begin() as conn:
        inspector = inspect(cloud_engine)
        tables = inspector.get_table_names()
        
        for tbl in tables:
            print(f"Granting API access to {tbl}...")
            conn.execute(text(f"GRANT ALL ON TABLE {tbl} TO anon, authenticated, service_role;"))
            
        print("Granting sequence usage...")
        conn.execute(text("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;"))
        
        print("Reloading PostgREST schema cache...")
        conn.execute(text("NOTIFY pgrst, 'reload schema';"))
        print("SUCCESS: All tables are now fully exposed to the Data API!")
except Exception as e:
    print("FATAL ERROR:", e)
