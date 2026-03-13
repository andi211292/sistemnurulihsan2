from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models
from ..database import SessionLocal
from ..dependencies import require_role

router = APIRouter(
    prefix="/api/ranking",
    tags=["Ranking Santri"],
    dependencies=[Depends(require_role([models.RoleEnum.PENGURUS_SANTRI, models.RoleEnum.GURU_BP, models.RoleEnum.PENGURUS_SEKOLAH, models.RoleEnum.SUPER_ADMIN]))]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.StudentRankingDetailResponse])
def get_rankings(month: str = None, year: str = None, category: str = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.StudentRanking)
    if month: query = query.filter(models.StudentRanking.month == month)
    if year: query = query.filter(models.StudentRanking.year == year)
    if category: query = query.filter(models.StudentRanking.category == category)
    
    records = query.order_by(models.StudentRanking.position.asc()).offset(skip).limit(limit).all()
    
    result = []
    for r in records:
        student = db.query(models.Student).filter(models.Student.student_id == r.student_id).first()
        detail = schemas.StudentRankingDetailResponse(
            ranking_id=r.ranking_id,
            student_id=r.student_id,
            category=r.category,
            position=r.position,
            month=r.month,
            year=r.year,
            notes=r.notes,
            created_by_user_id=r.created_by_user_id,
            created_at=r.created_at,
            student_name=student.full_name if student else "Unknown",
            student_class=student.student_class if student else "Unknown"
        )
        result.append(detail)
    return result

@router.post("/", response_model=schemas.StudentRankingResponse)
def create_ranking(
    record: schemas.StudentRankingCreate,
    db: Session = Depends(get_db)
):
    # Check if a ranking for this category/month/year/position already exists
    existing = db.query(models.StudentRanking).filter(
        models.StudentRanking.category == record.category,
        models.StudentRanking.month == record.month,
        models.StudentRanking.year == record.year,
        models.StudentRanking.position == record.position
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Posisi juara {record.position} untuk kategori {record.category} bulan {record.month}/{record.year} sudah terisi.")
        
    db_item = models.StudentRanking(**record.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{ranking_id}")
def delete_ranking(
    ranking_id: int,
    db: Session = Depends(get_db)
):
    db_item = db.query(models.StudentRanking).filter(models.StudentRanking.ranking_id == ranking_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Ranking not found")
        
    db.delete(db_item)
    db.commit()
    return {"message": "Ranking berhasil dihapus"}

