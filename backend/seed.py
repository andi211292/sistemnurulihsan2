import json
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, schemas, crud

# Pastikan semua tabel sudah dibuat (jika belum, ini akan membuatnya)
models.Base.metadata.create_all(bind=engine)

def seed_database():
    print("Mulai proses seeding data...")
    db = SessionLocal()
    try:
        # Data dummy santri sesuai instruksi
        dummy_students = [
            {"nama": "Ahmad", "uid": "KARTU-001", "kelas": "1 Ula", "saldo": 50000},
            {"nama": "Budi", "uid": "KARTU-002", "kelas": "1 Ula", "saldo": 25000},
            {"nama": "Hasan", "uid": "KARTU-003", "kelas": "2 Wustha", "saldo": 100000},
            {"nama": "Fatimah", "uid": "KARTU-004", "kelas": "1 Ula", "saldo": 75000},
            {"nama": "Aisyah", "uid": "KARTU-005", "kelas": "3 Ulya", "saldo": 30000},
        ]

        for s in dummy_students:
            # 1. Cek apakah santri ini sudah ada (mencegah duplikat saat dijalankan ulang)
            existing_student = db.query(models.Student).filter(models.Student.rfid_uid == s['uid']).first()
            if existing_student:
                print(f"Melewati {s['nama']} (UID: {s['uid']}) - sudah ada di database.")
                continue
            
            # 2. Buat data Santri
            new_student = models.Student(
                nis=f"NIS-{s['uid'].split('-')[1]}", # Generate NIS simpel
                rfid_uid=s['uid'],
                full_name=s['nama'],
                student_class=s['kelas'],
                dormitory="Asrama Pusat"
            )
            db.add(new_student)
            db.commit()
            db.refresh(new_student)

            # 3. Buat dompet (Wallet) untuk santri tersebut dengan saldo awal
            new_wallet = models.Wallet(
                student_id=new_student.student_id,
                balance=s['saldo']
            )
            db.add(new_wallet)
            db.commit()

            print(f"Berhasil menambahkan: {s['nama']} | UID: {s['uid']} | Saldo Awal: Rp {s['saldo']}")

        print("\nSeeding selesai sukses! Terdapat 5 data awal.")

    except Exception as e:
        print(f"Terjadi kesalahan saat seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
