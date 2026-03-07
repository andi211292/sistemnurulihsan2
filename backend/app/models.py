from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Enum as SqlEnum, Date
from sqlalchemy.orm import relationship
import datetime
import enum

from .database import Base

class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    KASIR_KOP_PUSAT = "KASIR_KOP_PUSAT"
    KASIR_KOP_LUAR = "KASIR_KOP_LUAR"
    KASIR_SYAHRIYAH_PUTRA = "KASIR_SYAHRIYAH_PUTRA"
    KASIR_SYAHRIYAH_PUTRI = "KASIR_SYAHRIYAH_PUTRI"
    PENGURUS_SANTRI = "PENGURUS_SANTRI"
    PENGURUS_SEKOLAH = "PENGURUS_SEKOLAH"
    GURU_BP = "GURU_BP"
    PENGURUS_KEAMANAN = "PENGURUS_KEAMANAN"
    USTADZ = "USTADZ"
    WALI = "WALI"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(SqlEnum(RoleEnum))
    email = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)

class Guardian(Base):
    __tablename__ = "guardians"

    guardian_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    full_name = Column(String)
    phone = Column(String)
    address = Column(String)

class GenderEnum(str, enum.Enum):
    PUTRA = "PUTRA"
    PUTRI = "PUTRI"

class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, primary_key=True, index=True)
    nis = Column(String, unique=True, index=True)
    rfid_uid = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String)
    student_class = Column(String)        # Kelas diniyah (Al-Imrithi, dll)
    kelas_sekolah = Column(Integer, nullable=True)         # Kelas formal 7-12
    tingkatan_diniyah = Column(String, nullable=True)      # Jurrumiyah, Imrithi, Alfiyah, dll
    dormitory = Column(String)
    gender = Column(SqlEnum(GenderEnum, name="gender_enum"), default=GenderEnum.PUTRA)
    guardian_id = Column(Integer, ForeignKey("guardians.guardian_id"))
    batas_jajan_harian = Column(Integer, default=15000)

class Wallet(Base):
    __tablename__ = "wallets"

    wallet_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    balance = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

class TransactionTypeEnum(str, enum.Enum):
    TOPUP = "TOPUP"
    PAYMENT = "PAYMENT"

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.wallet_id"))
    amount = Column(Float)
    type = Column(SqlEnum(TransactionTypeEnum))
    description = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    sync_status = Column(Boolean, default=False)

class MealTypeEnum(str, enum.Enum):
    PAGI = "PAGI"
    SIANG = "SIANG"
    MALAM = "MALAM"

class MealLog(Base):
    __tablename__ = "meal_logs"

    meal_log_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    meal_type = Column(SqlEnum(MealTypeEnum))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    sync_status = Column(Boolean, default=False)

class AttendanceTypeEnum(str, enum.Enum):
    # Shalat Jamaah
    SHALAT_SUBUH   = "SHALAT_SUBUH"
    SHALAT_DZUHUR  = "SHALAT_DZUHUR"
    SHALAT_ASHAR   = "SHALAT_ASHAR"
    SHALAT_MAGHRIB = "SHALAT_MAGHRIB"
    SHALAT_ISYA    = "SHALAT_ISYA"
    # Sekolah & Diniyah
    SEKOLAH_PAGI   = "SEKOLAH_PAGI"
    DINIYAH_SORE   = "DINIYAH_SORE"
    KLASIKAL       = "KLASIKAL"   # legacy
    # Keberadaan Malam
    MALAM_KAMAR    = "MALAM_KAMAR"

class AttendanceStatusEnum(str, enum.Enum):
    HADIR = "HADIR"
    ALPA  = "ALPA"
    SAKIT = "SAKIT"
    IZIN  = "IZIN"

class AttendanceDevice(Base):
    """Daftar alat ESP32 RFID yang terdaftar di sistem."""
    __tablename__ = "attendance_devices"

    id          = Column(Integer, primary_key=True, index=True)
    device_id   = Column(String, unique=True, index=True)  # contoh: "ESP32-MASJID-01"
    nama_lokasi = Column(String)                           # contoh: "Masjid Utama"
    is_active   = Column(Boolean, default=True)
    # Legacy columns (dipertahankan agar tidak break data lama)
    tipe_sesi   = Column(String, nullable=True)
    jam_mulai   = Column(Integer, default=0)
    jam_selesai = Column(Integer, default=23)

    # Relasi ke jadwal sesi
    jadwal_sesi = relationship("AttendanceDeviceSesi", back_populates="device",
                               cascade="all, delete-orphan")

class AttendanceDeviceSesi(Base):
    """Jadwal sesi per alat — satu alat bisa punya banyak sesi (misal 5 waktu shalat)."""
    __tablename__ = "attendance_device_sesi"

    id           = Column(Integer, primary_key=True, index=True)
    device_id    = Column(String, ForeignKey("attendance_devices.device_id", ondelete="CASCADE"))
    tipe_sesi    = Column(String)     # SHALAT_SUBUH, SHALAT_DZUHUR, dll
    jam_mulai    = Column(String)     # "05:30" format HH:MM
    jam_selesai  = Column(String)     # "05:55" format HH:MM
    is_active    = Column(Boolean, default=True)

    device = relationship("AttendanceDevice", back_populates="jadwal_sesi")

class Attendance(Base):
    __tablename__ = "attendances"

    attendance_id = Column(Integer, primary_key=True, index=True)
    student_id    = Column(Integer, ForeignKey("students.student_id"))
    type          = Column(SqlEnum(AttendanceTypeEnum))
    status        = Column(SqlEnum(AttendanceStatusEnum))
    device_id     = Column(String, nullable=True)          # dari device mana
    sesi          = Column(String, nullable=True)          # nama sesi, misal "SHALAT_SUBUH"
    timestamp     = Column(DateTime, default=datetime.datetime.utcnow)
    sync_status   = Column(Boolean, default=False)

class TahfidzRecord(Base):
    __tablename__ = "tahfidz_records"

    record_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    ustadz_user_id = Column(Integer, ForeignKey("users.user_id"))
    surah = Column(String)
    start_ayat = Column(Integer)
    end_ayat = Column(Integer)
    grade = Column(String)
    date_recorded = Column(Date)
    notes = Column(String, nullable=True)
    sync_status = Column(Boolean, default=False)

class MutabaahTypeEnum(str, enum.Enum):
    SHALAT_TAHAJUD = "SHALAT_TAHAJUD"
    DHUHA = "DHUHA"
    PUASA = "PUASA"

class MutabaahRecord(Base):
    __tablename__ = "mutabaah_records"

    mut_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    type = Column(SqlEnum(MutabaahTypeEnum))
    is_done = Column(Boolean, default=False)
    date = Column(Date)
    sync_status = Column(Boolean, default=False)

class AcademicGrade(Base):
    __tablename__ = "academic_grades"

    grade_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    subject_name = Column(String)
    semester_name = Column(String)
    score = Column(Float)
    sync_status = Column(Boolean, default=False)

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    medical_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    complaint = Column(String)
    diagnosis = Column(String)
    medicine_given = Column(String)
    handled_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    sync_status = Column(Boolean, default=False)

class BillingStatusEnum(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIAL = "PARTIAL"
    PAID = "PAID"

class Billing(Base):
    __tablename__ = "billings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    month = Column(String)
    year = Column(String)
    total_amount = Column(Float)
    details = Column(String) # JSON string representing details
    status = Column(SqlEnum(BillingStatusEnum), default=BillingStatusEnum.UNPAID)
    sync_status = Column(Boolean, default=False)
    
    student = relationship("Student")

class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    billing_id = Column(Integer, ForeignKey("billings.id"))
    amount_paid = Column(Float)
    payment_date = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(String, nullable=True)
    sync_status = Column(Boolean, default=False)

class Announcement(Base):
    __tablename__ = "announcements"

    announcement_id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(String)
    author_user_id = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_published = Column(Boolean, default=True)

class TeacherStatusEnum(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"

class Teacher(Base):
    __tablename__ = "teachers"

    teacher_id = Column(Integer, primary_key=True, index=True)
    nip = Column(String, unique=True, index=True)
    full_name = Column(String)
    subject = Column(String)
    status = Column(SqlEnum(TeacherStatusEnum), default=TeacherStatusEnum.ACTIVE)

class DayOfWeekEnum(str, enum.Enum):
    SENIN = "SENIN"
    SELASA = "SELASA"
    RABU = "RABU"
    KAMIS = "KAMIS"
    JUMAT = "JUMAT"
    SABTU = "SABTU"
    AHAD = "AHAD"

class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    schedule_id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"))
    student_class = Column(String)
    subject = Column(String)
    day_of_week = Column(SqlEnum(DayOfWeekEnum))
    start_time = Column(String) # e.g. "08:00"
    end_time = Column(String)   # e.g. "09:30"
    sync_status = Column(Boolean, default=False)

class TeacherAttendanceStatusEnum(str, enum.Enum):
    HADIR = "HADIR"
    IZIN = "IZIN"
    SAKIT = "SAKIT"
    ALPA = "ALPA"

class TeacherAttendance(Base):
    __tablename__ = "teacher_attendances"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.teacher_id"))
    schedule_id = Column(Integer, ForeignKey("class_schedules.schedule_id"), nullable=True) # Now linked to Schedule
    date = Column(Date) # The specific date the class happened
    timestamp = Column(DateTime, default=datetime.datetime.utcnow) # exact logging time
    status = Column(SqlEnum(TeacherAttendanceStatusEnum))
    notes = Column(String, nullable=True)
    sync_status = Column(Boolean, default=False)

class StudentLeaveReasonEnum(str, enum.Enum):
    IZIN = "IZIN"
    SAKIT = "SAKIT"
    PULANG = "PULANG"
    IZIN_KELUAR = "IZIN_KELUAR" # New option for short leaves

class StudentLeave(Base):
    __tablename__ = "student_leaves"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    start_date = Column(Date)
    end_date = Column(Date)
    start_time = Column(String, nullable=True) # for short leaves
    end_time = Column(String, nullable=True)   # for short leaves
    reason = Column(SqlEnum(StudentLeaveReasonEnum))
    notes = Column(String, nullable=True)
    is_returned = Column(Boolean, default=False)
    return_timestamp = Column(DateTime, nullable=True)
    sync_status = Column(Boolean, default=False)

class StudentViolation(Base):
    __tablename__ = "student_violations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    violation_date = Column(Date)
    violation_type = Column(String)
    punishment = Column(String)
    points = Column(Integer, default=0)
    sync_status = Column(Boolean, default=False)
