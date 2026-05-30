"""
Router: Manajemen Hak Akses Per Role (RBAC)
Hanya SUPER_ADMIN yang bisa mengubah konfigurasi hak akses.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel
from datetime import datetime

from .. import models
from ..database import SessionLocal
from ..dependencies import require_role, get_current_user_payload

router = APIRouter(
    prefix="/api/permissions",
    tags=["Hak Akses (RBAC)"]
)

# Semua menu yang bisa dikonfigurasi aksesnya
ALL_MENUS = [
    {"key": "/",                      "name": "Beranda",              "icon": "home"},
    {"key": "/santri",                "name": "Data Santri",          "icon": "people"},
    {"key": "/monitor",               "name": "Live Monitor RFID",    "icon": "sensors"},
    {"key": "/absensi",               "name": "Monitor Absensi",      "icon": "fact_check"},
    {"key": "/absensi/devices",       "name": "Kelola Alat RFID",     "icon": "settings_remote"},
    {"key": "/tahfidz",               "name": "Jurnal Tahfidz",       "icon": "menu_book"},
    {"key": "/keuangan/emoney",       "name": "Koperasi & E-Money",   "icon": "store"},
    {"key": "/keuangan/pengeluaran",  "name": "Pengeluaran Kas",      "icon": "money_off"},
    {"key": "/keuangan/iuran",        "name": "Manajemen Iuran",      "icon": "receipt_long"},
    {"key": "/keuangan/iuran/laporan","name": "Laporan Iuran",        "icon": "bar_chart"},
    {"key": "/guru",                  "name": "Data Guru",            "icon": "school"},
    {"key": "/kedisiplinan",          "name": "Kedisiplinan",         "icon": "gavel"},
    {"key": "/kesehatan",             "name": "Klinik Kesehatan",     "icon": "local_hospital"},
    {"key": "/ranking",               "name": "Bintang Prestasi",     "icon": "emoji_events"},
    {"key": "/galeri",                "name": "Galeri Kegiatan",      "icon": "photo_library"},
    {"key": "/laporan",               "name": "Laporan Bulanan",      "icon": "print"},
    {"key": "/laporan-keuangan",      "name": "Laporan Keuangan",     "icon": "account_balance"},
    {"key": "/pengguna",              "name": "Manajemen Pengguna",   "icon": "manage_accounts"},
    {"key": "/pengguna/hak-akses",    "name": "Pengaturan Hak Akses", "icon": "admin_panel_settings"},
]

# Role yang TIDAK bisa diubah (selalu full akses)
SUPER_ADMIN_ROLE = models.RoleEnum.SUPER_ADMIN

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class PermissionItem(BaseModel):
    menu_key: str
    is_allowed: bool

class SavePermissionsRequest(BaseModel):
    role: models.RoleEnum
    permissions: List[PermissionItem]


@router.get("/menus")
def get_all_menus():
    """Ambil daftar semua menu yang bisa dikonfigurasi."""
    return ALL_MENUS


@router.get("")
def get_all_permissions(
    db: Session = Depends(get_db),
    _: dict = Depends(require_role([models.RoleEnum.SUPER_ADMIN]))
):
    """
    Ambil semua konfigurasi hak akses per role.
    Return: dict dengan key = role value, value = list menu_key yang diizinkan
    """
    result: Dict[str, List[str]] = {}

    # Inisialisasi semua role dengan list kosong
    for role in models.RoleEnum:
        result[role.value] = []

    # Super Admin selalu dapat semua akses
    result[SUPER_ADMIN_ROLE.value] = [m["key"] for m in ALL_MENUS]

    # Ambil data dari DB
    rows = db.query(models.RolePermission).filter(
        models.RolePermission.is_allowed == True
    ).all()

    for row in rows:
        role_val = row.role.value if hasattr(row.role, 'value') else row.role
        if role_val not in result:
            result[role_val] = []
        if row.menu_key not in result[role_val]:
            result[role_val].append(row.menu_key)

    return result


@router.get("/my-role")
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_payload)
):
    """
    Ambil daftar menu yang diizinkan untuk role yang sedang login.
    Digunakan oleh frontend setelah login untuk cache di localStorage.
    """
    role_str = current_user.get("role", "")

    # Super Admin: semua akses
    if role_str == SUPER_ADMIN_ROLE.value:
        return {
            "role": role_str,
            "allowed_menus": [m["key"] for m in ALL_MENUS]
        }

    # Role lain: baca dari DB
    rows = db.query(models.RolePermission).filter(
        models.RolePermission.role == role_str,
        models.RolePermission.is_allowed == True
    ).all()

    allowed = [row.menu_key for row in rows]
    return {
        "role": role_str,
        "allowed_menus": allowed
    }


@router.post("")
def save_permissions(
    data: SavePermissionsRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role([models.RoleEnum.SUPER_ADMIN]))
):
    """
    Simpan konfigurasi hak akses untuk satu role.
    Akan menghapus semua konfigurasi lama role tersebut dan menggantinya.
    Super Admin tidak bisa diubah aksesnya.
    """
    if data.role == SUPER_ADMIN_ROLE:
        raise HTTPException(status_code=400, detail="Hak akses Super Admin tidak bisa diubah.")

    # Hapus semua konfigurasi lama untuk role ini
    db.query(models.RolePermission).filter(
        models.RolePermission.role == data.role
    ).delete()

    # Simpan konfigurasi baru
    valid_keys = {m["key"] for m in ALL_MENUS}
    saved = 0
    for perm in data.permissions:
        if perm.menu_key not in valid_keys:
            continue
        new_perm = models.RolePermission(
            role=data.role,
            menu_key=perm.menu_key,
            is_allowed=perm.is_allowed,
            updated_at=datetime.utcnow()
        )
        db.add(new_perm)
        if perm.is_allowed:
            saved += 1

    db.commit()

    role_label = data.role.value
    return {
        "message": f"Hak akses untuk {role_label} berhasil disimpan. {saved} menu diizinkan.",
        "role": role_label,
        "allowed_count": saved
    }
