from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, models
from ..database import SessionLocal
from ..dependencies import require_role

import os
import shutil
import uuid

router = APIRouter(
    prefix="/api/gallery",
    tags=["Galeri Kegiatan"],
    dependencies=[Depends(require_role([models.RoleEnum.PENGURUS_SANTRI, models.RoleEnum.PENGURUS_SEKOLAH, models.RoleEnum.SUPER_ADMIN]))]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Directory parameter for static files if no Supabase Storage configured yet
UPLOAD_DIR = "uploads/gallery"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=List[schemas.GalleryResponse])
def get_gallery(category: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.GalleryActivity)
    if category:
        query = query.filter(models.GalleryActivity.category == category)
        
    records = query.order_by(models.GalleryActivity.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for r in records:
        handler = db.query(models.User).filter(models.User.user_id == r.uploaded_by_user_id).first()
        res = schemas.GalleryResponse(
            gallery_id=r.gallery_id,
            title=r.title,
            url=r.url,
            category=r.category,
            uploaded_by_user_id=r.uploaded_by_user_id,
            created_at=r.created_at,
            uploader_name=handler.username if handler else "Unknown"
        )
        result.append(res)
        
    return result

@router.post("", response_model=schemas.GalleryResponse)
def create_gallery_item(
    item: schemas.GalleryCreate,
    db: Session = Depends(get_db)
):
    # This endpoint is for direct URL submission (e.g., from external hosting)
    db_item = models.GalleryActivity(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # We cheat a bit since we just created it, no uploader join needed for simple return
    res = schemas.GalleryResponse(
        gallery_id=db_item.gallery_id,
        title=db_item.title,
        url=db_item.url,
        category=db_item.category,
        uploaded_by_user_id=db_item.uploaded_by_user_id,
        created_at=db_item.created_at,
        uploader_name="Just Uploaded" 
    )
    return res

@router.delete("/{gallery_id}")
def delete_gallery_item(
    gallery_id: int,
    db: Session = Depends(get_db)
):
    db_item = db.query(models.GalleryActivity).filter(models.GalleryActivity.gallery_id == gallery_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    # Optional: Delete file if it's locally hosted in uploads/gallery
    if "uploads/gallery" in db_item.url:
        try:
            filename = db_item.url.split("/")[-1]
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            print(f"Failed to delete local image: {e}")

    db.delete(db_item)
    db.commit()
    return {"message": "Foto berhasil dihapus"}

