from sqlalchemy.orm import Session
from . import models, schemas
import hashlib
from typing import Optional, List

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    # Simple hash for demonstration
    fake_hashed_password = hashlib.sha256(user.password.encode()).hexdigest()
    db_user = models.User(
        username=user.username,
        email=user.email,
        role=user.role,
        password_hash=fake_hashed_password,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def bulk_upsert_students(db: Session, students: List[schemas.StudentCreate]):
    # Upsert logic based on NIS
    count_inserted: int = 0
    count_updated: int = 0
    
    for st in students:
        existing = db.query(models.Student).filter(models.Student.nis == st.nis).first()
        if existing:
            # Update existing
            existing.full_name = st.full_name
            existing.student_class = st.student_class
            existing.dormitory = st.dormitory
            if hasattr(st, 'gender') and st.gender:
                existing.gender = st.gender
            if st.rfid_uid:
                existing.rfid_uid = st.rfid_uid
            count_updated += 1
        else:
            # Insert new
            new_st = models.Student(**st.model_dump())
            db.add(new_st)
            count_inserted += 1
            
    db.commit()
    return {"inserted": count_inserted, "updated": count_updated}

from datetime import datetime, date

def get_student_by_rfid(db: Session, rfid_uid: str):
    from sqlalchemy import or_
    query = db.query(models.Student).filter(
        or_(
            models.Student.rfid_uid == rfid_uid,
            models.Student.nis == rfid_uid
        )
    )
    if rfid_uid.isdigit():
        query = db.query(models.Student).filter(
            or_(
                models.Student.rfid_uid == rfid_uid,
                models.Student.nis == rfid_uid,
                models.Student.student_id == int(rfid_uid)
            )
        )
    return query.first()

def get_meal_log_today(db: Session, student_id: int, meal_type: models.MealTypeEnum):
    today = date.today()
    return db.query(models.MealLog).filter(
        models.MealLog.student_id == student_id,
        models.MealLog.meal_type == meal_type,
        models.MealLog.timestamp >= datetime.combine(today, datetime.min.time()),
        models.MealLog.timestamp <= datetime.combine(today, datetime.max.time())
    ).first()

def create_meal_log(db: Session, meal_log: schemas.MealLogCreate):
    db_meal_log = models.MealLog(
        student_id=meal_log.student_id,
        meal_type=meal_log.meal_type
    )
    db.add(db_meal_log)
    db.commit()
    db.refresh(db_meal_log)
    return db_meal_log

def create_attendance(db: Session, attendance: schemas.AttendanceCreate):
    db_attendance = models.Attendance(
        student_id=attendance.student_id,
        type=attendance.type,
        status=attendance.status
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def create_tahfidz_record(db: Session, record: schemas.TahfidzRecordCreate):
    db_record = models.TahfidzRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_recent_tahfidz_records(db: Session, student_id: int, limit: int = 5):
    return db.query(models.TahfidzRecord)\
             .filter(models.TahfidzRecord.student_id == student_id)\
             .order_by(models.TahfidzRecord.date_recorded.desc(), models.TahfidzRecord.record_id.desc())\
             .limit(limit)\
             .all()

def get_wallet_by_student(db: Session, student_id: int):
    # Auto-create if not exists
    wallet = db.query(models.Wallet).filter(models.Wallet.student_id == student_id).first()
    if not wallet:
        wallet = models.Wallet(student_id=student_id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet

def add_transaction(db: Session, wallet: models.Wallet, amount: float, trans_type: models.TransactionTypeEnum, description: str):
    new_trans = models.Transaction(
        wallet_id=wallet.wallet_id,
        amount=amount,
        type=trans_type,
        description=description
    )
    db.add(new_trans)
    
    if trans_type == models.TransactionTypeEnum.TOPUP:
        wallet.balance += amount
    elif trans_type == models.TransactionTypeEnum.PAYMENT:
        wallet.balance -= amount
    
    wallet.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(new_trans)
    return new_trans

def get_student_billings(db: Session, student_id: int):
    # Get all billings and pre-load their transactions
    billings = db.query(models.Billing).filter(
        models.Billing.student_id == student_id
    ).order_by(models.Billing.year.desc(), models.Billing.month.desc()).all()
    
    # Attach transactions manually or via relationship (we'll do manually for simplicity)
    for b in billings:
        b.transactions = db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.billing_id == b.id
        ).all()
        
    return billings

def get_billings_by_period(db: Session, month: Optional[str] = None, year: Optional[str] = None):
    query = db.query(models.Billing)
    if month and month != "Semua":
        query = query.filter(models.Billing.month == month)
    if year and year != "Semua":
        query = query.filter(models.Billing.year == year)
    
    billings = query.order_by(models.Billing.year.desc(), models.Billing.month.desc()).all()
    
    for b in billings:
        b.transactions = db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.billing_id == b.id
        ).all()
        
    return billings

def create_billing(db: Session, billing: schemas.BillingCreate):
    db_billing = models.Billing(
        student_id=billing.student_id,
        month=billing.month,
        year=billing.year,
        total_amount=billing.total_amount,
        details=billing.details,
        status=models.BillingStatusEnum.UNPAID
    )
    db.add(db_billing)
    db.commit()
    db.refresh(db_billing)
    return db_billing

def create_bulk_billings(db: Session, request: schemas.BillingBulkCreate):
    # Find all students with matching gender
    students = db.query(models.Student).filter(models.Student.gender == request.gender).all()
    count_created: int = 0
    count_skipped: int = 0
    
    for st in students:
        # Check if billing already exists for this student, month, and year
        existing = db.query(models.Billing).filter(
            models.Billing.student_id == st.student_id,
            models.Billing.month == request.month,
            models.Billing.year == request.year
        ).first()
        
        if existing:
            count_skipped += 1
            continue
            
        new_billing = models.Billing(
            student_id=st.student_id,
            month=request.month,
            year=request.year,
            total_amount=request.total_amount,
            details=request.details,
            status=models.BillingStatusEnum.UNPAID
        )
        db.add(new_billing)
        count_created += 1
        
    db.commit()
    return {"created": count_created, "skipped": count_skipped, "gender": request.gender.value}

def add_billing_payment(db: Session, billing_id: int, amount_paid: float, notes: Optional[str] = None, received_by_user_id: Optional[int] = None):
    # 1. Create Transaction
    payment = models.PaymentTransaction(
        billing_id=billing_id,
        amount_paid=amount_paid,
        notes=notes,
        received_by_user_id=received_by_user_id
    )
    db.add(payment)
    db.commit()
    
    # 2. Recalculate Billing Status
    billing = db.query(models.Billing).filter(models.Billing.id == billing_id).first()
    if billing:
        transactions = db.query(models.PaymentTransaction).filter(
            models.PaymentTransaction.billing_id == billing_id
        ).all()
        total_paid = sum([t.amount_paid for t in transactions])
        
        if total_paid >= billing.total_amount:
            billing.status = models.BillingStatusEnum.PAID
        else:
            billing.status = models.BillingStatusEnum.PARTIAL
            
        db.commit()
        db.refresh(billing)
        
    # Inject username dynamically for response
    if payment.received_by_user_id:
        user = db.query(models.User).filter(models.User.user_id == payment.received_by_user_id).first()
        if user:
            payment.receiver_name = user.username
        else:
            payment.receiver_name = "Unknown Admin"
    else:
        payment.receiver_name = "System"
        
    return payment

def get_recent_announcements(db: Session, limit: int = 10):
    return db.query(models.Announcement).filter(
        models.Announcement.is_published == True
    ).order_by(models.Announcement.created_at.desc()).limit(limit).all()

def get_latest_device_logs(db: Session, limit: int = 5):
    # Fetch recent attendance
    recent_attendance = db.query(models.Attendance, models.Student)\
        .join(models.Student, models.Attendance.student_id == models.Student.student_id)\
        .order_by(models.Attendance.timestamp.desc())\
        .limit(limit)\
        .all()
    
    # Fetch recent meals
    recent_meals = db.query(models.MealLog, models.Student)\
        .join(models.Student, models.MealLog.student_id == models.Student.student_id)\
        .order_by(models.MealLog.timestamp.desc())\
        .limit(limit)\
        .all()

    att_response = []
    for att, stu in recent_attendance:
        att_response.append({
            "attendance_id": att.attendance_id,
            "timestamp": att.timestamp,
            "type": att.type,
            "status": att.status,
            "student": {
                "full_name": stu.full_name,
                "student_class": stu.student_class,
                "nis": stu.nis
            }
        })
        
    meal_response = []
    for meal, stu in recent_meals:
        meal_response.append({
            "meal_log_id": meal.meal_log_id,
            "timestamp": meal.timestamp,
            "meal_type": meal.meal_type,
            "student": {
                "full_name": stu.full_name,
                "student_class": stu.student_class,
                "nis": stu.nis
            }
        })
        
    return {
        "attendance": att_response,
        "meals": meal_response
    }

# --- Expense CRUD ---
def get_expense_categories(db: Session):
    return db.query(models.ExpenseCategory).filter(models.ExpenseCategory.is_active == True).all()

def create_expense_category(db: Session, category: schemas.ExpenseCategoryCreate):
    db_category = models.ExpenseCategory(
        name=category.name,
        frequency=category.frequency,
        is_active=category.is_active
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_expenses(db: Session, month: Optional[int] = None, year: Optional[int] = None):
    query = db.query(models.Expense)
    
    if month and year:
        from sqlalchemy import extract
        query = query.filter(extract('month', models.Expense.expense_date) == month)
        query = query.filter(extract('year', models.Expense.expense_date) == year)
        
    expenses = query.order_by(models.Expense.expense_date.desc()).all()
    
    for exp in expenses:
        exp.category = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.category_id == exp.category_id).first()
        user = db.query(models.User).filter(models.User.user_id == exp.recorded_by_user_id).first()
        exp.recorded_by_name = user.username if user else "Admin"
        
    return expenses

def create_expense(db: Session, expense: schemas.ExpenseCreate, recorded_by_user_id: int):
    db_expense = models.Expense(
        category_id=expense.category_id,
        amount=expense.amount,
        expense_date=expense.expense_date,
        description=expense.description,
        recorded_by_user_id=recorded_by_user_id
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    # Attach nested items for response
    db_expense.category = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.category_id == db_expense.category_id).first()
    user = db.query(models.User).filter(models.User.user_id == db_expense.recorded_by_user_id).first()
    db_expense.recorded_by_name = user.username if user else "Admin"
    
    return db_expense
