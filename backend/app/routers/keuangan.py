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
    if request.type == models.TransactionTypeEnum.PAYMENT:
        if wallet.balance < request.amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Saldo Tidak Mencukupi. Sisa saldo E-Money: Rp {wallet.balance:,.0f}"
            )
        
        # 3.5 Validate Daily Jajan Limit for PAYMENT
        # Calculate total spend today
        today = datetime.now().date()
        from sqlalchemy import func
        total_spend_today = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.wallet_id == wallet.wallet_id,
            models.Transaction.type == models.TransactionTypeEnum.PAYMENT,
            func.date(models.Transaction.created_at) == today
        ).scalar() or 0.0

        limit = student.batas_jajan_harian if student.batas_jajan_harian is not None else 15000
        if (total_spend_today + request.amount) > limit:
            raise HTTPException(
                status_code=400,
                detail=f"Transaksi ditolak: Limit jajan harian santri sudah habis. (Limit: Rp {limit:,.0f}, Terpakai: Rp {total_spend_today:,.0f})"
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


# =========================================================
# BIAYA SYAHRIYAH DEFAULT (bisa diubah sesuai kebijakan)
# =========================================================
BIAYA_SYAHRIYAH_DEFAULT = 300_000  # Rp 300.000

@router.post("/syahriyah/bayar-langsung")
def bayar_syahriyah_langsung(
    request: dict,
    db: Session = Depends(get_db),
    user_role: models.RoleEnum = Depends(require_role([
        models.RoleEnum.KASIR_SYAHRIYAH_PUTRA,
        models.RoleEnum.KASIR_SYAHRIYAH_PUTRI,
        models.RoleEnum.SUPER_ADMIN
    ]))
):
    """
    Bayar Syahriyah langsung tanpa harus buat tagihan manual.
    - Jika billing bulan/tahun tsb belum ada → otomatis buat.
    - Langsung catat pembayaran LUNAS.
    
    Body JSON:
    {
        "student_id": 1,          # atau
        "rfid_uid": "CARD-123",   # salah satu
        "bulan": "Maret",
        "tahun": "2026",
        "nominal": 300000,        # opsional, default BIAYA_SYAHRIYAH_DEFAULT
        "catatan": "Bayar tunai"  # opsional
    }
    """
    # 1. Ambil data santri
    student = None
    if request.get("rfid_uid"):
        student = crud.get_student_by_rfid(db, rfid_uid=request["rfid_uid"])
    elif request.get("student_id"):
        student = db.query(models.Student).filter(
            models.Student.student_id == request["student_id"]
        ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Santri tidak ditemukan")

    # 2. Cek gender silo
    bulan = request.get("bulan", "")
    tahun = request.get("tahun", str(datetime.now().year))
    nominal = request.get("nominal", BIAYA_SYAHRIYAH_DEFAULT)
    catatan = request.get("catatan", "Pembayaran Syahriyah")

    if not bulan:
        raise HTTPException(status_code=400, detail="Bulan harus diisi")
    
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRA and student.gender.value != "PUTRA":
        raise HTTPException(status_code=403, detail="Akses ditolak: Santri ini terdaftar di cluster Putri.")
    if user_role == models.RoleEnum.KASIR_SYAHRIYAH_PUTRI and student.gender.value != "PUTRI":
        raise HTTPException(status_code=403, detail="Akses ditolak: Santri ini terdaftar di cluster Putra.")

    # 3. Cek apakah billing bulan/tahun ini sudah ada
    billing = db.query(models.Billing).filter(
        models.Billing.student_id == student.student_id,
        models.Billing.month == bulan,
        models.Billing.year == tahun
    ).first()

    if billing and billing.status == models.BillingStatusEnum.PAID:
        raise HTTPException(
            status_code=400,
            detail=f"Syahriyah {bulan} {tahun} untuk santri ini sudah LUNAS."
        )

    # 4. Buat billing jika belum ada
    if not billing:
        billing = models.Billing(
            student_id=student.student_id,
            month=bulan,
            year=tahun,
            total_amount=float(nominal),
            details=f"Syahriyah {bulan} {tahun}",
            status=models.BillingStatusEnum.UNPAID
        )
        db.add(billing)
        db.flush()  # Agar billing.id tersedia

    # 5. Catat pembayaran
    payment = models.PaymentTransaction(
        billing_id=billing.id,
        amount_paid=float(nominal),
        payment_date=datetime.now(),
        notes=catatan
    )
    db.add(payment)

    # 6. Update status billing menjadi PAID
    billing.status = models.BillingStatusEnum.PAID
    billing.total_amount = float(nominal)
    
    db.commit()
    db.refresh(billing)

    return {
        "success": True,
        "message": f"✅ Pembayaran Syahriyah {bulan} {tahun} untuk {student.full_name} berhasil dicatat.",
        "billing_id": billing.id,
        "student": {
            "student_id": student.student_id,
            "nama": student.full_name,
            "kelas": student.student_class,
        },
        "nominal": nominal,
        "status": "PAID"
    }


@router.get("/laporan/keuangan")
def download_laporan_keuangan(
    bulan: int,
    tahun: int,
    db: Session = Depends(get_db)
):
    """Download laporan keuangan bulanan dalam format CSV."""
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from sqlalchemy import func, or_

    # Database stores month EITHER as number string ("3") or Indonesian name ("Maret")
    NAMA_BULAN = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                  "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    bulan_str_angka = str(bulan)
    bulan_str_nama  = NAMA_BULAN[bulan] if 1 <= bulan <= 12 else str(bulan)
    tahun_str = str(tahun)

    month_filter = or_(
        models.Billing.month == bulan_str_angka,
        models.Billing.month == bulan_str_nama,
    )

    # 1. Total Pemasukan Syahriyah (billing yang PAID di bulan/tahun tsb)
    billings_paid = db.query(models.Billing).filter(
        month_filter,
        models.Billing.year == tahun_str,
        models.Billing.status == models.BillingStatusEnum.PAID
    ).all()
    total_syahriyah = sum(b.total_amount for b in billings_paid)

    # 2. Perlu data pembayaran parsial juga (PARTIAL)
    billings_partial = db.query(models.Billing).filter(
        month_filter,
        models.Billing.year == tahun_str,
        models.Billing.status == models.BillingStatusEnum.PARTIAL
    ).all()
    # Untuk PARTIAL, hitung dari payment_transactions
    partial_ids = [b.id for b in billings_partial]
    if partial_ids:
        partial_paid = db.query(func.sum(models.PaymentTransaction.amount_paid)).filter(
            models.PaymentTransaction.billing_id.in_(partial_ids)
        ).scalar() or 0.0
        total_syahriyah += partial_paid

    # 3. Total Top-Up E-Money di bulan/tahun tsb
    from sqlalchemy import extract
    total_topup = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionTypeEnum.TOPUP,
        extract('month', models.Transaction.created_at) == bulan,
        extract('year', models.Transaction.created_at) == tahun
    ).scalar() or 0.0

    # 4. Total Pengeluaran (Jajan) E-Money di bulan/tahun tsb
    total_pengeluaran = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionTypeEnum.PAYMENT,
        extract('month', models.Transaction.created_at) == bulan,
        extract('year', models.Transaction.created_at) == tahun
    ).scalar() or 0.0

    # Nama bulan
    nama_bulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                  "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    label_bulan = nama_bulan[bulan] if 1 <= bulan <= 12 else str(bulan)

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["LAPORAN KEUANGAN BULANAN"])
    writer.writerow([f"Periode: {label_bulan} {tahun}"])
    writer.writerow([])
    writer.writerow(["Kategori", "Total (Rp)"])
    writer.writerow(["Total Pemasukan Syahriyah", f"{total_syahriyah:,.0f}"])
    writer.writerow(["Total Top-Up E-Money", f"{total_topup:,.0f}"])
    writer.writerow(["Total Pengeluaran/Jajan Santri", f"{total_pengeluaran:,.0f}"])
    writer.writerow([])
    writer.writerow(["Saldo Bersih E-Money", f"{total_topup - total_pengeluaran:,.0f}"])

    output.seek(0)
    filename = f"Laporan_Keuangan_{bulan}_{tahun}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/laporan/tunggakan")
def get_tunggakan_syahriyah(
    bulan: int,
    tahun: int,
    format: Optional[str] = "json",
    db: Session = Depends(get_db)
):
    """Daftar santri yang belum lunas Syahriyah pada bulan/tahun tertentu.
    
    Menggunakan LEFT JOIN: santri tanpa record billing di bulan ini
    juga dianggap BELUM BAYAR (bukan lunas).
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse
    from sqlalchemy.orm import aliased
    from sqlalchemy import and_, or_

    # Database stores month EITHER as number string ("3") or Indonesian name ("Maret")
    # We must search for BOTH to handle data from all sources
    NAMA_BULAN = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                  "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    bulan_str_angka = str(bulan)   # "3"
    bulan_str_nama  = NAMA_BULAN[bulan] if 1 <= bulan <= 12 else str(bulan)  # "Maret"
    tahun_str = str(tahun)

    # LEFT JOIN: ambil SEMUA santri, gabungkan dengan billing bulan ini (jika ada)
    # Santri yang tidak punya billing = NULL billing = belum bayar
    BillingAlias = aliased(models.Billing)

    rows = (
        db.query(models.Student, BillingAlias)
        .outerjoin(
            BillingAlias,
            and_(
                BillingAlias.student_id == models.Student.student_id,
                # Match BOTH formats: "3" (angka) atau "Maret" (nama) 
                or_(
                    BillingAlias.month == bulan_str_angka,
                    BillingAlias.month == bulan_str_nama,
                ),
                BillingAlias.year == tahun_str,
            )
        )
        .order_by(models.Student.student_class, models.Student.full_name)
        .all()
    )

    result = []
    for student, billing in rows:
        # Lunas hanya jika ada billing dan statusnya PAID
        if billing and billing.status == models.BillingStatusEnum.PAID:
            continue  # Skip santri yang sudah lunas

        # Tentukan status tampilan
        if billing is None:
            status_label = "UNPAID"
            total_tagihan = 0.0
        elif billing.status == models.BillingStatusEnum.PARTIAL:
            status_label = "PARTIAL"
            total_tagihan = billing.total_amount
        else:
            status_label = "UNPAID"
            total_tagihan = billing.total_amount

        result.append({
            "student_id": student.student_id,
            "nama": student.full_name,
            "kelas": student.student_class,
            "asrama": student.dormitory,
            "gender": student.gender.value,
            "total_tagihan": total_tagihan,
            "status": status_label,
        })

    if format == "csv":
        nama_bulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                      "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        label_bulan = nama_bulan[bulan] if 1 <= bulan <= 12 else str(bulan)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([f"DAFTAR TUNGGAKAN SYAHRIYAH - {label_bulan} {tahun}"])
        writer.writerow([f"Total santri menunggak: {len(result)}"])
        writer.writerow([])
        writer.writerow(["No", "Nama Santri", "Kelas", "Asrama", "Gender", "Total Tagihan (Rp)", "Status"])
        for i, row in enumerate(result, 1):
            writer.writerow([
                i, row["nama"], row["kelas"], row["asrama"], row["gender"],
                f"{row['total_tagihan']:,.0f}", row["status"]
            ])

        output.seek(0)
        filename = f"Tunggakan_Syahriyah_{bulan}_{tahun}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    return {"bulan": bulan, "tahun": tahun, "total_tunggakan": len(result), "data": result}
