from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from contextlib import asynccontextmanager
import asyncio

from . import models, schemas, crud
from . routers import rfid, tahfidz, keuangan, academic
from .database import engine, SessionLocal
from .services import sync_worker

from fastapi.middleware.cors import CORSMiddleware

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch Background Task for Cloud Sync
    sync_task = asyncio.create_task(sync_worker.start_sync_worker())
    yield
    # Shutdown: Cleanly cancel background tasks
    sync_task.cancel()

app = FastAPI(
    title="Sistem Manajemen Pondok Pesantren Nurul Ihsan",
    description="API untuk Local Server Pesantren",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Welcome to Pesantren Nurul Ihsan Local API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/users/", response_model=schemas.UserResponse, tags=["Users"])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

@app.get("/api/students/", response_model=List[schemas.StudentResponse], tags=["Students"])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    students = crud.get_students(db, skip=skip, limit=limit)
    return students

@app.post("/api/students/", response_model=schemas.StudentResponse, tags=["Students"])
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db)):
    return crud.create_student(db=db, student=student)

@app.post("/api/students/bulk", tags=["Students"])
def create_students_bulk(students: List[schemas.StudentCreate], db: Session = Depends(get_db)):
    try:
        result = crud.bulk_upsert_students(db=db, students=students)
        return {"message": "Import massal berhasil", "data": result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Gagal import massal: {str(e)}")

@app.delete("/api/students/{student_id}", tags=["Students"])
def delete_student_api(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    try:
        db.delete(student)
        db.commit()
        return {"message": "Santri berhasil dihapus"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Gagal menghapus santri. Hapus data terkait terlebih dahulu.")

@app.put("/api/students/{student_id}", response_model=schemas.StudentResponse, tags=["Students"])
def update_student(student_id: int, student_data: schemas.StudentCreate, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    for key, value in student_data.model_dump().items():
        setattr(student, key, value)
        
    db.commit()
    db.refresh(student)
    return student

app.include_router(rfid.router)
app.include_router(tahfidz.router)
app.include_router(keuangan.router)
app.include_router(academic.router)
