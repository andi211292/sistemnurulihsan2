from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from .. import schemas, crud, models
from ..database import SessionLocal

router = APIRouter(
    prefix="/api/tahfidz",
    tags=["Tahfidz Operations"]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/scan/{uid_rfid}", response_model=schemas.TahfidzStudentProfile)
def get_tahfidz_profile_by_rfid(uid_rfid: str, db: Session = Depends(get_db)):
    # 1. Look up student by RFID
    student = crud.get_student_by_rfid(db, rfid_uid=uid_rfid)
    if not student:
        raise HTTPException(status_code=404, detail="Kartu RFID tidak terdaftar")
    
    # 2. Get recent records (max 5)
    recent_records = crud.get_recent_tahfidz_records(db, student_id=student.student_id, limit=5)
    
    # 3. Return combined profile data
    return schemas.TahfidzStudentProfile(
        student=schemas.StudentResponse.model_validate(student),
        recent_records=[schemas.TahfidzRecordResponse.model_validate(rec) for rec in recent_records]
    )


@router.post("/input", response_model=schemas.TahfidzRecordResponse)
def input_tahfidz_record(record_in: schemas.TahfidzRecordCreate, db: Session = Depends(get_db)):
    # Validate the student exists
    student = db.query(models.Student).filter(models.Student.student_id == record_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan")
        
    return crud.create_tahfidz_record(db, record_in)
