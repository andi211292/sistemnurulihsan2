"""
Modul Absensi ESP32 — Multi-Lokasi, Anti-Ganda, Integrasi Izin
POST /api/absensi/tap  — input dari ESP32
GET  /api/absensi/rekap — laporan terkategori (Jamaah/Sekolah/Kamar)
GET  /api/absensi/devices — daftar alat
POST /api/absensi/devices — daftarkan/update alat
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date as date_type
from pydantic import BaseModel
from typing import Optional, List
import datetime as dt

from .. import models
from ..database import SessionLocal

router = APIRouter(
    prefix="/api/absensi",
    tags=["Absensi ESP32"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─────────────────────────────────────────────
# Jadwal Shalat — tentukan sesi dari jam clock
# ─────────────────────────────────────────────
JADWAL_SESI = [
    # (jam_mulai, jam_selesai, nama_sesi)
    (3,  7,  "SHALAT_SUBUH"),
    (11, 14, "SHALAT_DZUHUR"),
    (14, 17, "SHALAT_ASHAR"),
    (17, 20, "SHALAT_MAGHRIB"),
    (19, 23, "SHALAT_ISYA"),
    (6,  13, "SEKOLAH_PAGI"),
    (13, 17, "DINIYAH_SORE"),
    (20, 24, "MALAM_KAMAR"),
]

def get_sesi_sekarang() -> Optional[str]:
    """Tentukan sesi aktif berdasarkan jam sekarang (WIB)."""
    jam = datetime.now().hour
    # Prioritas: lebih spesifik di depan
    if 3 <= jam < 7:    return "SHALAT_SUBUH"
    if 6 <= jam < 13:   return "SEKOLAH_PAGI"
    if 11 <= jam < 14:  return "SHALAT_DZUHUR"
    if 13 <= jam < 17:  return "DINIYAH_SORE"
    if 14 <= jam < 17:  return "SHALAT_ASHAR"
    if 17 <= jam < 20:  return "SHALAT_MAGHRIB"
    if 19 <= jam < 23:  return "SHALAT_ISYA"
    if 20 <= jam <= 23: return "MALAM_KAMAR"
    return None


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class AbsensiTapRequest(BaseModel):
    uid: str                             # 10-digit desimal, contoh: "4265130963"
    device_id: Optional[str] = None     # ID alat ESP32, contoh: "ESP32-MASJID-01"
    tipe: Optional[str] = "AUTO"        # "AUTO" / "HADIR" / "MAKAN"

class DeviceSchema(BaseModel):
    device_id: str
    nama_lokasi: str
    tipe_sesi: str       # nilai dari AttendanceTypeEnum
    jam_mulai: int = 0
    jam_selesai: int = 23
    is_active: bool = True


# ─────────────────────────────────────────────
# POST /tap — Endpoint utama ESP32
# ─────────────────────────────────────────────
@router.post("/tap")
def absensi_tap(request: AbsensiTapRequest, db: Session = Depends(get_db)):
    from sqlalchemy import or_, and_

    uid = request.uid.strip()
    now = datetime.now()
    today = now.date()

    # 1. Cari santri
    student = db.query(models.Student).filter(
        or_(
            models.Student.rfid_uid == uid,
            models.Student.nis == uid,
        )
    ).first()

    if not student:
        return {
            "success": False,
            "status": "not_found",
            "message": "Kartu tidak terdaftar",
            "uid": uid
        }

    nama = student.full_name

    # 2. Tentukan sesi dari device atau dari clock
    sesi_aktif = None
    if request.device_id:
        device = db.query(models.AttendanceDevice).filter(
            models.AttendanceDevice.device_id == request.device_id,
            models.AttendanceDevice.is_active == True
        ).first()
        if device:
            sesi_aktif = device.tipe_sesi
    
    if not sesi_aktif:
        sesi_aktif = get_sesi_sekarang() or "KLASIKAL"

    # 3. Anti-double-tap: cek 10 menit terakhir di device yang SAMA
    if request.device_id:
        cooldown_limit = now - timedelta(minutes=10)
        recent = db.query(models.Attendance).filter(
            models.Attendance.student_id == student.student_id,
            models.Attendance.device_id == request.device_id,
            models.Attendance.timestamp >= cooldown_limit
        ).first()
        if recent:
            return {
                "success": False,
                "status": "already_tapped",
                "nama": nama,
                "sesi": sesi_aktif,
                "message": f"Sudah Absen, {nama}!",
                "waktu": recent.timestamp.strftime("%H:%M")
            }

    # 4. Cek unique session: sudah hadir di sesi ini hari ini?
    start_of_day = datetime.combine(today, dt.time.min)
    existing_sesi = db.query(models.Attendance).filter(
        models.Attendance.student_id == student.student_id,
        models.Attendance.sesi == sesi_aktif,
        models.Attendance.timestamp >= start_of_day,
        models.Attendance.status == models.AttendanceStatusEnum.HADIR
    ).first()

    if existing_sesi:
        return {
            "success": False,
            "status": "already_tapped",
            "nama": nama,
            "sesi": sesi_aktif,
            "message": f"Sudah Absen, {nama}!",
            "waktu": existing_sesi.timestamp.strftime("%H:%M")
        }

    # 5. Cek izin aktif (StudentLeave)
    status_absensi = models.AttendanceStatusEnum.HADIR
    keterangan_izin = None

    from ..models import StudentLeave
    izin_aktif = db.query(StudentLeave).filter(
        StudentLeave.student_id == student.student_id,
        StudentLeave.start_time <= now,
        StudentLeave.end_time >= now,
    ).first()

    if izin_aktif:
        # Santri punya izin aktif — tap tetap dicatat tapi dengan status IZIN
        status_absensi = models.AttendanceStatusEnum.IZIN
        keterangan_izin = izin_aktif.reason

    # 6. Map sesi ke AttendanceTypeEnum
    sesi_ke_type = {
        "SHALAT_SUBUH":   models.AttendanceTypeEnum.SHALAT_SUBUH,
        "SHALAT_DZUHUR":  models.AttendanceTypeEnum.SHALAT_DZUHUR,
        "SHALAT_ASHAR":   models.AttendanceTypeEnum.SHALAT_ASHAR,
        "SHALAT_MAGHRIB": models.AttendanceTypeEnum.SHALAT_MAGHRIB,
        "SHALAT_ISYA":    models.AttendanceTypeEnum.SHALAT_ISYA,
        "SEKOLAH_PAGI":   models.AttendanceTypeEnum.SEKOLAH_PAGI,
        "DINIYAH_SORE":   models.AttendanceTypeEnum.DINIYAH_SORE,
        "MALAM_KAMAR":    models.AttendanceTypeEnum.MALAM_KAMAR,
        "KLASIKAL":       models.AttendanceTypeEnum.KLASIKAL,
    }
    attendance_type = sesi_ke_type.get(sesi_aktif, models.AttendanceTypeEnum.KLASIKAL)

    # 7. Simpan ke database
    attendance = models.Attendance(
        student_id=student.student_id,
        type=attendance_type,
        status=status_absensi,
        device_id=request.device_id,
        sesi=sesi_aktif,
        timestamp=now
    )
    db.add(attendance)
    db.commit()

    return {
        "success": True,
        "status": "hadir",
        "nama": nama,
        "kelas": student.student_class,
        "sesi": sesi_aktif,
        "status_absensi": status_absensi.value,
        "izin": keterangan_izin,
        "waktu": now.strftime("%H:%M"),
        "message": f"{nama} — {sesi_aktif}"
    }


# ─────────────────────────────────────────────
# GET /rekap — Laporan terkategori
# ─────────────────────────────────────────────
@router.get("/rekap")
def get_rekap_absensi(
    tanggal: Optional[str] = None,   # "2026-03-07", default hari ini
    gender: Optional[str] = None,    # "PUTRA" / "PUTRI"
    db: Session = Depends(get_db)
):
    """
    Rekap absensi harian per 3 kategori:
    - Jamaah (SHALAT_*)
    - Sekolah (SEKOLAH_PAGI + DINIYAH_SORE)
    - Keberadaan Malam (MALAM_KAMAR)
    """
    from sqlalchemy import and_, func

    if tanggal:
        target_date = date_type.fromisoformat(tanggal)
    else:
        target_date = date_type.today()

    start = datetime.combine(target_date, dt.time.min)
    end   = datetime.combine(target_date, dt.time.max)

    # Base query semua santri
    students_q = db.query(models.Student)
    if gender:
        students_q = students_q.filter(
            models.Student.gender == models.GenderEnum(gender.upper())
        )
    all_students = students_q.all()
    total = len(all_students)

    # Attendance hari ini
    att_q = db.query(models.Attendance).filter(
        models.Attendance.timestamp >= start,
        models.Attendance.timestamp <= end,
    )
    all_att = att_q.all()

    def hitung_kategori(sesi_list: list):
        """Hitung HADIR/ALPA/IZIN untuk kumpulan sesi."""
        hadir_ids = set()
        izin_ids  = set()
        for att in all_att:
            if att.sesi in sesi_list:
                if att.status == models.AttendanceStatusEnum.HADIR:
                    hadir_ids.add(att.student_id)
                elif att.status in (
                    models.AttendanceStatusEnum.IZIN,
                    models.AttendanceStatusEnum.SAKIT
                ):
                    izin_ids.add(att.student_id)
        alpa = total - len(hadir_ids) - len(izin_ids)
        return {
            "hadir": len(hadir_ids),
            "izin":  len(izin_ids),
            "alpa":  max(alpa, 0),
            "total": total
        }

    SHALAT_SESI   = ["SHALAT_SUBUH","SHALAT_DZUHUR","SHALAT_ASHAR","SHALAT_MAGHRIB","SHALAT_ISYA"]
    SEKOLAH_SESI  = ["SEKOLAH_PAGI","DINIYAH_SORE","KLASIKAL"]
    KAMAR_SESI    = ["MALAM_KAMAR"]

    # Detail per sesi
    sesi_detail = {}
    for sesi in SHALAT_SESI + SEKOLAH_SESI + KAMAR_SESI:
        hadir = sum(1 for a in all_att if a.sesi == sesi and a.status == models.AttendanceStatusEnum.HADIR)
        sesi_detail[sesi] = hadir

    return {
        "tanggal": str(target_date),
        "total_santri": total,
        "gender_filter": gender,
        "jamaah":  hitung_kategori(SHALAT_SESI),
        "sekolah": hitung_kategori(SEKOLAH_SESI),
        "kamar":   hitung_kategori(KAMAR_SESI),
        "detail_per_sesi": sesi_detail,
    }


# ─────────────────────────────────────────────
# GET /rekap/santri — Absensi per-santri detail
# ─────────────────────────────────────────────
@router.get("/rekap/santri")
def get_rekap_per_santri(
    tanggal: Optional[str] = None,
    sesi: Optional[str] = None,
    gender: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if tanggal:
        target_date = date_type.fromisoformat(tanggal)
    else:
        target_date = date_type.today()

    start = datetime.combine(target_date, dt.time.min)
    end   = datetime.combine(target_date, dt.time.max)

    q = db.query(models.Attendance, models.Student).join(
        models.Student,
        models.Attendance.student_id == models.Student.student_id
    ).filter(
        models.Attendance.timestamp >= start,
        models.Attendance.timestamp <= end,
    )
    if sesi:
        q = q.filter(models.Attendance.sesi == sesi)
    if gender:
        q = q.filter(models.Student.gender == models.GenderEnum(gender.upper()))

    rows = q.order_by(models.Student.student_class, models.Student.full_name).all()
    return [
        {
            "student_id": s.student_id,
            "nama": s.full_name,
            "kelas": s.student_class,
            "sesi": a.sesi,
            "status": a.status.value,
            "device_id": a.device_id,
            "waktu": a.timestamp.strftime("%H:%M:%S"),
        }
        for a, s in rows
    ]


# ─────────────────────────────────────────────
# CRUD Alat / Devices
# ─────────────────────────────────────────────
@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(models.AttendanceDevice).all()
    return devices

@router.post("/devices")
def upsert_device(data: DeviceSchema, db: Session = Depends(get_db)):
    """Daftarkan alat baru atau update device yang sudah ada."""
    device = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.device_id == data.device_id
    ).first()

    if device:
        device.nama_lokasi = data.nama_lokasi
        device.tipe_sesi   = data.tipe_sesi
        device.jam_mulai   = data.jam_mulai
        device.jam_selesai = data.jam_selesai
        device.is_active   = data.is_active
    else:
        device = models.AttendanceDevice(
            device_id   = data.device_id,
            nama_lokasi = data.nama_lokasi,
            tipe_sesi   = data.tipe_sesi,
            jam_mulai   = data.jam_mulai,
            jam_selesai = data.jam_selesai,
            is_active   = data.is_active,
        )
        db.add(device)

    db.commit()
    db.refresh(device)
    return {"success": True, "device": {"device_id": device.device_id, "nama_lokasi": device.nama_lokasi}}

@router.delete("/devices/{device_id}")
def delete_device(device_id: str, db: Session = Depends(get_db)):
    device = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.device_id == device_id
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan")
    db.delete(device)
    db.commit()
    return {"success": True}
