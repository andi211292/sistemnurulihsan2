from app.database import SessionLocal
from app.models import User, RoleEnum
from app.security import get_password_hash

def seed_super_admin():
    db = SessionLocal()
    try:
        # Check if SUPER_ADMIN already exists
        existing_admin = db.query(User).filter(User.username == "admin").first()
        if existing_admin:
            print("❌ SUPER_ADMIN account already exists. Skipping.")
            return

        print("⚡ Creating standard SUPER_ADMIN account...")
        new_admin = User(
            username="admin",
            password_hash=get_password_hash("nurulihsan123"),
            role=RoleEnum.SUPER_ADMIN,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print("✅ SUPER_ADMIN successfully created!")
        print("Username: admin")
        print("Password: nurulihsan123")
    except Exception as e:
        print(f"❌ Error creating super admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_super_admin()
