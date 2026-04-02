from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from .. import models, schemas
from ..database import SessionLocal
from ..security import get_password_hash
from ..models import RoleEnum

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Schemas lokal ----
class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: RoleEnum
    email: Optional[str] = None
    is_active: bool = True

class UserUpdateRequest(BaseModel):
    role: Optional[RoleEnum] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordResetRequest(BaseModel):
    new_password: str

class UserOut(BaseModel):
    user_id: int
    username: str
    role: RoleEnum
    email: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# ---- Endpoints ----

@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    """Ambil semua akun pengguna sistem."""
    return db.query(models.User).order_by(models.User.user_id).all()

@router.post("", response_model=UserOut, status_code=201)
def create_user(data: UserCreateRequest, db: Session = Depends(get_db)):
    """Buat akun pengguna baru."""
    existing = db.query(models.User).filter(models.User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username sudah dipakai")
    
    user = models.User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        role=data.role,
        email=data.email if data.email else None,
        is_active=data.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdateRequest, db: Session = Depends(get_db)):
    """Update role, email, atau status aktif pengguna."""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    
    if data.role is not None:
        user.role = data.role
    if data.email is not None:
        user.email = data.email
    if data.is_active is not None:
        user.is_active = data.is_active
    
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/reset-password")
def reset_password(user_id: int, data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Reset password pengguna."""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    
    user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": f"Password untuk '{user.username}' berhasil direset"}

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Hapus akun pengguna."""
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    if user.role == RoleEnum.SUPER_ADMIN:
        # Cek apakah ini satu-satunya super admin
        admin_count = db.query(models.User).filter(
            models.User.role == RoleEnum.SUPER_ADMIN,
            models.User.is_active == True
        ).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Tidak bisa menghapus satu-satunya Super Admin aktif")
    
    db.delete(user)
    db.commit()
    return {"message": f"Akun '{user.username}' berhasil dihapus"}
