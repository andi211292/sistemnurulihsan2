import os
import subprocess
import sys
from pathlib import Path

def convert_html_to_pdf():
    html_path = Path("d:/sistemnurulihsan/docs/Buku_Panduan_Pengguna.html").resolve()
    pdf_path = Path("d:/sistemnurulihsan/docs/Buku_Panduan_Pengguna.pdf").resolve()
    
    if not html_path.exists():
        print(f"[Error] File HTML tidak ditemukan: {html_path}")
        sys.exit(1)
        
    print(f"[Info] Memulai konversi ke PDF...")
    print(f"[Info] Input HTML: {html_path}")
    print(f"[Info] Output PDF: {pdf_path}")
    
    # Daftar kemungkinan browser di Windows (Edge & Chrome)
    browser_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "msedge",
        "chrome"
    ]
    
    selected_browser = None
    for path in browser_paths:
        if path in ["msedge", "chrome"]:
            # Cek via PATH
            try:
                res = subprocess.run([path, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if res.returncode == 0:
                    selected_browser = path
                    break
            except Exception:
                continue
        elif os.path.exists(path):
            selected_browser = path
            break
            
    if not selected_browser:
        print("[Error] Tidak menemukan Microsoft Edge atau Google Chrome di komputer Anda.")
        print("Silakan buka file Buku_Panduan_Pengguna.html di browser dan tekan Ctrl+P -> Simpan sebagai PDF.")
        sys.exit(1)
        
    print(f"[Info] Menggunakan browser: {selected_browser}")
    
    cmd = [
        selected_browser,
        "--headless",
        "--disable-gpu",
        f"--print-to-pdf={str(pdf_path)}",
        str(html_path)
    ]
    
    try:
        subprocess.run(cmd, check=True)
        if pdf_path.exists():
            print(f"\n[SUKSES] PDF Berhasil dibuat: {pdf_path}")
            print(f"Ukuran file: {os.path.getsize(pdf_path) / 1024:.2f} KB")
        else:
            print("[Gagal] File PDF tidak terbentuk.")
    except Exception as e:
        print(f"[Error saat konversi]: {e}")

if __name__ == "__main__":
    convert_html_to_pdf()
