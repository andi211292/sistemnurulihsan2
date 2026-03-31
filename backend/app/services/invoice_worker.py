import asyncio
from datetime import datetime
from ..database import SessionLocal
from ..models import FeeDefinition, Student, StudentPayment, PaymentStatusEnum
import logging

logger = logging.getLogger(__name__)

def _get_current_periode_label(tipe: str, dt: datetime) -> str:
    if tipe == "BULANAN":
        return f"{dt.year}-{dt.month:02d}"
    elif tipe == "SEMESTER":
        sem = 1 if dt.month <= 6 else 2
        return f"{dt.year}-S{sem}"
    elif tipe in ("TAHUNAN", "INSIDENTAL"):
        return str(dt.year)
    return str(dt.year)

async def start_invoice_worker():
    """
    Background worker that wakes up daily.
    If today is the 10th of the month, system automatically generates invoices
    for the CURRENT month for all active students and active fee definitions.
    """
    logger.info("Invoice Auto-Generator Worker started.")
    while True:
        try:
            now = datetime.now()
            
            # Cek apakah hari ini tanggal 10
            if now.day == 10:
                logger.info(f"Tanggal 10 terdeteksi. Mulai generate massal untuk {now.strftime('%Y-%m')}")
                
                db = SessionLocal()
                try:
                    active_fees = db.query(FeeDefinition).filter(FeeDefinition.is_active == True).all()
                    active_students = db.query(Student).filter(Student.is_active == True).all()

                    created = 0
                    for st in active_students:
                        for fee in active_fees:
                            # Tentukan periode label berdasarkan bulan INI
                            tipe_val = fee.tipe_periode.value if hasattr(fee.tipe_periode, 'value') else str(fee.tipe_periode)
                            p_label = _get_current_periode_label(tipe_val, now)

                            exists = db.query(StudentPayment).filter(
                                StudentPayment.student_id == st.student_id,
                                StudentPayment.fee_definition_id == fee.id,
                                StudentPayment.periode_label == p_label
                            ).first()

                            if not exists:
                                new_invoice = StudentPayment(
                                    student_id=st.student_id,
                                    fee_definition_id=fee.id,
                                    periode_label=p_label,
                                    nominal_dibayar=0.0,
                                    status=PaymentStatusEnum.BELUM_BAYAR,
                                    catatan="Auto-generate by System Server"
                                )
                                db.add(new_invoice)
                                created += 1

                    if created > 0:
                        db.commit()
                        logger.info(f"Berhasil meng-generate {created} tagihan otomatis.")
                    else:
                        logger.info("Skip. Semua tagihan bulan ini sudah di-generate sebelumnya.")
                        
                except Exception as e:
                    logger.error(f"Error in invoice worker DB logic: {e}")
                    db.rollback()
                finally:
                    db.close()
                    
            # Tidur selama 24 jam (cek besok lagi)
            # Kita set 12 jam aja supaya aman (misal server restart siang/malam)
            # atau cek setiap jam lebih aman.
            # Cek setiap jam (3600 detik). Kalau sudah di tanggal 10, dia akan cek. 
            # Karena Idempotent (if not exists), aman di-run berkali-kali dalam tanggal 10.
            await asyncio.sleep(3600)
            
        except asyncio.CancelledError:
            logger.info("Invoice worker cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in invoice worker loop: {e}")
            await asyncio.sleep(3600)
