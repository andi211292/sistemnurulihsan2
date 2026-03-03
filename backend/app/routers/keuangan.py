from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from .. import schemas, crud, models
from ..database import SessionLocal
from ..dependencies import require_role

router = APIRouter(
    prefix="/api/keuangan",
    tags=["Financial Operations"],
    dependencies=[Depends(require_role([models.RoleEnum.KASIR_KOP_PUSAT, models.RoleEnum.KASIR_KOP_LUAR, models.RoleEnum.KASIR_SYAHRIYAH_PUTRA, models.RoleEnum.KASIR_SYAHRIYAH_PUTRI, models.RoleEnum.SUPER_ADMIN]))]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/transaksi", response_model=schemas.TransactionResponse)
def process_transaction(
    request: schemas.TransactionRequest, 
    db: Session = Depends(get_db),
    user_role: models.RoleEnum = Depends(require_role([models.RoleEnum.KASIR_KOP_PUSAT, models.RoleEnum.KASIR_KOP_LUAR]))
):
    # 0. Validate Role for TOPUP
    if request.type == models.TransactionTypeEnum.TOPUP:
        if user_role == models.RoleEnum.KASIR_KOP_LUAR:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kasir Koperasi Luar (Warung) tidak diizinkan melakukan Top-Up saldo E-Money."
            )

    # 1. Get student
    student = crud.get_student_by_rfid(db, rfid_uid=request.rfid_uid)
    if not student:
        raise HTTPException(status_code=404, detail="Kartu RFID tidak terdaftar")

    # 2. Get wallet
    wallet = crud.get_wallet_by_student(db, student_id=student.student_id)

    # 3. Validate Balance for PAYMENT
    if request.type == models.TransactionTypeEnum.PAYMENT and wallet.balance < request.amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Saldo Tidak Mencukupi. Sisa saldo E-Money: Rp {wallet.balance:,.0f}"
        )

    # 4. Create Transaction and Update Wallet
    new_trans = crud.add_transaction(
        db=db,
        wallet=wallet,
        amount=request.amount,
        trans_type=request.type,
        description=request.description
    )

    # Form response manually because TransactionResponse needs current_balance
    return schemas.TransactionResponse(
        transaction_id=new_trans.transaction_id,
        wallet_id=new_trans.wallet_id,
        amount=new_trans.amount,
        type=new_trans.type,
        description=new_trans.description,
        created_at=new_trans.created_at,
        current_balance=wallet.balance
    )


@router.get("/profil/{uid_rfid}", response_model=schemas.StudentFinancialProfile)
def get_financial_profile(uid_rfid: str, db: Session = Depends(get_db)):
    student = crud.get_student_by_rfid(db, rfid_uid=uid_rfid)
    if not student:
        raise HTTPException(status_code=404, detail="Kartu RFID tidak terdaftar")
    wallet = crud.get_wallet_by_student(db, student.student_id)
    return {
        "student": student,
        "balance": wallet.balance
    }

@router.get("/tagihan/rekap", response_model=List[schemas.BillingWithStudentResponse])
def get_billings_recap(month: Optional[str] = None, year: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_billings_by_period(db, month=month, year=year)

@router.get("/tagihan/{uid_rfid}", response_model=List[schemas.BillingResponse])
def get_billings(
    uid_rfid: str, 
    db: Session = Depends(get_db),
    user_role: models.RoleEnum = Depends(require_role([models.RoleEnum.KASIR_SYAHRIYAH_PUTRA, models.RoleEnum.KASIR_SYAHRIYAH_PUTRI, models.RoleEnum.SUPER_ADMIN]))
):
    student = crud.get_student_by_rfid(db, rfid_uid=uid_rfid)
    if not student:
        raise HTTPException(status_code=404, detail="Kartu RFID tidak terdaftar")
        
    # Gender silos for Syahriyah
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRA and student.gender.value != models.GenderEnum.PUTRA.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak: Santri ini terdaftar di cluster Putri.")
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRI and student.gender.value != models.GenderEnum.PUTRI.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak: Santri ini terdaftar di cluster Putra.")
        
    billings = crud.get_student_billings(db, student_id=student.student_id)
    return billings

@router.post("/tagihan", response_model=schemas.BillingResponse)
def create_new_billing(billing: schemas.BillingCreate, db: Session = Depends(get_db)):
    student = crud.get_student_by_rfid(db, rfid_uid=str(billing.student_id))
    # Note: frontend needs to pass the accurate student id, but if we need a workaround for RFID vs ID we can verify.
    # Assuming the input has accurate `student_id`. Let's just verify it exists.
    st = db.query(models.Student).filter(models.Student.student_id == billing.student_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan")
        
    return crud.create_billing(db=db, billing=billing)

@router.post("/tagihan/bulk")
def create_bulk_billings(bulk_request: schemas.BillingBulkCreate, db: Session = Depends(get_db)):
    result = crud.create_bulk_billings(db=db, request=bulk_request)
    return result

@router.post("/tagihan/bayar", response_model=schemas.PaymentTransactionResponse)
def pay_billing(
    payment: schemas.PaymentTransactionCreate, 
    db: Session = Depends(get_db),
    user_role: models.RoleEnum = Depends(require_role([models.RoleEnum.KASIR_SYAHRIYAH_PUTRA, models.RoleEnum.KASIR_SYAHRIYAH_PUTRI, models.RoleEnum.SUPER_ADMIN]))
):
    # Verify billing exists
    billing = db.query(models.Billing).filter(models.Billing.id == payment.billing_id).first()
    if not billing:
        raise HTTPException(status_code=404, detail="Data tagihan tidak ditemukan")
        
    student = db.query(models.Student).filter(models.Student.student_id == billing.student_id).first()
    if student:
        # Gender silos for Syahriyah
        if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRA and student.gender.value != models.GenderEnum.PUTRA.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak: Tagihan milik santri Putri.")
        if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRI and student.gender.value != models.GenderEnum.PUTRI.value:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akses ditolak: Tagihan milik santri Putra.")
        
    new_payment = crud.add_billing_payment(
        db=db, 
        billing_id=payment.billing_id, 
        amount_paid=payment.amount_paid, 
        notes=payment.notes or ""
    )
        
    return new_payment


@router.get("/info-biaya", response_model=List[schemas.AnnouncementResponse])
def get_financial_announcements(db: Session = Depends(get_db)):
    announcements = crud.get_recent_announcements(db)
    return announcements
