from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from .models import RoleEnum, TransactionTypeEnum, MealTypeEnum, AttendanceTypeEnum, AttendanceStatusEnum, GenderEnum

# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    role: RoleEnum
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    user_id: int

    class Config:
        from_attributes = True

# --- Student Schemas ---
class StudentBase(BaseModel):
    nis: str
    rfid_uid: Optional[str] = None
    full_name: str
    student_class: str
    kelas_sekolah: Optional[int] = None
    tingkatan_diniyah: Optional[str] = None
    dormitory: str
    gender: GenderEnum = GenderEnum.PUTRA
    batas_jajan_harian: Optional[int] = 15000

class StudentCreate(StudentBase):
    guardian_id: Optional[int] = None

class StudentResponse(StudentBase):
    student_id: int
    guardian_id: Optional[int] = None
    kelas_sekolah: Optional[int] = None
    tingkatan_diniyah: Optional[str] = None

    class Config:
        from_attributes = True

# --- MealLog Schemas ---
class MealLogBase(BaseModel):
    student_id: int
    meal_type: MealTypeEnum

class MealLogCreate(MealLogBase):
    pass

class MealLogResponse(MealLogBase):
    meal_log_id: int
    timestamp: datetime
    sync_status: bool

    class Config:
        from_attributes = True

# --- Attendance Schemas ---
class AttendanceBase(BaseModel):
    student_id: int
    type: AttendanceTypeEnum
    status: AttendanceStatusEnum

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    attendance_id: int
    timestamp: datetime
    sync_status: bool

    class Config:
        from_attributes = True

# --- RFID Request Schemas ---
class RFIDScanRequest(BaseModel):
    rfid_uid: str

class RFIDAttendanceRequest(RFIDScanRequest):
    attendance_type: AttendanceTypeEnum

# --- Tahfidz Schemas ---
class TahfidzRecordBase(BaseModel):
    surah: str
    start_ayat: int
    end_ayat: int
    grade: str
    notes: Optional[str] = None

class TahfidzRecordCreate(TahfidzRecordBase):
    student_id: int
    ustadz_user_id: int
    date_recorded: date

class TahfidzRecordResponse(TahfidzRecordBase):
    record_id: int
    student_id: int
    ustadz_user_id: int
    date_recorded: date
    sync_status: bool

    class Config:
        from_attributes = True

class TahfidzStudentProfile(BaseModel):
    student: StudentResponse
    recent_records: List[TahfidzRecordResponse]

# --- Financial Schemas ---
class TransactionRequest(BaseModel):
    rfid_uid: str
    amount: float
    type: TransactionTypeEnum
    description: str

class TransactionResponse(BaseModel):
    transaction_id: int
    wallet_id: int
    amount: float
    type: TransactionTypeEnum
    description: str
    created_at: datetime
    current_balance: float

    class Config:
        from_attributes = True

class PaymentTransactionBase(BaseModel):
    billing_id: int
    amount_paid: float
    notes: Optional[str] = None

class PaymentTransactionCreate(PaymentTransactionBase):
    pass

class PaymentTransactionResponse(PaymentTransactionBase):
    id: int
    payment_date: datetime
    sync_status: bool

    class Config:
        from_attributes = True

class BillingBase(BaseModel):
    student_id: int
    month: str
    year: str
    total_amount: float
    details: str

class BillingCreate(BillingBase):
    pass

class BillingBulkCreate(BaseModel):
    gender: GenderEnum
    month: str
    year: str
    total_amount: float
    details: str

class BillingResponse(BillingBase):
    id: int
    status: str
    sync_status: bool
    transactions: List[PaymentTransactionResponse] = [] # Helpful for frontend

    class Config:
        from_attributes = True

class BillingWithStudentResponse(BillingResponse):
    student: StudentResponse

class AnnouncementResponse(BaseModel):
    announcement_id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class StudentFinancialProfile(BaseModel):
    student: StudentResponse
    balance: float

# --- Monitor Log Schemas ---
class LogStudentInfo(BaseModel):
    full_name: str
    student_class: str
    nis: str

class AttendanceLogLatest(BaseModel):
    attendance_id: int
    timestamp: datetime
    type: AttendanceTypeEnum
    status: AttendanceStatusEnum
    student: LogStudentInfo

class MealLogLatest(BaseModel):
    meal_log_id: int
    timestamp: datetime
    meal_type: MealTypeEnum
    student: LogStudentInfo

class LatestLogsResponse(BaseModel):
    attendance: List[AttendanceLogLatest]
    meals: List[MealLogLatest]

# --- Academic & Discipline Extension Schemas ---

class TeacherBase(BaseModel):
    nip: str
    full_name: str
    subject: str

class TeacherCreate(TeacherBase):
    status: Optional[str] = "ACTIVE"

class TeacherResponse(TeacherBase):
    teacher_id: int
    status: str

    class Config:
        from_attributes = True

class TeacherAttendanceBase(BaseModel):
    teacher_id: int
    schedule_id: Optional[int] = None
    date: date
    status: str
    notes: Optional[str] = None

class TeacherAttendanceCreate(TeacherAttendanceBase):
    pass

class TeacherAttendanceResponse(TeacherAttendanceBase):
    id: int
    timestamp: datetime
    sync_status: bool

    class Config:
        from_attributes = True

class StudentLeaveBase(BaseModel):
    student_id: int
    start_date: date
    end_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    reason: str
    notes: Optional[str] = None

class StudentLeaveCreate(StudentLeaveBase):
    pass

class StudentLeaveResponse(StudentLeaveBase):
    id: int
    is_returned: bool
    return_timestamp: Optional[datetime] = None
    sync_status: bool

    class Config:
        from_attributes = True


class StudentViolationBase(BaseModel):
    student_id: int
    violation_date: date
    violation_type: str
    punishment: str
    points: int = 0

class StudentViolationCreate(StudentViolationBase):
    pass

class StudentViolationResponse(StudentViolationBase):
    id: int
    sync_status: bool

    class Config:
        from_attributes = True

# --- Schedule Schemas ---

class ClassScheduleBase(BaseModel):
    teacher_id: int
    student_class: str
    subject: str
    day_of_week: str
    start_time: str
    end_time: str

class ClassScheduleCreate(ClassScheduleBase):
    pass

class ClassScheduleResponse(ClassScheduleBase):
    schedule_id: int
    sync_status: bool

    class Config:
        from_attributes = True

# --- Medical (Health) Schemas ---
class MedicalRecordBase(BaseModel):
    student_id: int
    complaint: str
    diagnosis: Optional[str] = None
    medicine_given: Optional[str] = None

class MedicalRecordCreate(MedicalRecordBase):
    handled_by_user_id: int

class MedicalRecordUpdate(BaseModel):
    diagnosis: Optional[str] = None
    medicine_given: Optional[str] = None
    is_recovered: Optional[bool] = None

class MedicalRecordResponse(MedicalRecordBase):
    medical_id: int
    handled_by_user_id: int
    timestamp: datetime
    is_recovered: bool
    sync_status: bool

    class Config:
        from_attributes = True

class MedicalRecordDetailResponse(MedicalRecordResponse):
    student_name: str
    handler_name: str

# --- Ranking Schemas ---
class StudentRankingBase(BaseModel):
    student_id: int
    category: str
    position: int
    month: str
    year: str
    notes: Optional[str] = None

class StudentRankingCreate(StudentRankingBase):
    created_by_user_id: int

class StudentRankingResponse(StudentRankingBase):
    ranking_id: int
    created_by_user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class StudentRankingDetailResponse(StudentRankingResponse):
    student_name: str
    student_class: str

# --- Gallery Schemas ---
class GalleryBase(BaseModel):
    title: str
    url: str
    category: str

class GalleryCreate(GalleryBase):
    uploaded_by_user_id: int

class GalleryResponse(GalleryBase):
    gallery_id: int
    uploaded_by_user_id: int
    created_at: datetime
    uploader_name: str

    class Config:
        from_attributes = True
