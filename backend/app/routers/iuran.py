from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
import calendar
from pydantic import BaseModel

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
def upsert_student_payment(
    payment: schemas.StudentPaymentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    """
    Jika Tagihan (Invoice) dengan student_id + fee_definition_id + periode_label sudah ada, maka UPDATE nilainya.
    Jika belum ada (kasus bayar di muka/prepayment), maka CREATE tagihan baru lalu langsung tandai LUNAS/DICICIL.
    """
    user_id = current_user.get("user_id")
    
    # Ambil definisi iuran (untuk dapatkan angka tagihan)
    fee_def = db.query(models.FeeDefinition).filter(models.FeeDefinition.id == payment.fee_definition_id).first()
    if not fee_def:
        raise HTTPException(status_code=404, detail="Definisi Iuran tidak valid.")

    # Status Auto-calculate (jika mau override manual dari payload, boleh, tapi baiknya hitung)
    status_baru = payment.status
    if payment.nominal_dibayar >= fee_def.nominal:
        status_baru = models.PaymentStatusEnum.LUNAS
    elif payment.nominal_dibayar > 0:
        status_baru = models.PaymentStatusEnum.DICICIL
    else:
        status_baru = models.PaymentStatusEnum.BELUM_BAYAR

    db_payment = db.query(models.StudentPayment).filter(
        models.StudentPayment.student_id == payment.student_id,
        models.StudentPayment.fee_definition_id == payment.fee_definition_id,
        models.StudentPayment.periode_label == payment.periode_label
    ).first()

    if db_payment:
        # UPDATE EXIST TAGIHAN
        db_payment.nominal_dibayar = payment.nominal_dibayar
        db_payment.status = status_baru
        db_payment.catatan = payment.catatan
        db_payment.received_by_user_id = user_id
        db_payment.tanggal_bayar = payment.tanggal_bayar or date.today()
        db_payment.sync_status = False
    else:
        # CREATE BARU (PREPAYMENT)
        db_payment = models.StudentPayment(
            **payment.model_dump(),
            received_by_user_id=user_id
        )
        db_payment.status = status_baru
        db_payment.tanggal_bayar = payment.tanggal_bayar or date.today()
        db.add(db_payment)
        
    db.commit()
    db.refresh(db_payment)
    
    # Attach nested data for response
    db_payment.fee_definition = fee_def
    if user_id:
        user = db.query(models.User).filter(models.User.user_id == user_id).first()
        db_payment.receiver_name = user.username if user else "Admin"
    return db_payment

@router.put("/payments/{payment_id}/reset")
def reset_student_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    """
    Tidak menghapus row tagihan, tapi meresetnya jadi 0 (membatalkan pembayaran).
    """
    db_payment = db.query(models.StudentPayment).filter(models.StudentPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Tagihan/Pembayaran tidak ditemukan.")
    
    db_payment.nominal_dibayar = 0
    db_payment.status = models.PaymentStatusEnum.BELUM_BAYAR
    db_payment.sync_status = False
    db.commit()
    return {"message": "Pembayaran berhasil dibatalkan (reset menjadi Belum Bayar)."}

@router.delete("/payments/{payment_id}")
def delete_student_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    """
    Menghapus row secara fisik (bisa dipakai jika Admin salah membuat tagihan massal).
    """
    db_payment = db.query(models.StudentPayment).filter(models.StudentPayment.id == payment_id).first()
    if not db_payment:
        raise HTTPException(status_code=404, detail="Pembayaran tidak ditemukan.")
    db.delete(db_payment)
    db.commit()
    return {"message": "Tagihan berhasil dihapus permanen."}

# ============================================================
# MASS GENERATION (TAGIHAN OTOMATIS)
# ============================================================

class GenerateRequest(BaseModel):
    periode_label: str

@router.post("/generate")
def generate_mass_invoices(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    """
    Menghasilkan tagihan (invoice) untuk semua santri aktif terhadap semua iuran aktif pada bulan/periode tertentu.
    Metode ini Idempotent (jika tagihan sudah ada di periode itu, akan diskip).
    """
    active_fees = db.query(models.FeeDefinition).filter(models.FeeDefinition.is_active == True).all()
    active_students = db.query(models.Student).filter(models.Student.is_active == True).all()

    created_count = 0
    skipped_count = 0

    for st in active_students:
        for fee in active_fees:
            # Cari jika sudah ada invoice untuk periode ini
            exists = db.query(models.StudentPayment).filter(
                models.StudentPayment.student_id == st.student_id,
                models.StudentPayment.fee_definition_id == fee.id,
                models.StudentPayment.periode_label == req.periode_label
            ).first()

            if not exists:
                new_invoice = models.StudentPayment(
                    student_id=st.student_id,
                    fee_definition_id=fee.id,
                    periode_label=req.periode_label,
                    nominal_dibayar=0.0,
                    status=models.PaymentStatusEnum.BELUM_BAYAR,
                    catatan="Digenerate massal"
                )
                db.add(new_invoice)
                created_count += 1
            else:
                skipped_count += 1
                
    if created_count > 0:
        db.commit()

    return {
        "message": f"Berhasil membuat {created_count} tagihan baru. {skipped_count} tagihan dilewati (sudah ada).",
        "created_count": created_count,
        "skipped_count": skipped_count
    }

# ============================================================
# TUNGGAKAN / STATUS IURAN ENDPOINT
# ============================================================

def _get_current_periode_label(tipe: str) -> str:
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
    Mengembalikan daftar status / tagihan iuran seorang santri dengan BERDASARKAN DB INVOICE (StudentPayment).
    Sebelumnya dia mengira-ngira tagihan, sekarang baca real dari tabel.
    """
    student = db.query(models.Student).filter(models.Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan.")

    # Ambil SEMUA tagihan yang pernah digenerate/dibayar untuk anak ini
    payments = db.query(models.StudentPayment).filter(
        models.StudentPayment.student_id == student_id
    ).order_by(models.StudentPayment.created_at.desc(), models.StudentPayment.periode_label.desc()).all()

    result = []
    
    # Supaya tidak banyak kueri berulang
    fees_cache = {}
    
    for p in payments:
        if p.fee_definition_id not in fees_cache:
            fees_cache[p.fee_definition_id] = db.query(models.FeeDefinition).filter(models.FeeDefinition.id == p.fee_definition_id).first()
            
        fee_def = fees_cache[p.fee_definition_id]
        if not fee_def:
            continue
            
        nominal_tagihan = fee_def.nominal
        sisa = max(0.0, nominal_tagihan - p.nominal_dibayar)

        result.append(schemas.FeeStatusItem(
            fee_definition=schemas.FeeDefinitionResponse.model_validate(fee_def),
            periode_label=p.periode_label,
            status=p.status,
            nominal_dibayar=p.nominal_dibayar,
            nominal_tagihan=nominal_tagihan,
            sisa_tagihan=sisa,
            tanggal_bayar=p.tanggal_bayar,
            payment_id=p.id,
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
    Rekap tagihan (berdasarkan sistem invoice).
    """
    active_fees = db.query(models.FeeDefinition).filter(models.FeeDefinition.is_active == True).all()
    if fee_id:
        active_fees = [f for f in active_fees if f.id == fee_id]

    # Kita harus list student dari DB langsung.
    # Bagi yang belum di-generate tagihannya, tidak akan masuk (karena sistem invoice).
    all_students_map = {s.student_id: s for s in db.query(models.Student).all()}
    
    result = []
    for fee in active_fees:
        p_label = periode if periode else _get_current_periode_label(fee.tipe_periode.value)

        # Ambil invoice-invoice di periode dan jenis ini
        payments = db.query(models.StudentPayment).filter(
            models.StudentPayment.fee_definition_id == fee.id,
            models.StudentPayment.periode_label == p_label
        ).all()

        sudah_bayar = []
        belum_bayar = []

        for p in payments:
            st = all_students_map.get(p.student_id)
            if not st: continue
            
            # Formatting baris
            row_data = {
                "student_id": st.student_id,
                "nis": st.nis,
                "full_name": st.full_name,
                "student_class": st.student_class,
                "dormitory": st.dormitory,
                "gender": getattr(st, "gender", "-"),
                "nominal_dibayar": p.nominal_dibayar,
                "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                "tanggal_bayar": str(p.tanggal_bayar) if p.tanggal_bayar else None,
            }
            
            if p.status == models.PaymentStatusEnum.LUNAS:
                sudah_bayar.append(row_data)
            else:
                belum_bayar.append(row_data)

        total_santri_ditagih = len(sudah_bayar) + len(belum_bayar)
        
        result.append({
            "fee_id": fee.id,
            "nama_iuran": fee.nama_iuran,
            "tipe_periode": fee.tipe_periode.value if hasattr(fee.tipe_periode, "value") else str(fee.tipe_periode),
            "nominal": fee.nominal,
            "kategori_dana": fee.kategori_dana,
            "periode_label": p_label,
            "total_santri": total_santri_ditagih,
            "sudah_bayar_count": len(sudah_bayar),
            "belum_bayar_count": len(belum_bayar),
            "total_terkumpul": sum(p["nominal_dibayar"] for p in sudah_bayar) + sum(p["nominal_dibayar"] for p in belum_bayar),
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
    Daftar semua santri yang punya tunggakan (melihat tabel invoices/StudentPayment dengan status != LUNAS).
    Lebih akurat karena ini menumpuk hutang-hutang bulan lalu.
    """
    fees_cache = {f.id: f for f in db.query(models.FeeDefinition).all()}
    
    # Query invoice yg ngutang
    query = db.query(models.StudentPayment).filter(
        models.StudentPayment.status != models.PaymentStatusEnum.LUNAS
    )
    unpaid_payments = query.all()
    
    # Map ke santri
    student_map = {}
    
    for p in unpaid_payments:
        if p.fee_definition_id not in fees_cache:
            continue
        fee = fees_cache[p.fee_definition_id]
        
        # Sisa
        sisa = max(0.0, fee.nominal - p.nominal_dibayar)
        if sisa == 0: continue
        
        if p.student_id not in student_map:
            st = db.query(models.Student).filter(models.Student.student_id == p.student_id).first()
            if not st: continue
            if gender and getattr(st, "gender", "").upper() != gender.upper():
                continue
            student_map[p.student_id] = {
                "student_id": st.student_id,
                "nis": st.nis,
                "full_name": st.full_name,
                "student_class": st.student_class,
                "dormitory": st.dormitory,
                "gender": getattr(st, "gender", "-"),
                "tunggakan": [],
                "total_tunggakan": 0.0
            }
        
        student_map[p.student_id]["tunggakan"].append({
            "payment_id": p.id,
            "nama_iuran": fee.nama_iuran,
            "tipe_periode": fee.tipe_periode.value if hasattr(fee.tipe_periode, "value") else str(fee.tipe_periode),
            "nominal": fee.nominal,
            "sisa": sisa,
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "periode_label": p.periode_label,
        })
        student_map[p.student_id]["total_tunggakan"] += sisa

    result = list(student_map.values())
    result.sort(key=lambda x: x["total_tunggakan"], reverse=True)
    return result


@router.get("/laporan/kategori")
def laporan_kategori(
    bulan: Optional[int] = None,
    tahun: Optional[int] = None,
    db: Session = Depends(get_db)
):
    now = datetime.now()
    bulan = bulan or now.month
    tahun = tahun or now.year

    from sqlalchemy import func, extract
    payments = db.query(models.StudentPayment).filter(
        extract("year", models.StudentPayment.tanggal_bayar) == tahun,
        extract("month", models.StudentPayment.tanggal_bayar) == bulan,
        models.StudentPayment.nominal_dibayar > 0
    ).all()

    kategori_map: dict = {}
    for p in payments:
        fee = db.query(models.FeeDefinition).filter(models.FeeDefinition.id == p.fee_definition_id).first()
        if not fee:
            continue
        kat = fee.kategori_dana or "Lainnya"
        if kat not in kategori_map:
            kategori_map[kat] = {"kategori": kat, "total": 0.0, "transaksi": 0, "rincian": {}}
        # Note: Ini menghitung total accumulated of that payment, padahal the payment could have been partially paid before.
        # But for simplification, we add its total value. In a strictly accounting system, we'd need a History Transactions table.
        # Karena kita simplifikasi (upsert value), we assume it's fully recognized in this edit.
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
