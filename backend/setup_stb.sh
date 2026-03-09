#!/bin/bash
# Script Instalasi Backend Pesantren di STB Armbian 64-bit

echo "===================================================="
echo " Memulai Setup Backend Pesantren di STB Armbian..."
echo "===================================================="

# 1. Update system dan install dependensi dasar
echo "[1/4] Mengupdate sistem dan menginstal dependensi Python..."
sudo apt update || true
sudo apt install -y python3 python3-pip python3-venv sqlite3 build-essential libpq-dev git || true

# 2. Setup Virtual Environment
echo "[2/4] Membuat Virtual Environment..."
python3 -m venv venv
source venv/bin/activate

# 3. Instalasi Requirements
echo "[3/4] Menginstal pustaka Python dari requirements.txt..."
# Pastikan pip update ke versi terbaru
pip install --upgrade pip
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    
    # Instal library tambahan untuk koneksi Postgres/Supabase jika belum ada
    pip install psycopg2-binary
else
    echo "⚠️ Warning: requirements.txt tidak ditemukan! Lewati instalasi pip."
fi

# 4. Setup File Env
echo "[4/4] Memeriksa file .env..."
if [ ! -f ".env" ]; then
    echo "Membuat template .env..."
    cat <<EOT >> .env
# Ganti dengan URL Cloud Supabase Anda (Pakai connection pooling / port 6543 jika didukung)
CLOUD_DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# JWT Secret untuk Autentikasi
SECRET_KEY="ganti_dengan_secret_key_yang_sangat_rumit_dan_panjang"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES="1440"
EOT
    echo "✅ File .env berhasil dibuat. SILAKAN EDIT file .env ini dengan kredensial Supabase Anda!"
else
    echo "✅ File .env sudah ada."
fi

echo "===================================================="
echo " Setup Selesai!"
echo " Silakan edit file .env lalu jalankan service dengan systemd."
echo "===================================================="
