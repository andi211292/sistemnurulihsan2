"""Script untuk update RFID santri ke format desimal."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def update_rfid():
    db = SessionLocal()
    try:
        # Cari santri berdasarkan nama atau student_id
        student = db.query(models.Student).filter(
            models.Student.student_id == 1
        ).first()
        
        if student:
            old = student.rfid_uid
            student.rfid_uid = "4265130963"
            db.commit()
            print(f"✅ BERHASIL!")
            print(f"   Santri  : {student.full_name}")
            print(f"   RFID lama: {old}")
            print(f"   RFID baru: 4265130963")
        else:
            print("❌ Santri dengan student_id=1 tidak ditemukan")
            # Coba tampilkan daftar santri
            all_students = db.query(models.Student).limit(5).all()
            print("\nDaftar santri yang tersedia:")
            for s in all_students:
                print(f"  ID={s.student_id} | {s.full_name} | RFID: {s.rfid_uid}")
    finally:
        db.close()

if __name__ == "__main__":
    update_rfid()
