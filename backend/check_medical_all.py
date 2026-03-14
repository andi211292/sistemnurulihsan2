from app.database import SessionLocal
from app.models import MedicalRecord

db = SessionLocal()
records = db.query(MedicalRecord).all()
print('All Medical Records:')
for r in records[-5:]:
    print(f"ID: {r.medical_id}, Student ID: {r.student_id}, Date: {r.timestamp}, Complaint: {r.complaint}, Sync: {r.sync_status}")
db.close()
