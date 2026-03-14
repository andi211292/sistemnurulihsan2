from app.database import SessionLocal
from app.models import Student, MedicalRecord

db = SessionLocal()
student = db.query(Student).filter(Student.nis == '1111').first()
if student:
    print(f"Student ID: {student.student_id}")
    records = db.query(MedicalRecord).filter(MedicalRecord.student_id == student.student_id).all()
    print("Records:")
    for r in records:
        print(f" - Date: {r.timestamp}, Complaint: {r.complaint}, Sync: {r.sync_status}")
else:
    print("Student NIS 1111 not found.")
db.close()
