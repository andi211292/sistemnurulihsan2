from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, models
from ..database import SessionLocal

router = APIRouter(
    prefix="/api/academic",
    tags=["Academic & Discipline"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Teacher Endpoints ---

@router.get("/teachers", response_model=List[schemas.TeacherResponse])
def get_teachers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    teachers = db.query(models.Teacher).offset(skip).limit(limit).all()
    return teachers

@router.post("/teachers", response_model=schemas.TeacherResponse)
def create_teacher(teacher: schemas.TeacherCreate, db: Session = Depends(get_db)):
    db_item = models.Teacher(**teacher.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# --- Teacher Attendance Endpoints ---

@router.get("/teacher-attendances", response_model=List[schemas.TeacherAttendanceResponse])
def get_teacher_attendances(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.TeacherAttendance).offset(skip).limit(limit).all()

@router.post("/teacher-attendances", response_model=schemas.TeacherAttendanceResponse)
def create_teacher_attendance(att: schemas.TeacherAttendanceCreate, db: Session = Depends(get_db)):
    db_item = models.TeacherAttendance(**att.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# --- Student Leave Endpoints ---

@router.get("/student-leaves", response_model=List[schemas.StudentLeaveResponse])
def get_student_leaves(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.StudentLeave).order_by(models.StudentLeave.id.desc()).offset(skip).limit(limit).all()

@router.post("/student-leaves", response_model=schemas.StudentLeaveResponse)
def create_student_leave(leave: schemas.StudentLeaveCreate, db: Session = Depends(get_db)):
    db_item = models.StudentLeave(**leave.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/student-leaves/{leave_id}/return")
def mark_student_returned(leave_id: int, db: Session = Depends(get_db)):
    from datetime import datetime
    leave = db.query(models.StudentLeave).filter(models.StudentLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Izin tidak ditemukan")
    
    leave.is_returned = True
    leave.return_timestamp = datetime.utcnow()
    db.commit()
    db.refresh(leave)
    return {"message": "Santri berhasil dilaporkan kembali", "data": leave}

# --- Student Violation Endpoints ---

@router.get("/student-violations", response_model=List[schemas.StudentViolationResponse])
def get_student_violations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.StudentViolation).offset(skip).limit(limit).all()

@router.post("/student-violations", response_model=schemas.StudentViolationResponse)
def create_student_violation(violation: schemas.StudentViolationCreate, db: Session = Depends(get_db)):
    db_item = models.StudentViolation(**violation.model_dump())
    
    # Calculate initial points (simple logic mockup)
    if not violation.points:
         db_item.points = 10 # Default Takzir point
         
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# --- Class Schedule & Empty Class Endpoints ---

@router.get("/schedules", response_model=List[schemas.ClassScheduleResponse])
def get_schedules(day: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.ClassSchedule)
    if day:
        query = query.filter(models.ClassSchedule.day_of_week == day)
    return query.offset(skip).limit(limit).all()

@router.post("/schedules", response_model=schemas.ClassScheduleResponse)
def create_schedule(sched: schemas.ClassScheduleCreate, db: Session = Depends(get_db)):
    db_item = models.ClassSchedule(**sched.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("/empty-classes")
def get_empty_classes(db: Session = Depends(get_db)):
    from datetime import datetime
    import locale

    # Basic mapping map python weekday() to Enum
    days_map = {0: "SENIN", 1: "SELASA", 2: "RABU", 3: "KAMIS", 4: "JUMAT", 5: "SABTU", 6: "AHAD"}
    now = datetime.now()
    today_enum = days_map[now.weekday()]
    today_date = now.date()
    current_time_str = now.strftime("%H:%M")

    # Ambil semua jadwal hari ini
    schedules_today = db.query(models.ClassSchedule).filter(
        models.ClassSchedule.day_of_week == today_enum
    ).all()

    empty_classes = []
    
    for sch in schedules_today:
        # Check if current time is >= start_time
        if current_time_str >= sch.start_time:
            # Check if an attendance record exists for this schedule_id TODAY
            att = db.query(models.TeacherAttendance).filter(
                models.TeacherAttendance.schedule_id == sch.schedule_id,
                models.TeacherAttendance.date == today_date
            ).first()

            if not att or att.status != "HADIR":
                # Guru belum absen atau statusnya selain HADIR -> KELAS KOSONG
                teacher = db.query(models.Teacher).filter(models.Teacher.teacher_id == sch.teacher_id).first()
                empty_classes.append({
                    "schedule_id": sch.schedule_id,
                    "student_class": sch.student_class,
                    "subject": sch.subject,
                    "time": f"{sch.start_time} - {sch.end_time}",
                    "teacher_name": teacher.full_name if teacher else "Unknown",
                    "status": att.status if att else "BELUM ABSEN"
                })

    return empty_classes
