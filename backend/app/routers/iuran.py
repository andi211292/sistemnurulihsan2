from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import calendar

from .. import schemas, models
from ..database import SessionLocal
from ..dependencies import require_role, get_current_user_payload

router = APIRouter(
    prefix="/api/iuran",
    tags=["Iuran Santri"],
    dependencies=[Depends(require_role([
        models.RoleEnum.SUPER_ADMIN,
        models.RoleEnum.KASIR_SYAHRIYAH_PUTRA,
        models.RoleEnum.KASIR_SYAHRIYAH_PUTRI,
        models.RoleEnum.KASIR_KOP_PUSAT,
        models.RoleEnum.PENGURUS_SANTRI,
    ]))]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ============================================================
# FEE DEFINITION ENDPOINTS
# ============================================================

@router.get("/definitions", response_model=List[schemas.FeeDefinitionResponse])
def get_fee_definitions(active_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.FeeDefinition)
    if active_only:
        query = query.filter(models.FeeDefinition.is_active == True)
    return query.order_by(models.FeeDefinition.tipe_periode, models.FeeDefinition.nama_iuran).all()

@router.post("/definitions", response_model=schemas.FeeDefinitionResponse)
def create_fee_definition(
    fee: schemas.FeeDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    existing = db.query(models.FeeDefinition).filter(
        models.FeeDefinition.nama_iuran == fee.nama_iuran
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Iuran dengan nama ini sudah ada.")
    db_fee = models.FeeDefinition(**fee.model_dump())
    db.add(db_fee)
    db.commit()
    db.refresh(db_fee)
    return db_fee

@router.put("/definitions/{fee_id}", response_model=schemas.FeeDefinitionResponse)
def update_fee_definition(
    fee_id: int,
    update_data: schemas.FeeDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    db_fee = db.query(models.FeeDefinition).filter(models.FeeDefinition.id == fee_id).first()
    if not db_fee:
        raise HTTPException(status_code=404, detail="Definisi iuran tidak ditemukan.")
    for key, value in update_data.model_dump(exclude_none=True).items():
        setattr(db_fee, key, value)
    db_fee.sync_status = False  # Mark for re-sync after update
    db.commit()
    db.refresh(db_fee)
    return db_fee

# ============================================================
# STUDENT PAYMENT ENDPOINTS
# ============================================================

@router.get("/payments", response_model=List[schemas.StudentPaymentResponse])
def get_student_payments(student_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.StudentPayment)
    if student_id:
        query = query.filter(models.StudentPayment.student_id == student_id)
    payments = query.order_by(models.StudentPayment.created_at.desc()).all()
    for p in payments:
        p.fee_definition = db.query(models.FeeDefinition).filter(
            models.FeeDefinition.id == p.fee_definition_id
        ).first()
        if p.received_by_user_id:
            user = db.query(models.User).filter(models.User.user_id == p.received_by_user_id).first()
            p.receiver_name = user.username if user else "Admin"
    return payments

@router.post("/payments", response_model=schemas.StudentPaymentResponse)
def create_student_payment(
    payment: schemas.StudentPaymentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    user_id = current_user.get("user_id")
    db_payment = models.StudentPayment(
        **payment.model_dump(),
        received_by_user_id=user_id
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    # Attach nested data for response
    db_payment.fee_definition = db.query(models.FeeDefinition).filter(
        models.FeeDefinition.id == db_payment.fee_definition_id
    ).first()
    if user_id:
        user = db.query(models.User).filter(models.User.user_id == user_id).first()
        db_payment.receiver_name = user.username if user else "Admin"
    return db_payment

@router.delete("/payments/{payment_id}")
def delete_student_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    db_payment = db.query(models.StudentPayment).filter(models.StudentPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan.")
    db.delete(db_payment)
    db.commit()
    return {"message": "Pembayaran berhasil dihapus."}

# ============================================================
# TUNGGAKAN / STATUS IURAN ENDPOINT
# ============================================================

def _get_current_periode_label(tipe: str) -> str:
    """Hitung label periode berjalan berdasarkan tipe iuran."""
    now = datetime.now()
    if tipe == "BULANAN":
        return f"{now.year}-{now.month:02d}"
    elif tipe == "SEMESTER":
        sem = 1 if now.month <= 6 else 2
        return f"{now.year}-S{sem}"
    elif tipe in ("TAHUNAN", "INSIDENTAL"):
        return str(now.year)
    return str(now.year)

@router.get("/status/{student_id}", response_model=List[schemas.FeeStatusItem])
def get_student_fee_status(student_id: int, db: Session = Depends(get_db)):
    """
    Mengembalikan daftar status iuran aktif untuk santri pada periode berjalan.
    Setiap item menunjukkan apakah iuran sudah LUNAS, DICICIL, atau BELUM_BAYAR.
    """
    # Pastikan santri ada
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan.")

    active_fees = db.query(models.FeeDefinition).filter(
        models.FeeDefinition.is_active == True
    ).all()

    result = []
    for fee in active_fees:
        periode_label = _get_current_periode_label(fee.tipe_periode.value)

        # Cari payment record untuk iuran + periode + santri ini
        payment = db.query(models.StudentPayment).filter(
            models.StudentPayment.student_id == student_id,
            models.StudentPayment.fee_definition_id == fee.id,
            models.StudentPayment.periode_label == periode_label
        ).first()

        if payment:
            sisa = max(0.0, fee.nominal - payment.nominal_dibayar)
            status = payment.status
            nominal_dibayar = payment.nominal_dibayar
            tanggal_bayar = payment.tanggal_bayar
            payment_id = payment.id
        else:
            sisa = fee.nominal
            status = models.PaymentStatusEnum.BELUM_BAYAR
            nominal_dibayar = 0.0
            tanggal_bayar = None
            payment_id = None

        result.append(schemas.FeeStatusItem(
            fee_definition=schemas.FeeDefinitionResponse.model_validate(fee),
            periode_label=periode_label,
            status=status,
            nominal_dibayar=nominal_dibayar,
            nominal_tagihan=fee.nominal,
            sisa_tagihan=sisa,
            tanggal_bayar=tanggal_bayar,
            payment_id=payment_id,
        ))

    return result
