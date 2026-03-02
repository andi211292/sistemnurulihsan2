import asyncio
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import ArgumentError, OperationalError
from .. import models
from ..database import SessionLocal
from ..database_cloud import CloudSessionLocal, cloud_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYNC_INTERVAL_SECONDS = 60 # 1 minute for testing

async def sync_data_to_cloud():
    """
    Background worker that syncs data from Local SQLite to Cloud PostgreSQL
    One-way sync: Local -> Cloud depending on sync_status
    """
    if not CloudSessionLocal or not cloud_engine:
        logger.warning(f"[{datetime.now()}] Worker aktif, namun URL Database Cloud kosong. Abaikan sinkronisasi.")
        return

    # Check mapping mapping of cloud engine models initially
    try:
        # We ensure cloud schema has the latest models (Usually done via migrations or manual)
        models.Base.metadata.create_all(bind=cloud_engine)
    except Exception as e:
         logger.warning(f"[{datetime.now()}] Gagal memverifikasi tabel Cloud (Internet mungkin mati): {e}")

    logger.info(f"[{datetime.now()}] Cloud Sync Worker berjalan di latar belakang (Setiap {SYNC_INTERVAL_SECONDS} detik).")

    while True:
        try:
            # Create isolated sessions for this cycle
            local_db = SessionLocal()
            cloud_db = CloudSessionLocal()
            
            try:
                # ====== 0. Sync Guardians (Wali Santri) ======
                try:
                    guardians_to_sync = local_db.query(models.Guardian).all()
                    if guardians_to_sync:
                        for guardian in guardians_to_sync:
                            guardian_dict = {
                                "guardian_id": guardian.guardian_id,
                                "user_id": guardian.user_id,
                                "full_name": guardian.full_name,
                                "phone": guardian.phone,
                                "address": guardian.address
                            }
                            stmt = pg_insert(models.Guardian).values(guardian_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['guardian_id'],
                                set_=guardian_dict
                            )
                            cloud_db.execute(stmt)
                        cloud_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    logger.error(f"Error syncing Guardians: {e}")

                # ====== 1. Sync Students (Santri) with Emoney Balance ======
                try:
                    from sqlalchemy import Table, MetaData, Column, Integer, String, Float
                    cloud_metadata = MetaData()
                    cloud_student_table = Table(
                        'students', cloud_metadata,
                        Column('student_id', Integer, primary_key=True),
                        Column('nis', String),
                        Column('rfid_uid', String),
                        Column('full_name', String),
                        Column('student_class', String),
                        Column('dormitory', String),
                        Column('gender', String),
                        Column('guardian_id', Integer),
                        Column('emoney_balance', Float)
                    )

                    students_to_sync = local_db.query(models.Student).all()
                    if students_to_sync:
                        for student in students_to_sync:
                            wallet = local_db.query(models.Wallet).filter(models.Wallet.student_id == student.student_id).first()
                            emoney_balance = wallet.balance if wallet else 0.0
                            
                            student_dict = {
                                "student_id": student.student_id,
                                "nis": student.nis,
                                "rfid_uid": student.rfid_uid,
                                "full_name": student.full_name,
                                "student_class": student.student_class,
                                "dormitory": student.dormitory,
                                "gender": student.gender.value if hasattr(student.gender, 'value') else student.gender,
                                "guardian_id": student.guardian_id,
                                "emoney_balance": emoney_balance
                            }
                            stmt = pg_insert(cloud_student_table).values(student_dict)
                            # Upsert logic (Update if exists) based on student_id primary key
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['student_id'],
                                set_=student_dict
                            )
                            cloud_db.execute(stmt)
                        cloud_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    logger.error(f"Error syncing Students: {e}")
                    
                # ====== 2. Sync Attendance (Kehadiran) ======
                try:
                    attendance_to_sync = local_db.query(models.Attendance).filter(
                        models.Attendance.sync_status == False
                    ).all()
                    
                    if attendance_to_sync:
                        for att in attendance_to_sync:
                            att_dict = {
                                "attendance_id": att.attendance_id,
                                "student_id": att.student_id,
                                "type": att.type,
                                "status": att.status,
                                "timestamp": att.timestamp,
                                "sync_status": True # Automatically true in cloud
                            }
                            stmt = pg_insert(models.Attendance).values(att_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['attendance_id'],
                                set_=att_dict
                            )
                            cloud_db.execute(stmt)
                            att.sync_status = True # Mark local as true
                        cloud_db.commit()
                        local_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    local_db.rollback()
                    logger.error(f"Error syncing Attendance: {e}")
                    
                # ====== 3. Sync Meal Logs (Log Makan) ======
                try:
                    meal_logs_to_sync = local_db.query(models.MealLog).filter(
                        models.MealLog.sync_status == False
                    ).all()
                    
                    if meal_logs_to_sync:
                        for meal in meal_logs_to_sync:
                            meal_dict = {
                                "meal_log_id": meal.meal_log_id,
                                "student_id": meal.student_id,
                                "meal_type": meal.meal_type,
                                "timestamp": meal.timestamp,
                                "sync_status": True
                            }
                            stmt = pg_insert(models.MealLog).values(meal_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['meal_log_id'],
                                set_=meal_dict
                            )
                            cloud_db.execute(stmt)
                            meal.sync_status = True
                        cloud_db.commit()
                        local_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    local_db.rollback()
                    logger.error(f"Error syncing MealLogs: {e}")
                    
                # ====== 4. Sync Tahfidz Records (Jurnal Hafalan) ======
                try:
                    tahfidz_records_to_sync = local_db.query(models.TahfidzRecord).filter(
                        models.TahfidzRecord.sync_status == False
                    ).all()
                    
                    if tahfidz_records_to_sync:
                        for record in tahfidz_records_to_sync:
                            record_dict = {
                                "record_id": record.record_id,
                                "student_id": record.student_id,
                                "ustadz_user_id": record.ustadz_user_id,
                                "surah": record.surah,
                                "start_ayat": record.start_ayat,
                                "end_ayat": record.end_ayat,
                                "grade": record.grade,
                                "date_recorded": record.date_recorded,
                                "notes": record.notes,
                                "sync_status": True
                            }
                            stmt = pg_insert(models.TahfidzRecord).values(record_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['record_id'],
                                set_=record_dict
                            )
                            cloud_db.execute(stmt)
                            record.sync_status = True
                        cloud_db.commit()
                        local_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    local_db.rollback()
                    logger.error(f"Error syncing Tahfidz: {e}")
                        
                # ====== 4.5. Sync Wallets ======
                try:
                    wallets_to_sync = local_db.query(models.Wallet).all()
                    if wallets_to_sync:
                        for wallet in wallets_to_sync:
                            wallet_dict = {
                                "wallet_id": wallet.wallet_id,
                                "student_id": wallet.student_id,
                                "balance": wallet.balance,
                                "last_updated": wallet.last_updated
                            }
                            stmt = pg_insert(models.Wallet).values(wallet_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['wallet_id'],
                                set_=wallet_dict
                            )
                            cloud_db.execute(stmt)
                        cloud_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    logger.error(f"Error syncing Wallets: {e}")

                # ====== 5. Sync Transactions (Transaksi Keuangan) ======
                logger_count = 0
                try:
                    transactions_to_sync = local_db.query(models.Transaction).filter(
                        models.Transaction.sync_status == False
                    ).all()
                    
                    if transactions_to_sync:
                        for trans in transactions_to_sync:
                            trans_dict = {
                                "transaction_id": trans.transaction_id,
                                "wallet_id": trans.wallet_id,
                                "amount": trans.amount,
                                "type": trans.type,
                                "description": trans.description,
                                "created_at": trans.created_at,
                                "sync_status": True
                            }
                            stmt = pg_insert(models.Transaction).values(trans_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['transaction_id'],
                                set_=trans_dict
                            )
                            cloud_db.execute(stmt)
                            trans.sync_status = True
                            logger_count += 1
                        cloud_db.commit()
                        local_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    local_db.rollback()
                    logger.error(f"Error syncing Transactions: {e}")

                # ====== 6. Sync Billings (Tagihan Syahriyah) ======
                try:
                    billings_to_sync = local_db.query(models.Billing).filter(
                        models.Billing.sync_status == False
                    ).all()
                    
                    if billings_to_sync:
                        for bill in billings_to_sync:
                            bill_dict = {
                                "id": bill.id,
                                "student_id": bill.student_id,
                                "month": bill.month,
                                "year": bill.year,
                                "total_amount": bill.total_amount,
                                "details": bill.details,
                                "status": bill.status.value if hasattr(bill.status, 'value') else bill.status,
                                "sync_status": True
                            }
                            stmt = pg_insert(models.Billing).values(bill_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['id'],
                                set_=bill_dict
                            )
                            cloud_db.execute(stmt)
                            bill.sync_status = True
                            logger_count += 1
                        cloud_db.commit()
                        local_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    local_db.rollback()
                    logger.error(f"Error syncing Billings: {e}")

                # ====== 7. Sync Payment Transactions (Cicilan) ======
                try:
                    payments_to_sync = local_db.query(models.PaymentTransaction).filter(
                        models.PaymentTransaction.sync_status == False
                    ).all()
                    
                    if payments_to_sync:
                        for pay in payments_to_sync:
                            pay_dict = {
                                "id": pay.id,
                                "billing_id": pay.billing_id,
                                "amount_paid": pay.amount_paid,
                                "payment_date": pay.payment_date,
                                "notes": pay.notes,
                                "sync_status": True
                            }
                            stmt = pg_insert(models.PaymentTransaction).values(pay_dict)
                            stmt = stmt.on_conflict_do_update(
                                index_elements=['id'],
                                set_=pay_dict
                            )
                            cloud_db.execute(stmt)
                            pay.sync_status = True
                            logger_count += 1
                        cloud_db.commit()
                        local_db.commit()
                except Exception as e:
                    cloud_db.rollback()
                    local_db.rollback()
                    logger.error(f"Error syncing Payment Transactions: {e}")

                if logger_count > 0:
                    logger.info(f"[{datetime.now()}] Sinkronisasi SUKSES: {logger_count} entri sinkronisasi baru dipush.")

            finally:
                local_db.close()
                cloud_db.close()

        except OperationalError as oe:
             # This happens if Internet is down or Supabase sleeps
             logger.warning(f"[{datetime.now()}] Gagal terhubung ke Cloud PostgreSQL (Internet mati/URL salah). Mencoba lagi nanti...")
        except Exception as e:
             logger.error(f"[{datetime.now()}] Terjadi kegagalan saat Sinkronisasi Cloud: {e}. Worker akan berjalan lagi dalam {SYNC_INTERVAL_SECONDS} detik.")
        
        # Suspend worker and wait 1 minute before resuming loop
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)

async def start_sync_worker():
    """Wrapper function to be used by FastAPI Lifespan"""
    await sync_data_to_cloud()
