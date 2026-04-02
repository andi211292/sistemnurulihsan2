import sys
import os

sys.path.append(r"d:\sistemnurulihsan")
from backend.app.database_cloud import cloud_engine
from sqlalchemy import text

policies = [
    ('student_violations', 'student_violations'),
    ('student_leaves', 'student_leaves'),
    ('medical_records', 'medical_records'),
    ('fee_definitions', 'fee_definitions'),
    ('student_payments', 'student_payments'),
    ('attendances', 'attendances'),
    ('meal_logs', 'meal_logs'),
    ('tahfidz_records', 'tahfidz_records'),
    ('expense_categories', 'expense_categories'),
    ('expenses', 'expenses'),
    ('gallery', 'gallery'),
]

print("Starting RLS configuration...")
try:
    with cloud_engine.begin() as conn:
        for tbl, _ in policies:
            print(f"Executing RLS for {tbl}...")
            try:
                conn.execute(text(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;"))
                conn.execute(text(f"DROP POLICY IF EXISTS \"Enable read access for all users on {tbl}\" ON {tbl};"))
                conn.execute(text(f"CREATE POLICY \"Enable read access for all users on {tbl}\" ON {tbl} FOR SELECT USING (true);"))
                # Crucial to let PostgREST know the schema changed!
                conn.execute(text("NOTIFY pgrst, 'reload schema';"))
                print(f" -> OK: {tbl}")
            except Exception as inner_e:
                print(f" -> SKIP/ERROR for {tbl}: {inner_e}")
    print("SUCCESS")
except Exception as e:
    print("FATAL ERROR:", e)
