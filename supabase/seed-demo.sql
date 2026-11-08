/**
 * Seed konten DEMO — generik & netral (guardrail PRD 7.9: tidak ada data pribadi rekaan).
 * Jalankan via supabase db query atau SQL editor. Idempotent.
 */
-- demo content set
insert into content_sets (name, kind, is_active)
select 'Demo Set', 'demo', true
where not exists (select 1 from content_sets where kind = 'demo');

-- games untuk demo set
insert into games (content_set_id, slug, title, config)
select cs.id, g.slug, g.title, g.config::jsonb
from content_sets cs,
(VALUES
  ('love-quiz','Love Quiz','{"totalQuestions":10}'),
  ('love-escape-room','Love Escape Room','{"maxHintsPerLevel":2,"maxAttempts":5}'),
  ('memory-lane','Memory Lane','{"photos":5}'),
  ('mystery-box','Mystery Box','{"openRule":"sequential"}'),
  ('guess-the-song','Guess the Song','{"rounds":5}'),
  ('catch-my-heart','Catch My Heart','{"durationSec":45,"scoreTarget":50,"spawnIntervalMs":800,"fallSpeed":160}')
) as g(slug,title,config)
where cs.kind = 'demo'
and not exists (select 1 from games gg where gg.content_set_id = cs.id and gg.slug = g.slug);

-- Love Quiz: 10 soal generik
insert into questions (game_id, type, "order", prompt, options, answer_key, personal_response)
select gg.id, 'multiple_choice', q.ord, q.prompt, q.opts::jsonb, q.ans, q.resp
from content_sets cs
join games gg on gg.content_set_id = cs.id and gg.slug = 'love-quiz',
(VALUES
 (1,'Apa warna favorit versi demo?','["Merah","Biru","Hijau","Ungu"]','Hijau','Hehe, jawaban demo: hijau memang menenangkan!'),
 (2,'Camilan favorit versi demo?','["Keripik","Cokelat","Buah","Biskuit"]','Cokelat','Cokelat memang favorit banyak orang 🍫'),
 (3,'Hobi yang paling menarik versi demo?','["Membaca","Menonton","Berkebun","Bermain game"]','Bermain game','Game seru, apalagi yang baru saja kita mainkan!'),
 (4,'Musim favorit versi demo?','["Panas","Hujan","Semi","Dingin"]','Hujan','Hujan cocok untuk tidur dan ngopi hangat ☕'),
 (5,'Minuman favorit versi demo?','["Kopi","Teh","Jus","Susu"]','Kopi','Kopi adalah ramuan pagi hari ☕'),
 (6,'Hari favorit versi demo?','["Senin","Rabu","Jumat","Minggu"]','Minggu','Minggu = hari santai!'),
 (7,'Warna bunga favorit versi demo?','["Merah muda","Kuning","Putih","Biru"]','Merah muda','Merah muda pas dengan tema hari ini 💗'),
 (8,'Film favorit versi demo?','["Drama","Komedi","Aksi","Animasi"]','Animasi','Animasi selalu menyenangkan!'),
 (9,'Tempat liburan impian versi demo?','["Pantai","Gunung","Kota","Desa"]','Pantai','Pantai dengan ombaknya… 🌊'),
 (10,'Makanan favorit versi demo?','["Nasi goreng","Mie ayam","Sate","Gado-gado"]','Nasi goreng','Nasi goreng selalu juara! 🍳')
) as q(ord,prompt,opts,ans,resp)
where cs.kind = 'demo'
and not exists (select 1 from questions qq where qq.game_id = gg.id and qq."order" = q.ord);

-- Love Escape Room: 5 level generik
insert into questions (game_id, type, "order", prompt, answer_key, hints, personal_response)
select gg.id, 'escape_level', e.ord, e.prompt, e.ans, e.hints::jsonb, e.resp
from content_sets cs
join games gg on gg.content_set_id = cs.id and gg.slug = 'love-escape-room',
(VALUES
 (1,'Level 1: Kode angka — jumlah huruf kata "DEMO" dikali 2?','8','["Hitung hurufnya: D-E-M-O","Lalu kalikan dua"]','Kode diterima! Pintu pertama terbuka 🚪'),
 (2,'Level 2: Petunjuk foto — berapa segitiga pada gambar demo (jawaban angka)?','3','["Cermati bentuk geometrinya","Hitung sisi tertutup"]','Tepat! Kamu jeli 👀'),
 (3,'Level 3: Tebak "lagu" demo — lagu pengantar tidur klasik dalam bahasa Indonesia?','ninabobo','["Judulnya nama orang","N-I-N-A ..."]','Benar! Melodi pun mengalir 🎵'),
 (4,'Level 4: Pesan rahasia — hasil dari 5+5+5?','15','["Penjumlahan sederhana","Lima tiga kali? bukan!"]','Pesan terbaca! 🔓'),
 (5,'Level 5: Password final — kata kunci hari spesial ini (satu kata, bahasa Indonesia)?','sayang','["Ini biasa diucapkan pasangan","S-…"]','Terbuka semua! Kamu luar biasa 💖')
) as e(ord,prompt,ans,hints,resp)
where cs.kind = 'demo'
and not exists (select 1 from questions qq where qq.game_id = gg.id and qq."order" = e.ord);

-- Memory Lane: 5 foto demo (placeholder ilustrasi generik)
insert into questions (game_id, type, "order", prompt, answer_key, personal_response)
select gg.id, 'memory_photo', m.ord, m.prompt, m.ans, m.resp
from content_sets cs
join games gg on gg.content_set_id = cs.id and gg.slug = 'memory-lane',
(VALUES
 (1,'Foto demo 1: berapa cangkir di gambar placeholder? (angka)','1','Demo: satu cangkir kopi hangat ☕'),
 (2,'Foto demo 2: warna dominan gambar placeholder?','pink','Demo: pink manis seperti tema ini 💗'),
 (3,'Foto demo 3: gambar placeholder menggambarkan apa?','bunga','Demo: bunga, tanda kasih 🌸'),
 (4,'Foto demo 4: huruf pertama pada gambar placeholder?','h','Demo: H untuk Her Day!'),
 (5,'Foto demo 5: jumlah hati pada gambar placeholder? (angka)','2','Demo: dua hati, kita berdua 💞')
) as m(ord,prompt,ans,resp)
where cs.kind = 'demo'
and not exists (select 1 from questions qq where qq.game_id = gg.id and qq."order" = m.ord);

-- Mystery Box: 9 kotak demo
insert into questions (game_id, type, "order", prompt, personal_response)
select gg.id, 'mystery_box', b.ord, b.prompt, b.resp
from content_sets cs
join games gg on gg.content_set_id = cs.id and gg.slug = 'mystery-box',
(VALUES
 (1,'Kotak 1 — buka?','Demo: "Hai! Ini awal petualanganmu hari ini 💗"'),
 (2,'Kotak 2 — buka?','Demo: "Tantangan: senyum selama 5 detik!"'),
 (3,'Kotak 3 — buka?','Demo: "Kamu hebat, sudah 3 kotak!"'),
 (4,'Kotak 4 — buka?','Demo: "Tantangan: sebut 3 hal yang kamu syukuri"'),
 (5,'Kotak 5 — buka?','Demo: "Setengah jalan! Semangat 💪"'),
 (6,'Kotak 6 — buka?','Demo: "Kejutan: beri pelukan virtual ke host 🤗"'),
 (7,'Kotak 7 — buka?','Demo: "Tantangan: tarian 10 detik 💃"'),
 (8,'Kotak 8 — buka?','Demo: "Hampir sampai! Kotak terakhir spesial…"'),
 (9,'Kotak 9 — buka?','Demo: "🎁 KEJUTAN TERAKHIR: hari ini semua tentang kamu!"')
) as b(ord,prompt,resp)
where cs.kind = 'demo'
and not exists (select 1 from questions qq where qq.game_id = gg.id and qq."order" = b.ord);

-- Guess the Song: 5 ronde demo (audio tone generik, jawaban teks)
insert into questions (game_id, type, "order", prompt, options, answer_key, personal_response)
select gg.id, 'song_round', s.ord, s.prompt, s.opts::jsonb, s.ans, s.resp
from content_sets cs
join games gg on gg.content_set_id = cs.id and gg.slug = 'guess-the-song',
(VALUES
 (1,'Ronde 1: jenis audio apa ini? (demo tone)','["Nada naik","Nada turun","Nada datar","Nada acak"]','Nada naik','Demo: nada naik seperti semangatmu! 🎵'),
 (2,'Ronde 2: genre demo ini?','["Pop","Rock","Jazz","Klasik"]','Klasik','Demo: klasik itu abadi 🎼'),
 (3,'Ronde 3: instrumen demo ini?','["Piano","Gitar","Drum","Biola"]','Piano','Demo: piano, lembut seperti hati 🎹'),
 (4,'Ronde 4: tempo demo ini?','["Cepat","Sedang","Lambat","Berubah-ubah"]','Lambat','Demo: lambat, santai saja 😌'),
 (5,'Ronde 5: suasana demo ini?','["Ceria","Melankolis","Epik","Misterius"]','Ceria','Demo: ceria seperti harimu! 🎉')
) as s(ord,prompt,opts,ans,resp)
where cs.kind = 'demo'
and not exists (select 1 from questions qq where qq.game_id = gg.id and qq."order" = s.ord);

-- Rewards demo
insert into rewards (content_set_id, slug, unlock_rule, title, body)
select cs.id, r.slug, r.rule, r.title, r.body::jsonb
from content_sets cs,
(VALUES
 ('love-note','love-quiz','Love Note','{"text":"Kartu cinta demo: setiap jawabanmu membuat hari ini lebih manis 💕"}'),
 ('memory-photo','love-escape-room','Memory Photo','{"caption":"Foto demo: kenangan dibuat, bukan ditunggu 📷"}'),
 ('secret-gift','memory-lane','Secret Gift','{"text":"Hadiah demo: kode voucher DEMO-2026 untuk pelukan gratis 🤗"}'),
 ('virtual-flowers','mystery-box','Virtual Flowers','{"text":"Buket demo: bunga digital yang tak pernah layu 🌷"}'),
 ('our-memories','guess-the-song','Our Memories','{"text":"Daftar lagu demo: lagu-lagu yang (akan) jadi soundtrack kita 🎶"}'),
 ('final-letter','catch-my-heart','Final Letter','{"paragraphs":["Surat demo: para 1…","Para 2…","Para 3… dengan cinta, hostmu 💖"]}')
) as r(slug,rule,title,body)
where cs.kind = 'demo'
and not exists (select 1 from rewards rr where rr.content_set_id = cs.id and rr.slug = r.slug);
