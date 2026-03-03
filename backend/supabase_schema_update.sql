-- Jalankan query ini di SQL Editor Supabase untuk menambah kolom batas jajan harian

ALTER TABLE students ADD COLUMN IF NOT EXISTS batas_jajan_harian INTEGER DEFAULT 15000;
