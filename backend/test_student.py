from app import models, schemas, crud
from app.database import SessionLocal

db = SessionLocal()

student_data = {
    "nis": "3333",
    "rfid_uid": "3333",
    "full_name": "fulan",
    "student_class": "al imrithi",
    "kelas_sekolah": 8,
    "tingkatan_diniyah": "Imrithi",
    "dormitory": "putra selatan",
    "gender": "PUTRA",
    "batas_jajan_harian": 15000
}

try:
    st = schemas.StudentCreate(**student_data)
    created = crud.create_student(db, st)
    print("Success:", created.student_id)
except Exception as e:
    print("Error:", str(e))

