export interface GuideStep {
  title: string;
  detail: string;
}

export interface GuideSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  steps: GuideStep[];
  tips?: string[];
}

export const TECHNICAL_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'akses-umum',
    number: '01',
    title: 'Gambaran Umum & Akses Masuk',
    subtitle: 'Pengenalan sistem, mode pengelola tanpa PIN, suara pembuka, & tautan lihat saja',
    summary:
      'SIMPRA BPBPK NTB (TA. 2027–2030) adalah platform terpadu untuk sinkronisasi usulan program infrastruktur Cipta Karya sektor Air Minum (SPAM), Sanitasi, Penataan Kawasan Strategis (PKS), dan Bina Penataan Bangunan (BPB) di Provinsi Nusa Tenggara Barat.',
    steps: [
      {
        title: 'Masuk Dashboard Pengelola (Tanpa PIN)',
        detail:
          'Pada halaman Portal Akses awal, klik tombol "Buka Dashboard & Mulai Edit" untuk langsung masuk ke ruang kerja dengan hak pengeditan penuh tanpa memerlukan PIN autentikasi.',
      },
      {
        title: 'Suara Pembuka Otomatis',
        detail:
          'Dua rangkaian audio pembuka otomatis diputar saat aplikasi dibuka. Apabila browser menahan autoplay, klik banner "Suara Pembuka SIMPRA Siap Diputar" atau ketuk area mana saja di halaman. Gunakan tombol "Suara Pembuka / Hentikan Suara" pada header kanan atas untuk memutar ulang atau menghentikan audio.',
      },
      {
        title: 'Mode Pratinjau Publik (Lihat Saja / Read-Only)',
        detail:
          'Jika membuka tautan berbagi dengan parameter ?mode=lihat, aplikasi berjalan dalam mode Lihat Saja. Pengguna tetap dapat melihat matriks, peta GIS, infografis, profil usulan, dan mengunduh CSV/PDF, sedangkan tombol tambah, edit, hapus, dan simpan dinonaktifkan.',
      },
      {
        title: 'Kembali ke Portal Akses',
        detail:
          'Klik tombol "Portal Akses" di header kanan atas kapan saja untuk kembali melihat ringkasan jumlah paket terdaftar pada halaman pembuka.',
      },
    ],
    tips: [
      'Gunakan tombol "Petunjuk Teknis" di header atau sidebar kiri kapan saja untuk membuka panduan cepat ini.',
    ],
  },
  {
    id: 'navigasi-filter',
    number: '02',
    title: 'Navigasi Utama & Filter Data',
    subtitle: 'Berpindah antar-menu dan menyaring data berdasarkan sektor, tahun anggaran, & wilayah',
    summary:
      'Seluruh tampilan tabel, peta, infografis, dan proyeksi anggaran selalu mengikuti filter aktif secara real-time.',
    steps: [
      {
        title: '4 Menu Utama (Sidebar Kiri)',
        detail:
          'Pilih "Matriks Usulan & RC" untuk tabel rekapitulasi, "Fitur Spasial GIS" untuk pemetaan geografis, "Infografis Skor RC" untuk peringkat kesiapan dokumen, atau "Proyeksi 2027–2030" untuk grafik kebutuhan anggaran.',
      },
      {
        title: 'Filter Cakupan Sektor Teknis',
        detail:
          'Pada bagian bawah menu sidebar kiri, klik "Semua Sektor", "Air Minum", "Sanitasi", "PKS", atau "BPB". Angka di sebelah kanan menunjukkan jumlah paket aktif pada masing-masing sektor.',
      },
      {
        title: 'Filter Tahun Anggaran & Kabupaten/Kota',
        detail:
          'Gunakan panel filter di atas ruang kerja untuk memilih Tahun Anggaran (Semua TA, 2027, 2028, 2029, atau 2030) dan memilih Kabupaten/Kota se-NTB.',
      },
      {
        title: 'Pencarian Cepat Usulan',
        detail:
          'Ketik kata kunci pada kolom pencarian (kode usulan, nama program, kecamatan/kawasan, atau catatan teknis) untuk menyaring paket usulan secara instan.',
      },
    ],
    tips: [
      'Filter yang aktif akan ikut diterapkan saat mengekspor berkas CSV, GeoJSON, maupun mencetak PDF Infografis Skor RC.',
    ],
  },
  {
    id: 'matriks-rc',
    number: '03',
    title: 'Matriks Usulan & Edit Cepat RC',
    subtitle: 'Mengelola tabel usulan, pengurutan, edit inline, hapus massal, & ekspor data',
    summary:
      'Menu Matriks Usulan & RC menampilkan seluruh daftar paket program beserta rincian pagu tahunan dan atribut verifikasi RC dalam satu tabel interaktif.',
    steps: [
      {
        title: 'Edit Cepat Langsung di Sel Tabel',
        detail:
          'Kolom "Skor RC (%)", "Status", "Pembahasan dengan BPBPK NTB (Kali)", dan "Link Data RC" dapat diklik dan diubah langsung di dalam tabel. Perubahan otomatis tersimpan ke Cloud Database saat Anda keluar dari kolom.',
      },
      {
        title: 'Pengurutan Kolom',
        detail:
          'Klik judul kolom (Nama Program, Total Pagu, Skor RC, Status, atau Pembahasan dengan BPBPK NTB) untuk mengurutkan daftar secara menaik atau menurun.',
      },
      {
        title: 'Hapus Terpilih & Urungkan (Undo)',
        detail:
          'Centang kotak pilih di sebelah kiri baris untuk menghapus satu atau beberapa usulan sekaligus. Jika terjadi penghapusan tidak sengaja, segera klik tombol "Urungkan" pada bilah notifikasi atas.',
      },
      {
        title: 'Ekspor CSV & GeoJSON',
        detail:
          'Gunakan tombol "Unduh CSV" untuk mengunduh tabel matriks format spreadsheet (termasuk rincian pagu dan pembahasan) atau "Unduh GeoJSON" untuk keperluan perangkat lunak GIS.',
      },
    ],
  },
  {
    id: 'tambah-edit-form',
    number: '04',
    title: 'Tambah & Edit Formulir Usulan',
    subtitle: 'Pengisian formulir 5 bagian lengkap termasuk Isian Baru Dokumen RC',
    summary:
      'Klik tombol "Tambah Usulan" di header atau tombol "Edit" pada baris tabel/panel detail untuk membuka laci formulir lengkap.',
    steps: [
      {
        title: 'Bagian 1 — Identitas & Lokasi Spasial',
        detail:
          'Isi Kode Usulan, Nama Program, Sektor, Kabupaten/Kota, dan Kecamatan/Kawasan. Gunakan pencarian lokasi otomatis atau masukkan koordinat Lat/Lng manual.',
      },
      {
        title: 'Bagian 2 & 3 — Pagu Multi-Tahun, Output/Outcome & Jadwal',
        detail:
          'Masukkan pagu indikatif TA 2027, 2028, 2029, dan 2030 (dalam Rp Miliar), biaya fisik, biaya supervisi/MK, sumber dana, skema kontrak (SYC/MYC), latar belakang, dasar penugasan, lingkup pekerjaan, output, serta outcome.',
      },
      {
        title: 'Bagian 4 — Unggah Gambar Skema / Peta Lokasi',
        detail:
          'Unggah berkas gambar peta lokasi atau skema jaringan agar tampil otomatis pada kartu Gambaran Lokasi Kegiatan di Profil Usulan dan dokumen PDF.',
      },
      {
        title: 'Bagian 5 — Verifikasi Readiness Criteria (RC) & Isian Baru',
        detail:
          'Lengkapi Status Matriks, Pembahasan dengan BPBPK NTB (Kali), Link Data RC, dan Skor Kesiapan RC (%). Centang status Ada/Kurang/Sesuai untuk 6 dokumen standar, dan klik "Tambah Isian Baru Dokumen RC" bila perlu menambahkan dokumen RC baru.',
      },
    ],
  },
  {
    id: 'profil-detail-pdf',
    number: '05',
    title: 'Profil Usulan, Detail Status RC & Cetak PDF',
    subtitle: 'Template Eksekutif KEMENPU, edit lengkap Detail Status RC, Pengesahan, & PDF Batik PU',
    summary:
      'Buka Profil Usulan melalui tombol "Preview Usulan" di header atau ikon mata pada tiap baris untuk melihat lembar eksekutif dan mencetak PDF resmi.',
    steps: [
      {
        title: 'Kartu Eksekutif 8 Panel',
        detail:
          'Menampilkan Header KEMENPU, Gambaran Umum, Urgensi Strategis, Lingkup Pekerjaan, Kebutuhan Anggaran, Output & Outcome, Gambaran Lokasi Kegiatan (bisa beralih antara Gambar & Peta GIS/Satelit), serta Status Readiness Criteria (RC).',
      },
      {
        title: 'Lihat Lebih Detail Tabel Status RC',
        detail:
          'Klik tombol "Lihat Lebih Detail Tabel Status RC" di bawah tabel Status RC untuk membuka rincian 8 kolom lengkap, 5 Indikator Inti RC, serta Catatan Teknis Verifikasi Balai.',
      },
      {
        title: 'Edit & Tambah Isian Baru Langsung di Detail Status RC',
        detail:
          'Di dalam panel Detail Status RC, Anda dapat langsung mengedit Skor RC, Status Verifikasi/Matriks, Pembahasan dengan BPBPK NTB, Tautan Berkas RC, checklist Ada/Kurang/Sesuai, nama dokumen baris ke-6 (Lainnya), Catatan Teknis Balai, serta menambah/menghapus "Isian Baru Dokumen RC". Klik "Simpan Detail RC" atau "Simpan Perubahan Detail RC" untuk menyimpan.',
      },
      {
        title: 'Pengesahan di Bawah 5 Indikator Inti RC',
        detail:
          'Panel Pengesahan (Tempat & Tanggal, Mengesahkan 1, Mengesahkan 2, dan Menyetujui) berada di bagian bawah Detail Status RC tepat di bawah 5 Indikator Inti RC. Klik tombol "Pengesahan PDF" di bilah atas Profil Usulan untuk melompat langsung ke formulir ini.',
      },
      {
        title: 'Preview PDF & Cetak PDF (+ Detail RC)',
        detail:
          'Klik "Preview PDF" untuk melihat pratinjau Tata Letak A4 maupun Dokumen PDF beserta opsi menyertakan/mengecualikan halaman Detail RC, atau klik "Cetak PDF (+ Detail RC)" untuk langsung mengunduh PDF A4 Landscape bertema Batik PU lengkap dengan nomor halaman otomatis.',
      },
    ],
    tips: [
      'Gunakan tombol "Unduh HTML" jika ingin menyimpan slide halaman depan Profil Usulan sebagai berkas web mandiri.',
    ],
  },
  {
    id: 'spasial-gis',
    number: '06',
    title: 'Fitur Spasial GIS',
    subtitle: 'Pemetaan koordinat usulan, panel detail samping, & plot titik interaktif',
    summary:
      'Menu Fitur Spasial GIS memvisualisasikan sebaran titik lokasi seluruh usulan Cipta Karya pada peta interaktif wilayah Provinsi NTB.',
    steps: [
      {
        title: 'Jelajahi Penanda Lokasi',
        detail:
          'Klik marker berwarna pada peta atau pilih paket usulan dari "Daftar Objek Spasial Aktif" di panel kanan untuk membuka ringkasan detail, pagu 2027–2030, koordinat geografis, dan daftar dokumen RC.',
      },
      {
        title: 'Plot Titik Koordinat Langsung di Peta',
        detail:
          'Buka panel detail salah satu usulan, klik tombol "Plot Titik di Peta", lalu klik titik lokasi yang tepat di atas peta. Koordinat Lat/Lng langsung diperbarui dan tersimpan otomatis ke Cloud.',
      },
      {
        title: 'Reset Cakupan Peta',
        detail:
          'Klik tombol "Reset Cakupan" di pojok kanan atas area peta untuk mengembalikan zoom peta agar menampilkan seluruh usulan yang sedang terfilter.',
      },
    ],
  },
  {
    id: 'infografis-proyeksi',
    number: '07',
    title: 'Infografis Skor RC & Proyeksi 2027–2030',
    subtitle: 'Peringkat kesiapan dokumen RC, aturan 2 vs 3 pengesah, & analisis proyeksi pagu',
    summary:
      'Gunakan dua menu analitik ini untuk kebutuhan paparan pimpinan, rapat koordinasi BPBPK NTB, dan evaluasi readiness.',
    steps: [
      {
        title: 'Infografis Peringkat Skor RC',
        detail:
          'Menampilkan urutan paket usulan dari Skor RC tertinggi ke terendah beserta indikator kelengkapan 5 dokumen inti.',
      },
      {
        title: 'Aturan Kolom Pengesahan Otomatis pada PDF Infografis',
        detail:
          'Jika data yang dicetak hanya mencakup sektor Air Minum, Sanitasi, dan PKS saja, bagian "Mengesahkan" otomatis tampil 2 kolom. Apabila mencakup semua sektor atau menyertakan BPB, bagian "Mengesahkan" tampil 3 kolom.',
      },
      {
        title: 'Preview & Cetak Infografis PDF',
        detail:
          'Klik tombol "Preview / Cetak PDF Infografis" untuk mengatur pejabat pengesah, melihat pratinjau A4, lalu mengunduh berkas PDF Infografis Skor RC.',
      },
      {
        title: 'Proyeksi Anggaran 2027–2030',
        detail:
          'Buka menu "Proyeksi 2027–2030" untuk meninjau rekap kebutuhan anggaran tahunan per sektor, perbandingan komposisi pendanaan, dan distribusi per Kabupaten/Kota.',
      },
    ],
  },
  {
    id: 'cloud-drive-share',
    number: '08',
    title: 'Cloud Database, Google Drive & Bagikan Link',
    subtitle: 'Sinkronisasi real-time, cadangan ke Google Drive resmi, & tautan read-only',
    summary:
      'Aplikasi menyimpan perubahan secara otomatis ke Cloud Firestore dan menyediakan fitur pencadangan eksternal ke Google Drive.',
    steps: [
      {
        title: 'Simpan Perubahan ke Cloud Database',
        detail:
          'Setiap aksi edit otomatis tersinkronisasi ke Cloud Firestore. Anda juga dapat menekan tombol hijau "Simpan Perubahan" di header atas untuk memastikan seluruh snapshot usulan tersimpan menyeluruh.',
      },
      {
        title: 'Simpan Cadangan ke Google Drive',
        detail:
          'Klik tombol "Simpan ke Google Drive" di header atau sidebar kiri, hubungkan akun Google melalui OAuth, pilih format JSON dan/atau CSV, lalu unggah langsung ke folder resmi BPBPK NTB di Google Drive.',
      },
      {
        title: 'Buat Link Lihat Saja (Read-Only)',
        detail:
          'Klik "Link Lihat Saja", pilih menu tampilan awal, Tahun Anggaran, dan Sektor default yang ingin ditampilkan, lalu klik "Salin Link" untuk dibagikan kepada pimpinan atau pihak eksternal.',
      },
    ],
    tips: [
      'Gunakan tombol "Pratinjau Mode Lihat Saja" di dalam modal Generate Link untuk memastikan tampilan yang diterima penerima tautan sebelum dibagikan.',
    ],
  },
];
