# Buku Panduan Pengguna (User Manual)
**Sistem Manajemen & Absensi Pondok Pesantren Nurul Ihsan Karangmangu**

---

## Daftar Isi
1. [Pengantar & Akses Sistem](#1-pengantar--akses-sistem)
2. [Panduan untuk Guru / Ustadz](#2-panduan-untuk-guru--ustadz)
   - [A. Mencatat Jurnal Hafalan (Tahfidz)](#a-mencatat-jurnal-hafalan-tahfidz)
   - [B. Memantau & Rekap Absensi](#b-memantau--rekap-absensi)
   - [C. Mencatat Kedisiplinan & Prestasi](#c-mencatat-kedisiplinan--prestasi)
3. [Panduan untuk Bendahara / Bagian Keuangan](#3-panduan-untuk-bendahara--bagian-keuangan)
   - [A. Manajemen SPP & Syahriyah](#a-manajemen-spp--syahriyah)
   - [B. Top-Up Saldo E-Money Kantin/Koperasi](#b-top-up-saldo-e-money-kantinkoperasi)
   - [C. Laporan Keuangan & Rekap Transaksi](#c-laporan-keuangan--rekap-transaksi)
4. [Panduan untuk Pengurus Asrama & Bagian Kesehatan](#4-panduan-untuk-pengurus-asrama--bagian-kesehatan)
   - [A. Pencatatan Rekam Medis Santri](#a-pencatatan-rekam-medis-santri)
   - [B. Monitoring Kegiatan & Ibadah Yaumiyyah](#b-monitoring-kegiatan--ibadah-yaumiyyah)
5. [Panduan untuk Administrator IT](#5-panduan-untuk-administrator-it)
   - [A. Manajemen Data Santri & Kartu RFID](#a-manajemen-data-santri--kartu-rfid)
   - [B. Manajemen Akun Pengguna](#b-manajemen-akun-pengguna)
   - [C. Sinkronisasi Data Lokal ke Cloud](#c-sinkronisasi-data-lokal-ke-cloud)
6. [Panduan untuk Wali Santri (Portal Wali)](#6-panduan-untuk-wali-santri-portal-wali)

---

## 1. Pengantar & Akses Sistem
Sistem Pondok Pesantren Nurul Ihsan dirancang dengan arsitektur **Local-First & Cloud Sync**, artinya sistem tetap berjalan sangat cepat meskipun internet sedang tidak stabil atau mati.

- **Akses Lokal (Lingkungan Pesantren):** Gunakan browser (Chrome/Edge/Firefox) di PC, Laptop, atau Tablet yang terhubung ke WiFi/LAN Pesantren dan buka alamat server lokal (misal: `http://localhost:3000` atau IP server pesantren).
- **Akses Wali Santri (Portal Online):** Dapat diakses melalui HP dari mana saja melalui alamat portal web yang disediakan oleh admin pesantren.

---

## 2. Panduan untuk Guru / Ustadz

Modul ini dikhususkan bagi para pengajar dan musyrif untuk mengelola kegiatan akademik, tahfidz, serta kehadiran santri.

### A. Mencatat Jurnal Hafalan (Tahfidz)
1. Buka menu **Tahfidz** pada navigasi kiri dasbor.
2. Pilih **Kelas** atau **Asrama** santri yang sedang disimak.
3. Klik nama santri yang bersangkutan.
4. Masukkan rincian setoran:
   - **Surah** & **Ayat** (Awal - Akhir)
   - **Nilai / Grade** (misal: A, B, C atau Mumtaz, Jayyid Jiddan)
   - **Catatan Evaluasi** (misal: *Perbaiki makhroj huruf kha*, *Kelancaran sangat baik*)
5. Klik **Simpan**. Data akan otomatis tersimpan di database lokal dan tersinkron ke HP Wali Santri saat terhubung ke internet.

### B. Memantau & Rekap Absensi
1. Buka menu **Absensi**.
2. Anda dapat melihat log kehadiran santri yang melakukan *tap* kartu RFID secara *real-time* (baik absensi gerbang, shalat berjamaah, maupun kelas).
3. Untuk mengubah status secara manual (misal santri Izin atau Sakit), klik tombol **Edit Status** pada baris nama santri, lalu ubah menjadi **Hadir / Sakit / Izin / Alpa**.

### C. Mencatat Kedisiplinan & Prestasi
1. Buka menu **Kedisiplinan**.
2. Untuk mencatat pelanggaran atau penghargaan, klik tombol **Tambah Catatan**.
3. Pilih nama santri, kategori (Pelanggaran/Prestasi), poin, dan deskripsi kejadian.

---

## 3. Panduan untuk Bendahara / Bagian Keuangan

Modul Keuangan memudahkan pengelolaan arus kas pesantren, uang saku santri (E-Money), dan pembayaran SPP bulanan.

### A. Manajemen SPP & Syahriyah
1. Buka menu **Keuangan**.
2. Untuk membuat tagihan bulanan baru, pilih tab **Tagihan / Syahriyah** lalu klik **Generate Tagihan**.
3. Pilih bulan, tahun, dan nominal tagihan, lalu terapkan untuk seluruh santri atau kelas tertentu.
4. Ketika wali santri atau santri membayar langsung ke kantor, cari nama santri, lalu klik **Verifikasi Pembayaran / Bayar**. Status tagihan akan berubah menjadi **LUNAS (PAID)**.

### B. Top-Up Saldo E-Money Kantin/Koperasi
Sistem RFID mengizinkan santri berbelanja tanpa uang tunai (cashless) menggunakan kartu RFID/NFC.
1. Pada menu **Keuangan**, pilih tab **Top-Up Wallet / E-Money**.
2. Cari nama santri atau *tap* kartu RFID santri pada reader di meja bendahara.
3. Masukkan nominal uang tunai yang disetorkan oleh santri/wali (misal: `Rp 50.000` atau `Rp 100.000`).
4. Klik **Konfirmasi Top-Up**. Saldo dompet digital santri akan langsung bertambah dan bisa digunakan di mesin kasir kantin.

### C. Laporan Keuangan & Rekap Transaksi
1. Buka menu **Laporan Keuangan** atau **Laporan**.
2. Pilih rentang tanggal (Hari Ini, Minggu Ini, atau Bulan Ini).
3. Anda dapat melihat total pemasukan SPP, perputaran uang kantin, serta mengunduh (export) laporan dalam format yang tersedia untuk rekapitulasi kas.

---

## 4. Panduan untuk Pengurus Asrama & Bagian Kesehatan

### A. Pencatatan Rekam Medis Santri
Jika ada santri yang sakit atau berobat ke klinik pesantren:
1. Buka menu **Kesehatan**.
2. Klik **Tambah Rekam Medis**.
3. Cari nama santri.
4. Isi form pemeriksaan:
   - **Keluhan:** (misal: *Demam tinggi dan pusing sejak malam*)
   - **Diagnosis:** (misal: *Gejala Tipes / Demam*)
   - **Tindakan / Obat:** (misal: *Paracetamol 500mg, Istirahat di UKS*)
5. Klik **Simpan**. Wali santri akan dapat melihat riwayat medis ini di portal online sehingga mereka tetap tenang dan mengetahui perkembangan kesehatan anaknya.

### B. Monitoring Kegiatan & Ibadah Yaumiyyah
1. Buka menu **Monitor** atau **Ranking**.
2. Anda dapat memantau keaktifan santri, grafik kehadiran shalat subuh/berjamaah, dan peringkat kedisiplinan santri secara keseluruhan.

---

## 5. Panduan untuk Administrator IT

### A. Manajemen Data Santri & Kartu RFID
1. Buka menu **Santri**.
2. Untuk mendaftarkan santri baru, klik **Tambah Santri**, lalu isi Nomor Induk Santri (NIS), Nama Lengkap, Kelas, dan Asrama.
3. **Mendaftarkan Kartu RFID:**
   - Masuk ke detail santri atau form pendaftaran RFID.
   - Tempelkan kartu/keyfob baru ke alat reader sampai terdengar bunyi bip dan nomor UID (10 digit angka) muncul di kolom **RFID UID**.
   - Klik **Simpan**. Kartu kini resmi terikat dengan santri tersebut.

### B. Manajemen Akun Pengguna
1. Buka menu **Pengguna** atau **Guru**.
2. Di sini Admin dapat membuatkan akun baru untuk Ustadz, Bendahara, atau pengurus lainnya dengan menentukan hak akses (*Role*): `ADMIN`, `USTADZ`, atau `WALI`.

### C. Sinkronisasi Data Lokal ke Cloud
Sistem secara otomatis melakukan sinkronisasi secara latar belakang (*background sync*). Namun, jika Admin ingin memastikan data terbaru langsung naik ke server Cloud:
1. Pastikan koneksi internet pesantren aktif.
2. Pada dasbor atas, periksa indikator status sinkronisasi.
3. Klik tombol **Sync Sekarang / Push Sync** jika ingin memaksa pengiriman data transaksi lokal ke server pusat saat itu juga.

---

## 6. Panduan untuk Wali Santri (Portal Wali)

Wali santri tidak memerlukan instalasi aplikasi yang rumit. Portal dapat diakses melalui browser HP (Chrome / Safari):
1. Buka link **Portal Wali Santri** yang diberikan oleh pihak pesantren.
2. Login menggunakan **Nomor HP** atau **Username/PIN** yang telah didaftarkan oleh admin.
3. Pada halaman **Dashboard Wali**, orang tua dapat melihat:
   - **Status Kehadiran & Absensi Hari Ini** (Apakah anak sudah masuk kelas/asrama).
   - **Sisa Saldo Uang Jajan (E-Money)** serta rincian jajan di kantin.
   - **Jurnal Hafalan Quran (Tahfidz)** terbaru beserta catatan dari Ustadz pembimbing.
   - **Tagihan Syahriyah/SPP** yang belum dibayar maupun riwayat pembayaran yang sudah lunas.
