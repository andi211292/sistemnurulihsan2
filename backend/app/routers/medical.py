from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models
from ..database import SessionLocal
from ..dependencies import require_role

router = APIRouter(
    prefix="/api/medical",
    tags=["Kesehatan / Medical"],
    dependencies=[Depends(require_role([models.RoleEnum.PENGURUS_SANTRI, models.RoleEnum.GURU_BP, models.RoleEnum.PENGURUS_KEAMANAN, models.RoleEnum.SUPER_ADMIN]))]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[schemas.MedicalRecordDetailResponse])
def get_medical_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(models.MedicalRecord).order_by(models.MedicalRecord.timestamp.desc()).offset(skip).limit(limit).all()
    
    result = []
    for r in records:
        student = db.query(models.Student).filter(models.Student.student_id == r.student_id).first()
        handler = db.query(models.User).filter(models.User.user_id == r.handled_by_user_id).first()
        
        detail = schemas.MedicalRecordDetailResponse(
            medical_id=r.medical_id,
            student_id=r.student_id,
            complaint=r.complaint,
            diagnosis=r.diagnosis,
            medicine_given=r.medicine_given,
            handled_by_user_id=r.handled_by_user_id,
            timestamp=r.timestamp,
            sync_status=r.sync_status,
            student_name=student.full_name if student else "Unknown",
            handler_name=handler.username if handler else "Unknown"
        )
        result.append(detail)
    return result

@router.post("", response_model=schemas.MedicalRecordResponse)
def create_medical_record(
    record: schemas.MedicalRecordCreate,
    db: Session = Depends(get_db)
):
    db_item = models.MedicalRecord(**record.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{medical_id}", response_model=schemas.MedicalRecordResponse)
def update_medical_record(
    medical_id: int,
    record_update: schemas.MedicalRecordUpdate,
    db: Session = Depends(get_db)
):
    db_item = db.query(models.MedicalRecord).filter(models.MedicalRecord.medical_id == medical_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Medical record not found")
    
    if record_update.diagnosis is not None:
        db_item.diagnosis = record_update.diagnosis
    if record_update.medicine_given is not None:
        db_item.medicine_given = record_update.medicine_given
        
    db.commit()
    db.refresh(db_item)
    return db_item

