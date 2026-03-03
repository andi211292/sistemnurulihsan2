from app.database import SessionLocal
from app.models import User, RoleEnum
from app.security import get_password_hash

def seed_all_admins():
    db = SessionLocal()
    
    # List of all roles to seed
    roles_to_seed = [
        {"username": "admin", "role": RoleEnum.SUPER_ADMIN},
        {"username": "kasir_pusat", "role": RoleEnum.KASIR_KOP_PUSAT},
        {"username": "kasir_luar", "role": RoleEnum.KASIR_KOP_LUAR},
        {"username": "kasir_syahriyah_pa", "role": RoleEnum.KASIR_SYAHRIYAH_PUTRA},
        {"username": "kasir_syahriyah_pi", "role": RoleEnum.KASIR_SYAHRIYAH_PUTRI},
        {"username": "pengurus_santri", "role": RoleEnum.PENGURUS_SANTRI},
        {"username": "pengurus_sekolah", "role": RoleEnum.PENGURUS_SEKOLAH},
        {"username": "guru_bp", "role": RoleEnum.GURU_BP},
        {"username": "keamanan", "role": RoleEnum.PENGURUS_KEAMANAN}
    ]

    try:
        for user_data in roles_to_seed:
            username = user_data["username"]
            role = user_data["role"]
            
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                print(f"⏩ User '{username}' already exists. Skipping.")
                continue

            new_user = User(
                username=username,
                password_hash=get_password_hash("nurulihsan123"),
                role=role,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            print(f"✅ User '{username}' created with role {role.name}")
            
    except Exception as e:
        print(f"❌ Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("⚡ Starting multi-admin seeder...")
    seed_all_admins()
    print("✅ Done seeding all roles!")
    print("\n--- DAFTAR AKUN DEFAULT ---")
    print("Password untuk semuanya adalah: nurulihsan123")
    print("- Administrator Pusat      : admin")
    print("- Kasir Koperasi Pusat     : kasir_pusat")
    print("- Kasir Warung Luar        : kasir_luar")
    print("- Kasir Syahriyah Putra    : kasir_syahriyah_pa")
    print("- Kasir Syahriyah Putri    : kasir_syahriyah_pi")
    print("- Pengurus Pelanggaran     : pengurus_santri")
    print("- Kurikulum / KBM          : pengurus_sekolah")
    print("- Guru BP (Izin RS/Sakit)  : guru_bp")
    print("- Pengurus Keamanan        : keamanan")
