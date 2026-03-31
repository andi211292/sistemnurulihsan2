import os
import sys
import psycopg2
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.database import engine, SessionLocal
from app.models import (
    Base, User, RoleEnum, Student, Attendance, StudentLeave, StudentViolation,
    TahfidzRecord, Billing, PaymentTransaction, MedicalRecord, Announcement,
    Teacher, RFIDLog, StudentEMoney, EMoneyTransaction, GalleryActivity,
    ExpenseCategory, Expense, FeePeriodEnum, FeeDefinition, PaymentStatusEnum,
    StudentPayment, StudentRanking
)
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
load_dotenv()
CLOUD_DB_URL = os.getenv("CLOUD_DATABASE_URL")

def get_db():
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        print(f"Error connecting to local DB: {e}")
        return None

def execute_cloud_truncate(tables):
    if not CLOUD_DB_URL:
        print("⚠️ CLOUD_DATABASE_URL tidak ditemukan. Supabase tidak di-reset.")
        return
    try:
        conn = psycopg2.connect(CLOUD_DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        table_str = ", ".join(tables)
        cur.execute(f"TRUNCATE TABLE {table_str} RESTART IDENTITY CASCADE;")
        print(f"✅ Supabase: Tabel {table_str} berhasil dikosongkan.")
    except Exception as e:
        print(f"❌ Gagal reset tabel Supabase: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()
        
def reset_full():
    print("\n⏳ Mereset SELURUH DATABASE (Full)...")
    # Tembak Cloud dulu
    if CLOUD_DB_URL:
        try:
            conn = psycopg2.connect(CLOUD_DB_URL)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("DROP SCHEMA public CASCADE;")
            cur.execute("CREATE SCHEMA public;")
            cur.execute("GRANT ALL ON SCHEMA public TO postgres;")
            cur.execute("GRANT ALL ON SCHEMA public TO public;")
            print("✅ Supabase: Seluruh schema public telah di-reset (Kosong total).")
        except Exception as e:
            print(f"❌ Supabase Full Reset Gagal: {e}")
            
    # Tembak Lokal
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✅ SQLite Lokal: Seluruh tabel dihapus dan dibuat ulang.")
    
    # Bikin admin 
    db = get_db()
    if db:
        try:
            hashed_password = pwd_context.hash("admin123")
            admin_user = User(
                username="admin", password=hashed_password,
                full_name="Administrator Sistem", role=RoleEnum.SUPER_ADMIN,
            )
            db.add(admin_user)
            db.commit()
            print("✅ Akun Admin bawaan (admin / admin123) telah dipulihkan.")
        finally:
            db.close()

def reset_partial(menu_name, local_models, cloud_tables):
    print(f"\n⏳ Mereset {menu_name}...")
    
    # 1. Reset Supabase (Cloud)
    if cloud_tables:
        execute_cloud_truncate(cloud_tables)
        
    # 2. Reset Local
    db = get_db()
    if db:
        try:
            for model in reversed(local_models): # Reverse untuk hindari foreign key conflict
                db.query(model).delete()
            db.commit()
            print(f"✅ SQLite Lokal: Data {menu_name} berhasil dikosongkan.")
        except Exception as e:
            db.rollback()
            print(f"❌ SQLite Lokal Gagal direst: {e}")
        finally:
            db.close()

def main():
    while True:
        print("\n=======================================================")
        print("          ALAT RESET DATA PESANTREN NURUL IHSAN          ")
        print("=======================================================")
        print("1. [BAHAYA] Reset TOTAL (Semua Data Hilang, Kembali ke Nol)")
        print("2. Reset Modul Iuran Baru (Hapus Master Iuran & Semua Tagihan)")
        print("3. Reset Modul Keuangan Lama (Hapus Syahriyah Lama & Pengeluaran)")
        print("4. Reset Modul Absensi & Perizinan (Hapus Log Kehadiran Santri)")
        print("5. Reset Modul Kesehatan (Hapus Rekam Medis)")
        print("6. Reset Poin Pelanggaran & Kedisiplinan")
        print("7. 🚪 KELUAR")
        print("=======================================================")
        
        pilihan = input("Pilih menu (1-7): ")
        
        if pilihan == '7':
            print("Membatalkan & Keluar.")
            break
            
        elif pilihan == '1':
            konf = input("Ketik 'YAKIN' untuk mereset seluruh database: ")
            if konf == 'YAKIN': reset_full()
            else: print("Aksi dibatalkan.")
            
        elif pilihan == '2':
            konf = input("Ketik 'YAKIN' untuk reset tagihan & iuran: ")
            if konf == 'YAKIN': 
                reset_partial("Modul Iuran Baru", 
                    [StudentPayment, FeeDefinition], 
                    ["student_payments", "fee_definitions"])
                    
        elif pilihan == '3':
            konf = input("Ketik 'YAKIN' untuk reset data syahriyah lama & pengeluaran: ")
            if konf == 'YAKIN': 
                reset_partial("Keuangan Lama", 
                    [PaymentTransaction, Billing, Expense, ExpenseCategory], 
                    ["payment_transactions", "billings", "expenses", "expense_categories"])
                    
        elif pilihan == '4':
            konf = input("Ketik 'YAKIN' untuk reset absen & izin: ")
            if konf == 'YAKIN': 
                reset_partial("Absensi & Perizinan", 
                    [Attendance, StudentLeave, RFIDLog], 
                    ["attendances", "student_leaves", "rfid_logs"])
                    
        elif pilihan == '5':
            konf = input("Ketik 'YAKIN' untuk reset kesehatan: ")
            if konf == 'YAKIN': 
                reset_partial("Kesehatan", 
                    [MedicalRecord], 
                    ["medical_records"])
                    
        elif pilihan == '6':
            konf = input("Ketik 'YAKIN' untuk reset pelanggaran: ")
            if konf == 'YAKIN': 
                reset_partial("Pelanggaran & Disiplin", 
                    [StudentViolation], 
                    ["student_violations"])
        else:
            print("Pilihan tidak valid.")

if __name__ == "__main__":
    main()
