# System Architecture & Master Plan Document
**Sistem Manajemen Pondok Pesantren Nurul Ihsan Karangmangu**

Dokumen ini adalah cetak biru (blueprint) mutlak yang menjadi panduan arsitektur sistem bagi seluruh tim pengembang (Frontend, Backend, dan Integrasi Hardware).

---

## 1. Pilar Arsitektur Utama (Local-First & Cloud Sync)

Sistem ini dirancang untuk mengatasi masalah koneksi internet yang tidak stabil di lingkungan pesantren. Pendekatan yang digunakan mengutamakan kecepatan pemrosesan data lokal (*Zero-Latency*) dengan dukungan akses *Cloud* untuk wali santri.

*   **Pilar 1: Local-First (Server Pesantren):**
    *   **Infrastruktur:** Komputer/Server lokal pesantren yang terhubung jaringan LAN/WiFi internal.
    *   **Database:** SQLite (Sangat ringan, cepat, memproses transaksi secara luring).
    *   **Backend:** FastAPI (Python). Menangani API request secara lokal dari semua reader RFID dan aplikasi *dashboard* admin.
    *   **Operasional Utama:** Memastikan *tap* kartu (absensi rutin, transaksi kantin, antrean makan) berjalan instan tanpa perlu menunggu respons dari internet.
*   **Pilar 2: Cloud Sync (Sinkronisasi Internet):**
    *   **Infrastruktur:** Database Cloud (PostgreSQL via Supabase/AWS) dan Server Next.js.
    *   **Mekanisme:** *Background Worker* di server lokal secara periodik mengecek koneksi internet. Jika tersedia, proses sinkronisasi 2 arah berjalan (Push log transaksi ke Cloud, dan Pull data top-up/tagihan dari Cloud).
    *   **Pilar 3: Frontend Ecosystem (Next.js & Tailwind):**
        *   **Dasbor Admin Lokal:** Aplikasi web untuk admin, ustadz, dan layar operasional (Kiosk) di dalam jaringan pesantren.
        *   **Portal Online Wali Santri:** PWA (Progressive Web App) berbasis *Cloud* untuk memantau aktivitas anak dari rumah.

---

## 2. Alur Kerja (Workflow) Per Modul

### A. Modul Integrasi RFID (Absensi & E-Money)
*   **Kehadiran (Absensi):** Santri *tap* kartu pintar pada reader yang terhubung ke jaringan lokal $\rightarrow$ Layar Kiosk memanggil endpoint FastAPI lokal $\rightarrow$ Data masuk ke SQLite dengan penanda waktu. Status `sync_status` adalah `false`.
*   **Kontrol Porsi Ruang Makan:** Santri *tap* kartu di pintu masuk $\rightarrow$ FastAPI mengecek jatah makan hari itu di SQLite $\rightarrow$ Jika jatah masih ada, saldo berkurang 1 dan gerbang/layar berbunyi "Sukses". Jika jatah habis, peringatan "Jatah Habis" muncul, mencegah santri mengambil makanan dua kali dan menjaga suplai dapur.
*   **Transaksi Kantin/Koperasi (Local E-Money):** Kasir memasukkan item jajan $\rightarrow$ Santri men-*tap* kartu RFID $\rightarrow$ Transaksi dicatat langsung ke SQLite, memotong saldo elektronik lokal dalam hitungan milidetik. Setelah tersinkron, riwayat jajan ini akan muncul pada HP wali santri.

### B. Modul Akademik & Tahfidz
*   **Jurnal Hafalan:** Ustadz/Musyrif membuka *Dasbor Admin Lokal* (via tablet/laptop) pada jam simaan $\rightarrow$ Memilih nama santri dan merekam rentang surah/ayat, nilai, dan evaluasi $\rightarrow$ Data tersimpan secara lokal dan siap dikirim ke Cloud untuk diakses wali santri keesokan harinya/saat internet normal.
*   **Mutaba'ah Yaumiyyah:** Absensi shalat berjamaah 5 waktu, bacaan mufrodat, dan puasa sunnah dicatat berkala oleh pengurus asrama menggunakan UI yang dioptimalkan agar ramah dan cepat digunakan oleh Ustadz.

### C. Modul Kesehatan
*   **Rekam Medis Ringan:** Bagian klinik atau pengasuh asrama dapat mendata keluhan santri yang sakit. Data berisi: Waktu keluhan, Diagnosis umum (misal: Demam/Batuk), dan Obat yang diberikan.
*   **Informasi Cepat:** Transparansi medis ini membantu wali santri mengetahui kondisi kesehatan putra-putrinya melalui *Portal Online* secara *real-time* begitu data tersinkronisasi.

### D. Modul Portal Wali Santri & Keuangan
*   **Top-Up E-Money:** Wali santri masuk ke *Portal PWA* (Cloud) $\rightarrow$ Melakukan Top-Up Saldo Uang Jajan via Transfer/Payment Gateway $\rightarrow$ Uang masuk Cloud PostgreSQL $\rightarrow$ Server lokal menarik data (Pull Sync) $\rightarrow$ Saldo santri di pesantren otomatis bertambah.
*   **Pantauan Syahriyah:** Bagian Keuangan pesantren merilis tagihan bulanan (Syahriyah) dan daftar ulang semester dari sistem lokal. Tagihan dipublikasi (Push Sync) ke *Portal Wali Santri* agar orang tua bisa melihat rincian biaya yang harus dibayar bulan ini.
*   **Monitoring Aktivitas:** Wali santri bisa mengecek dengan akurat apakah anaknya hadir di kelas, ikut shalat berjamaah, dan uang jajannya habis dibelikan apa saja di koperasi sekolah.

---

## 3. Struktur Database Relasional (Schema Lokal SQLite)

Berikut fondasi tabel yang telah dan akan digunakan secara terpadu.

### 1. Entitas Induk (Master Data)
*   `Users` (Akun sistem) : `user_id` (PK), `username`, `password_hash`, `role` (ADMIN, USTADZ, WALI).
*   `Guardians` (Wali santri) : `guardian_id` (PK), `user_id` (FK), `full_name`, `phone`.
*   `Students` (Data Santri) : `student_id` (PK), `nis` (Unik), `rfid_uid` (Unik), `full_name`, `class`, `dormitory`, `guardian_id` (FK).

### 2. Transaksi & RFID
*   `Wallets` (Dompet lokal) : `wallet_id` (PK), `student_id` (FK), `balance` (Float).
*   `Transactions` (Riwayat E-Money) : `transaction_id`, `wallet_id` (FK), `amount`, `type` (TOPUP/PAYMENT), `sync_status`.
*   `MealLogs` (Catatan jatah makan) : `meal_log_id`, `student_id` (FK), `meal_type` (PAGI/SIANG), `timestamp`, `sync_status`.
*   `Attendances` (Absensi) : `attendance_id`, `student_id`, `type` (KLASIKAL/SUBUH), `status`, `timestamp`.

### 3. Akademik & Rekam Medis
*   `TahfidzRecords` : `record_id`, `student_id`, `surah`, `start_ayat`, `end_ayat`, `grade`.
*   `MutabaahRecords` : `mut_id`, `student_id`, `type` (TAHAJUD/DHUHA), `is_done` (Bool).
*   `MedicalRecords` : `medical_id`, `student_id`, `complaint`, `diagnosis`, `medicine_given`.

### 4. Keuangan Administratif
*   `Invoices` (Tagihan) : `invoice_id`, `student_id`, `title`, `amount`, `due_date`, `status` (UNPAID/PAID).
*   `Payments` (Pembayaran wali) : `payment_id`, `invoice_id`, `amount_paid`, `status` (PENDING/VERIFIED).

*(Semua tabel transaksi yang dihasilkan lokal memiliki *field* `sync_status` (Boolean) untuk melacak apakah *row* data ini sudah terunggah ke Cloud atau belum).*

---

## 4. Daftar API Endpoints FastAPI (Next Development Targets)

Daftar rute spesifik yang perlu diselesaikan dalam tahap pengkodean Backend Python berikutnya:

### A. Rute Utama (Core Data)
*   `GET /api/students` : Menarik semua data santri (dapat di-filter).
*   `GET /api/students/{id}` : Detail santri spesifik beserta sisa wallet.
*   `GET /api/guardians/{id}/portal` : JSON Ringkasan komprehensif seorang wali santri (anak, tagihan, saldo).

### B. Rute Modul RFID Berkecepatan Tinggi
*   `POST /api/rfid/scan-canteen` : Mengeksekusi pengurangan saldo `Wallets` untuk pembelian di kantin. Mereturn struk JSON.
*   `POST /api/rfid/scan-meal` : Mengecek jatah `MealLogs`. Jika sukses, data di-*insert*. Jika telah makan, kembalikan HTTP 403 Forbidden.
*   `POST /api/rfid/scan-attendance` : Merekam kedatangan `Attendances` di sekolah/asrama.

### C. Rute Input (Ustadz & Admin)
*   `POST /api/academic/tahfidz` : Memasukkan jurnal hafalan santri.
*   `POST /api/academic/mutabaah/bulk` : *Batch update* centangan ibadah yaumiyyah untuk satu asrama sekaligus.
*   `POST /api/health/record` : Menambahkan log diagnosis sakit.

### D. Rute Keuangan & Sinkronisasi
*   `POST /api/finance/invoices` : *Generate* tagihan SPP bulanan ke ratusan santri secara asinkron.
*   `POST /api/sync/push` : Memicu aksi pengiriman semua tabel bersyarat `sync_status = false` ke server Cloud.
*   `GET /api/sync/pull` : Mengambil data konfirmasi mutasi *Top-Up* dan SPP dari Cloud PostgreSQL.

---

## 5. Struktur Halaman Web (UI/UX Routing - Next.js)

### Dasbor Admin Lokal (Operasional Pesantren)
Dijalankan minimal di PC/Tablet menggunakan jaringan Router LAN.
*   `.../login` : Autentikasi Admin/Ustadz.
*   `.../dashboard` : Visualisasi (Chart) persentase santri masuk, total uang berputar di kantin, dll.
*   `.../master/students` : Halaman pendaftaran santri baru dan sinkronisasi kartu fisik (Kloning RFID Mfare/125KHz).
*   `.../kiosk/pos-canteen` : Tampilan khusus kasir (*Point of Sales*). Berisi gambar kotak menu/snack, dengan trigger "Tap Kartu" di langkah akhir.
*   `.../kiosk/dining-hall` : Layar *display* besar hanya menampilkan hijau (Silakan) & merah (Sudah Mengambil).
*   `.../guru/tahfidz-journal` : Halaman form *dropdown* nama santri dan surah yang cepat.
*   `.../admin/billing/generate` : Pembuatan dan verifikasi SPP santri.

### Portal Online Wali Santri (PWA Cloud)
Dapat di-*install* lewat browser HP ke layar depan (*Add to Homescreen*). User-Interface dirancang selucu dan sejelas mungkin layaknya aplikasi *Mobile Banking*.
*   `.../parent/login` : *Sign-In* simpel.
*   `.../parent/home` : *Widgets* Saldo Anak (dengan tombol topup), Notifikasi Sakit (jika ada), Info terbaru.
*   `.../parent/finance/e-money` : Tab log lengkap jam berapa anak jajan, di toko mana, habis berapa rupiah.
*   `.../parent/finance/syahriyah` : List kartu berwarna merah (Belum Lunas), hijau (Lunas), disertakan *Virtual Account*/Instruksi Bayar.
*   `.../parent/academic/progress` : Grafik batang evaluasi tahfidz. Rapor mini mutaba'ah.
*   `.../parent/health/log` : Laporan rawat inap/jalan riwayat poliklinik pesantren.
