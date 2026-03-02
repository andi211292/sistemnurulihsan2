from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from .. import schemas, crud, models
from ..database import SessionLocal

router = APIRouter(
    prefix="/api/rfid",
    tags=["RFID Operations"]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def determine_meal_type():
    hour = datetime.now().hour
    if 5 <= hour < 11:
        return models.MealTypeEnum.PAGI
    elif 11 <= hour < 16:
        return models.MealTypeEnum.SIANG
    else:
        return models.MealTypeEnum.MALAM

@router.post("/tap-makan", response_model=schemas.MealLogResponse)
def rfid_tap_makan(request: schemas.RFIDScanRequest, db: Session = Depends(get_db)):
    # 1. Look up student by RFID
    student = crud.get_student_by_rfid(db, rfid_uid=request.rfid_uid)
    if not student:
        raise HTTPException(status_code=404, detail="Kartu RFID tidak terdaftar")

    # 2. Determine MealType based on current time
    current_meal_type = determine_meal_type()

    # 3. Check if student already took meal for this shift
    existing_log = crud.get_meal_log_today(db, student_id=student.student_id, meal_type=current_meal_type)
    if existing_log:
        raise HTTPException(
            status_code=403, 
            detail=f"Jatah makan {current_meal_type.value} sudah diambil hari ini"
        )

    # 4. Create meal log
    meal_log_data = schemas.MealLogCreate(student_id=student.student_id, meal_type=current_meal_type)
    new_log = crud.create_meal_log(db, meal_log_data)
    
    return new_log

@router.post("/tap-hadir", response_model=schemas.AttendanceResponse)
def rfid_tap_hadir(request: schemas.RFIDAttendanceRequest, db: Session = Depends(get_db)):
    # 1. Look up student
    student = crud.get_student_by_rfid(db, rfid_uid=request.rfid_uid)
    if not student:
        raise HTTPException(status_code=404, detail="Kartu RFID tidak terdaftar")

    # 2. Record attendance
    # Default status present (HADIR) when tapping
    attendance_data = schemas.AttendanceCreate(
        student_id=student.student_id,
        type=request.attendance_type,
        status=models.AttendanceStatusEnum.HADIR
    )
    new_attendance = crud.create_attendance(db, attendance_data)

    return new_attendance

@router.get("/log-terbaru", response_model=schemas.LatestLogsResponse)
def get_latest_rfid_logs(db: Session = Depends(get_db)):
    return crud.get_latest_device_logs(db, limit=5)
