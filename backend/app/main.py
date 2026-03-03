from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
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

@app.post("/api/students/import_csv", tags=["Students"])
async def import_students_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        import io
        import csv
        
        # Decode CSV content
        decoded_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded_content))
        
        students_payload = []
        for row in csv_reader:
            # Menggunakan ignore-case lookup untuk flexible headers
            row_lower = {k.strip().lower(): v for k, v in row.items() if k is not None}
            
            nis = row_lower.get('nis')
            full_name = row_lower.get('nama lengkap')
            student_class = row_lower.get('kelas')
            dormitory = row_lower.get('asrama')
            gender = row_lower.get('gender')
            rfid_uid = row_lower.get('uid_rfid')
            
            if nis and full_name and student_class and dormitory:
                if gender:
                    gender = gender.strip().upper()
                    if gender not in ['PUTRA', 'PUTRI']:
                        gender = 'PUTRA'
                else:
                    gender = 'PUTRA'
                
                rfid_uid_val = str(rfid_uid).strip() if (rfid_uid and str(rfid_uid).strip().lower() != 'none') else None
                
                st = schemas.StudentCreate(
                    nis=str(nis).strip(),
                    full_name=str(full_name).strip(),
                    student_class=str(student_class).strip(),
                    dormitory=str(dormitory).strip(),
                    gender=gender,
                    rfid_uid=rfid_uid_val
                )
                students_payload.append(st)
                
        if not students_payload:
            raise HTTPException(status_code=400, detail="Tidak ada data valid yang bisa diimport. Cek format header CSV.")
            
        result = crud.bulk_upsert_students(db=db, students=students_payload)
        return {"message": "Import massal CSV berhasil", "data": result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Gagal memproses file CSV: {str(e)}")

@app.post("/api/students/import_excel", tags=["Students"])
async def import_students_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = await file.read()
        import io
        import openpyxl
        
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        ws = wb.active
        
        students_payload = []
        headers = []
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:
                headers = [str(cell).strip().lower() if cell is not None else '' for cell in row]
                continue
                
            row_dict = {}
            for j, cell_val in enumerate(row):
                if j < len(headers) and headers[j]:
                    val_str = str(cell_val).strip() if cell_val is not None else None
                    if val_str == "None":
                       val_str = None
                    row_dict[headers[j]] = val_str
                    
            nis = row_dict.get('nis')
            full_name = row_dict.get('nama lengkap')
            student_class = row_dict.get('kelas')
            dormitory = row_dict.get('asrama')
            gender = row_dict.get('gender')
            rfid_uid = row_dict.get('uid_rfid')
            
            if nis and full_name and student_class and dormitory:
                if gender:
                    gender = gender.upper()
                    if gender not in ['PUTRA', 'PUTRI']:
                        gender = 'PUTRA'
                else:
                    gender = 'PUTRA'
                    
                st = schemas.StudentCreate(
                    nis=nis,
                    full_name=full_name,
                    student_class=student_class,
                    dormitory=dormitory,
                    gender=gender,
                    rfid_uid=rfid_uid
                )
                students_payload.append(st)
                
        if not students_payload:
            raise HTTPException(status_code=400, detail="Tidak ada data valid yang bisa diimport. Cek format header Excel.")
            
        result = crud.bulk_upsert_students(db=db, students=students_payload)
        return {"message": "Import massal Excel berhasil", "data": result}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Gagal memproses file Excel: {str(e)}")

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
