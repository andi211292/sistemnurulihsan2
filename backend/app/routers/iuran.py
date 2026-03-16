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

# ============================================================
# LAPORAN ENDPOINTS
# ============================================================

@router.get("/laporan/bulanan")
def laporan_bulanan(
    periode: Optional[str] = None,
    fee_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Rekap bulanan: untuk setiap iuran aktif, tampilkan siapa sudah dan belum bayar.
    Parameter `periode` format: 2026-03 (BULANAN), 2026-S1 (SEMESTER), 2026 (TAHUNAN).
    Jika tidak disediakan, pakai periode berjalan.
    """
    now = datetime.now()

    active_fees = db.query(models.FeeDefinition).filter(models.FeeDefinition.is_active == True).all()
    if fee_id:
        active_fees = [f for f in active_fees if f.id == fee_id]

    all_students = db.query(models.Student).filter(models.Student.is_active == True).all()

    result = []
    for fee in active_fees:
        if not periode:
            p_label = _get_current_periode_label(fee.tipe_periode.value)
        else:
            p_label = periode

        # Ambil semua pembayaran untuk iuran + periode ini
        payments = db.query(models.StudentPayment).filter(
            models.StudentPayment.fee_definition_id == fee.id,
            models.StudentPayment.periode_label == p_label
        ).all()

        paid_ids = {p.student_id: p for p in payments}

        sudah_bayar = []
        belum_bayar = []

        for st in all_students:
            if st.student_id in paid_ids:
                p = paid_ids[st.student_id]
                sudah_bayar.append({
                    "student_id": st.student_id,
                    "nis": st.nis,
                    "full_name": st.full_name,
                    "student_class": st.student_class,
                    "dormitory": st.dormitory,
                    "gender": getattr(st, "gender", "-"),
                    "nominal_dibayar": p.nominal_dibayar,
                    "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                    "tanggal_bayar": str(p.tanggal_bayar) if p.tanggal_bayar else None,
                })
            else:
                belum_bayar.append({
                    "student_id": st.student_id,
                    "nis": st.nis,
                    "full_name": st.full_name,
                    "student_class": st.student_class,
                    "dormitory": st.dormitory,
                    "gender": getattr(st, "gender", "-"),
                })

        result.append({
            "fee_id": fee.id,
            "nama_iuran": fee.nama_iuran,
            "tipe_periode": fee.tipe_periode.value if hasattr(fee.tipe_periode, "value") else str(fee.tipe_periode),
            "nominal": fee.nominal,
            "kategori_dana": fee.kategori_dana,
            "periode_label": p_label,
            "total_santri": len(all_students),
            "sudah_bayar_count": len(sudah_bayar),
            "belum_bayar_count": len(belum_bayar),
            "total_terkumpul": sum(p["nominal_dibayar"] for p in sudah_bayar),
            "sudah_bayar": sudah_bayar,
            "belum_bayar": belum_bayar,
        })

    return result


@router.get("/laporan/tunggakan")
def laporan_tunggakan(
    gender: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Daftar semua santri yang punya tunggakan iuran aktif pada periode berjalan.
    """
    active_fees = db.query(models.FeeDefinition).filter(models.FeeDefinition.is_active == True).all()
    student_query = db.query(models.Student).filter(models.Student.is_active == True)
    if gender:
        student_query = student_query.filter(models.Student.gender == gender.upper())
    all_students = student_query.all()

    result = []
    for st in all_students:
        tunggakan = []
        total_tunggakan = 0.0
        for fee in active_fees:
            p_label = _get_current_periode_label(fee.tipe_periode.value if hasattr(fee.tipe_periode, "value") else str(fee.tipe_periode))
            payment = db.query(models.StudentPayment).filter(
                models.StudentPayment.student_id == st.student_id,
                models.StudentPayment.fee_definition_id == fee.id,
                models.StudentPayment.periode_label == p_label
            ).first()

            if not payment:
                sisa = fee.nominal
                tunggakan.append({
                    "nama_iuran": fee.nama_iuran,
                    "tipe_periode": fee.tipe_periode.value if hasattr(fee.tipe_periode, "value") else str(fee.tipe_periode),
                    "nominal": fee.nominal,
                    "sisa": sisa,
                    "status": "BELUM_BAYAR",
                    "periode_label": p_label,
                })
                total_tunggakan += sisa
            elif payment.nominal_dibayar < fee.nominal:
                sisa = fee.nominal - payment.nominal_dibayar
                tunggakan.append({
                    "nama_iuran": fee.nama_iuran,
                    "tipe_periode": fee.tipe_periode.value if hasattr(fee.tipe_periode, "value") else str(fee.tipe_periode),
                    "nominal": fee.nominal,
                    "sisa": sisa,
                    "status": "DICICIL",
                    "periode_label": p_label,
                })
                total_tunggakan += sisa

        if tunggakan:
            result.append({
                "student_id": st.student_id,
                "nis": st.nis,
                "full_name": st.full_name,
                "student_class": st.student_class,
                "dormitory": st.dormitory,
                "gender": getattr(st, "gender", "-"),
                "tunggakan": tunggakan,
                "total_tunggakan": total_tunggakan,
            })

    # Sort by total tunggakan terbesar
    result.sort(key=lambda x: x["total_tunggakan"], reverse=True)
    return result


@router.get("/laporan/kategori")
def laporan_kategori(
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Total penerimaan iuran dikelompokkan per kategori dana."""
    now = datetime.now()
    bulan = bulan or now.month
    tahun = tahun or now.year

    # Ambil semua pembayaran dalam bulan/tahun yang dipilih
    from sqlalchemy import func, extract
    payments = db.query(models.StudentPayment).filter(
        extract("year", models.StudentPayment.tanggal_bayar) == tahun,
        extract("month", models.StudentPayment.tanggal_bayar) == bulan,
    ).all()

    kategori_map: dict = {}
    for p in payments:
        fee = db.query(models.FeeDefinition).filter(models.FeeDefinition.id == p.fee_definition_id).first()
        if not fee:
            continue
        kat = fee.kategori_dana or "Lainnya"
        if kat not in kategori_map:
            kategori_map[kat] = {"kategori": kat, "total": 0.0, "transaksi": 0, "rincian": {}}
        kategori_map[kat]["total"] += p.nominal_dibayar
        kategori_map[kat]["transaksi"] += 1
        nama = fee.nama_iuran
        if nama not in kategori_map[kat]["rincian"]:
            kategori_map[kat]["rincian"][nama] = 0.0
        kategori_map[kat]["rincian"][nama] += p.nominal_dibayar

    result = []
    for k, v in kategori_map.items():
        result.append({
            "kategori": v["kategori"],
            "total": v["total"],
            "transaksi": v["transaksi"],
            "rincian": [{"nama_iuran": n, "total": t} for n, t in v["rincian"].items()],
        })
    result.sort(key=lambda x: x["total"], reverse=True)
    grand_total = sum(r["total"] for r in result)
    return {"bulan": bulan, "tahun": tahun, "grand_total": grand_total, "per_kategori": result}

