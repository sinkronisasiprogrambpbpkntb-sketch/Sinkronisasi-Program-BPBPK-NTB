import {
  LegacyRcDocKey,
  ProposalTemplateDetails,
  RcDocKey,
  RcDocumentEntry,
  ReadinessCriteria,
  ResolvedPlaceInfo,
  SektorCiptaKarya,
  StatusVerifikasi,
  SumberDana,
  UsulanProgram,
} from '../types/ciptaKarya';

export const SEKTOR_SHORT_LABELS: Record<SektorCiptaKarya, string> = {
  [SektorCiptaKarya.AIR_MINUM]: 'Air Minum (SPAM)',
  [SektorCiptaKarya.SANITASI]: 'Sanitasi',
  [SektorCiptaKarya.KAWASAN_STRATEGIS]: 'Pengembangan Kawasan Strategis (PKS)',
  [SektorCiptaKarya.BINA_PENATAAN_BANGUNAN]: 'Bina Penataan Bangunan (BPB)',
};

export const SEKTOR_COLORS: Record<
  SektorCiptaKarya,
  { stroke: string; fill: string; text: string }
> = {
  [SektorCiptaKarya.AIR_MINUM]: {
    stroke: '#1d4ed8',
    fill: '#2563eb',
    text: 'text-blue-700',
  },
  [SektorCiptaKarya.SANITASI]: {
    stroke: '#0f766e',
    fill: '#0d9488',
    text: 'text-teal-700',
  },
  [SektorCiptaKarya.KAWASAN_STRATEGIS]: {
    stroke: '#b45309',
    fill: '#d97706',
    text: 'text-amber-700',
  },
  [SektorCiptaKarya.BINA_PENATAAN_BANGUNAN]: {
    stroke: '#334155',
    fill: '#475569',
    text: 'text-slate-700',
  },
};

export const KEMENPU_RC_ROWS: Array<{
  key: RcDocKey;
  defaultLabel: string;
  placeholderNote: string;
}> = [
  {
    key: 'rencanaInduk',
    defaultLabel: 'Rencana Induk',
    placeholderNote: 'RISPAM, RIPS, RISPAL, RIPKS / Masterplan yang masih berlaku',
  },
  {
    key: 'fsDedRab',
    defaultLabel: 'Dokumen FS, DED, dan RAB',
    placeholderNote: 'Studi Kelayakan (FS), Gambar DED, & RAB',
  },
  {
    key: 'suratMinatKepalaDaerah',
    defaultLabel: 'Surat Minat Kepala Daerah',
    placeholderNote: 'Surat minat & komitmen pengelolaan',
  },
  {
    key: 'sertifikatLahan',
    defaultLabel: 'Sertifikat Lahan',
    placeholderNote: 'Status lahan Clean & Clear',
  },
  {
    key: 'dokumenLingkungan',
    defaultLabel: 'Dokumen Lingkungan',
    placeholderNote: 'AMDAL / UKL-UPL / SPPL',
  },
  {
    key: 'lainnya',
    defaultLabel: 'Lainnya.....(silakan tambahkan)',
    placeholderNote: 'Kesiapan lembaga pengelola / izin lainnya',
  },
];

export const INITIAL_PROPOSALS: UsulanProgram[] = [
  {
    id: 'usulan-ck-001',
    kodeUsulan: 'CK-NTB-27-001',
    namaProgram:
      'Pembangunan Bangunan Gedung Negara Dan Prasarana Publik Terdampak Aksi Demonstrasi di Provinsi Nusa Tenggara Barat',
    sektor: SektorCiptaKarya.BINA_PENATAAN_BANGUNAN,
    kabupatenKota: 'Kota Mataram',
    kecamatanKawasan: 'Pusat Pemerintahan Kota Mataram',
    locationQuery: 'Kota Mataram, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5833, lng: 116.1167 },
    manualAddressLabel: 'Pusat Pemerintahan & Prasarana Publik Provinsi NTB, Kota Mataram',
    volumeTarget: 9995,
    satuanTarget: 'm² Bangunan',
    penerimaManfaatJiwa: 50000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 300.0, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 92,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: true,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional: 'PN 2 · Penanganan Gedung Negara & Prasarana Publik Strategis',
    serviceRadiusKm: 5.0,
    corridorGroup: 'Kawasan Strategis PKN Mataram',
    catatanTeknis:
      'Perlu dilengkapi Dokumen UKL-UPL, Dokumen Andalalin. Usulan Komisi V DPR RI Dapil NTB II (Abdul Hadi). Kunker Reses ke Provinsi Nusa Tenggara Barat pada tanggal 22 Juli 2026, yang dipimpin oleh Bapak Lasarus, S.Sos., M.Si.',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Kota Mataram Menjadi Salah Satu Pusat Kegiatan Nasional yang tercantum Dalam Rencana Tata Ruang Nasional. Penanganan bangunan gedung negara dan prasarana publik yang terdampak aksi demonstrasi merupakan hal yang mendesak untuk dilaksanakan, mengingat kerusakan yang terjadi dapat memengaruhi fungsi bangunan, keamanan dan keselamatan pengguna, serta keberlangsungan pelayanan pemerintahan dan pelayanan publik kepada masyarakat.',
      dasarPenugasan:
        'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi) · Kunker Reses ke Provinsi Nusa Tenggara Barat pada tanggal 22 Juli 2026 yang dipimpin oleh Bapak Lasarus, S.Sos., M.Si',
      manfaatKegiatan:
        'Memulihkan fungsi gedung negara, menjamin kelancaran pelayanan administrasi pemerintahan daerah, serta keselamatan aparatur dan masyarakat pengguna pelayanan publik.',
      lingkupPekerjaan: [
        'Rehabilitasi dan rekonstruksi bangunan gedung negara (9.995 m²)',
        'Perbaikan prasarana publik dan fasilitas penunjang kawasan',
        'Penyusunan kelengkapan dokumen UKL-UPL dan dokumen Andalalin',
      ],
      biayaFisikMiliar: 285.0,
      biayaSupervisiMiliar: 15.0,
      durasiHari: 360,
      durasiBulan: 12,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Desember 2027',
      outputTambahan: '9.995 m² Gedung Negara & Prasarana Publik',
      outcomeTambahan: 'Keberlangsungan pelayanan pemerintahan & publik pulih 100%',
      deskripsiLokasi:
        'Pusat perkantoran pemerintahan dan fasilitas prasarana publik di Kota Mataram, Nusa Tenggara Barat.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'Kawasan PKN Mataram dalam RTRW Nasional' },
        studiKelayakan: {
          status: 'Lengkap',
          keterangan: 'Hasil identifikasi kerusakan fisik dan fungsi pelayanan',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Usulan Pemprov NTB & Kunker Reses Komisi V DPR RI',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Aset tanah Pemerintah Provinsi NTB Clean & Clear',
        },
        ded: {
          status: 'Lengkap',
          keterangan: 'DED teknis konstruksi gedung negara dan prasarana publik',
        },
        rab: { status: 'Lengkap', keterangan: 'RAB estimasi kebutuhan alokasi Rp 300 Miliar' },
        dokumenLingkungan: {
          status: 'Proses',
          keterangan: 'Perlu dilengkapi Dokumen UKL-UPL dan Dokumen Andalalin',
        },
        lainnya: {
          customLabel: 'Dokumen Andalalin',
          status: 'Proses',
          keterangan: 'Penyusunan analisis dampak lalu lintas bersama instansi berwenang',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-002',
    kodeUsulan: 'CK-NTB-27-002',
    namaProgram: 'Optimalisasi SPAM Sembalun',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Lombok Timur',
    kecamatanKawasan: 'Kec. Sembalun',
    locationQuery: 'Sembalun, Lombok Timur, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.3585, lng: 116.5284 },
    manualAddressLabel: 'Pipa Transmisi Segmen 1 & 2 SPAM Sembalun, Lombok Timur',
    volumeTarget: 11.32,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 11320,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 18.17, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 80,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: true,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional: 'PN 2 · Pemulihan Infrastruktur Air Minum Terdampak Bencana Alam',
    serviceRadiusKm: 4.5,
    corridorGroup: 'Kawasan KSPN Rinjani Sembalun',
    catatanTeknis:
      'Kondisi SPAM tidak berfungsi karena pipa transmisi terputus akibat longsor pada segmen 1 dan 2. Rehabilitasi pipa transmisi terputus akibat limpasan air (air terjun temporer), saat ini proses penyiapan DED. Sudah ada catatan BTBGPL & Subdit Wilayah untuk tindak lanjut reviu DED dan RAB. Usulan Komisi V DPR RI Dapil NTB II (Abdul Hadi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Kondisi SPAM yang tidak berfungsi karena pipa transmisi yang terputus akibat longsor pada segmen 1 dan segmen 2 di lereng perbukitan Sembalun.',
      dasarPenugasan: 'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi)',
      manfaatKegiatan:
        'Memulihkan pasokan air minum perpipaan bagi 11.320 jiwa masyarakat pedesaan dan mendukung aktivitas wisata KSPN Rinjani Sembalun.',
      lingkupPekerjaan: [
        'Rehabilitasi pipa transmisi yang terputus akibat limpasan air temporer pada segmen 1 & 2',
        'Pemasangan pipa transmisi tahan getaran dan longsor',
        'Tindak lanjut catatan BTBGPL dan Subdit Wilayah terkait hasil reviu DED dan RAB',
      ],
      biayaFisikMiliar: 17.26,
      biayaSupervisiMiliar: 0.91,
      durasiHari: 300,
      durasiBulan: 10,
      waktuMulai: 'Februari 2027',
      waktuSelesai: 'November 2027',
      outputTambahan: '11,32 L/detik Pipa Transmisi Berfungsi',
      outcomeTambahan: '11.320 jiwa kembali terlayani air minum aman',
      deskripsiLokasi:
        'Jalur pipa transmisi SPAM lereng perbukitan Sembalun segmen 1 dan 2, Kabupaten Lombok Timur.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Lombok Timur' },
        studiKelayakan: {
          status: 'Lengkap',
          keterangan: 'Kajian teknis dampak bencana longsor terhadap transmisi SPAM',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat permohonan Bupati Lombok Timur',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Trase pipa pada jalur publik eksisting bebas sengketa',
        },
        ded: {
          status: 'Proses',
          keterangan: 'Sedang proses penyiapan DED rehabilitasi SPAM Sembalun',
        },
        rab: {
          status: 'Proses',
          keterangan: 'Tindak lanjut hasil reviu DED dan RAB bersama BTBGPL & Subdit Wilayah',
        },
        dokumenLingkungan: {
          status: 'Lengkap',
          keterangan: 'Dokumen lingkungan kegiatan eksisting SPAM',
        },
        lainnya: {
          customLabel: 'Catatan BTBGPL',
          status: 'Proses',
          keterangan: 'Penyesuaian teknis perlindungan pipa terhadap limpasan air temporer',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-003',
    kodeUsulan: 'CK-NTB-27-003',
    namaProgram: 'Optimalisasi IPA Rora dan Optimalisasi IPA Selaparang',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Dompu',
    kecamatanKawasan: 'Kec. Dompu',
    locationQuery: 'Dompu, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5369, lng: 118.4556 },
    manualAddressLabel: 'Instalasi Pengolahan Air Rora & Selaparang, Kab. Dompu',
    volumeTarget: 100,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 25000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 5.0, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 42.5,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.REVISI_RC,
    prioritasNasional: 'PN 2 · Optimalisasi Kapasitas SPAM Eksisting Perkotaan',
    serviceRadiusKm: 4.0,
    corridorGroup: 'Kawasan Perkotaan Dompu',
    catatanTeknis:
      'Kebutuhan air masyarakat yang masih kurang untuk kecamatan Dompu karena kondisi IPA yang sudah tidak optimal. Pemerintah Kabupaten Dompu sedang memproses IPSDA dan Penyusunan DED (Melalui APBDP TA 2026). Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Kebutuhan air masyarakat yang masih kurang untuk wilayah kecamatan Dompu karena kondisi IPA Rora dan IPA Selaparang yang sudah tidak optimal.',
      dasarPenugasan: 'Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi)',
      manfaatKegiatan:
        'Meningkatkan efisiensi dan kapasitas pasokan air minum hingga 100 L/detik bagi 25.000 jiwa warga perkotaan Dompu.',
      lingkupPekerjaan: [
        'Optimalisasi dan rehabilitasi unit pengolahan fisik/kimia IPA Rora',
        'Optimalisasi sistem pemompaan dan filtrasi IPA Selaparang',
        'Penyusunan DED melalui APBDP TA 2026 dan pengurusan izin pemanfaatan IPSDA',
      ],
      biayaFisikMiliar: 4.75,
      biayaSupervisiMiliar: 0.25,
      durasiHari: 240,
      durasiBulan: 8,
      waktuMulai: 'Maret 2027',
      waktuSelesai: 'Oktober 2027',
      outputTambahan: '100 L/detik Kapasitas Optimal',
      outcomeTambahan: '25.000 jiwa terlayani air minum stabil',
      deskripsiLokasi:
        'Lokasi instalasi IPA Rora dan IPA Selaparang di kawasan perkotaan Dompu, Kabupaten Dompu.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Dompu' },
        studiKelayakan: {
          status: 'Lengkap',
          keterangan: 'Kajian evaluasi kinerja IPA eksisting Rora & Selaparang',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat komitmen dan permohonan Bupati Dompu',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Aset lahan instalasi IPA eksisting milik Pemkab Dompu',
        },
        ded: {
          status: 'Proses',
          keterangan: 'Pemerintah Kabupaten Dompu sedang menyusun DED via APBDP TA 2026',
        },
        rab: { status: 'Proses', keterangan: 'Penyusunan RAB paket optimalisasi Rp 5 Miliar' },
        dokumenLingkungan: {
          status: 'Proses',
          keterangan: 'Pembaruan dokumen lingkungan UKL-UPL instalasi eksisting',
        },
        lainnya: {
          customLabel: 'Pemenuhan IPSDA',
          status: 'Proses',
          keterangan: 'Pemerintah Kabupaten Dompu sedang memproses perizinan IPSDA',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-004',
    kodeUsulan: 'CK-NTB-27-004',
    namaProgram: 'Pembangunan Jaringan Perpipaan SPAM Aik Mual (Lenek – Aikmel)',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Lombok Timur',
    kecamatanKawasan: 'Kec. Lenek & Kec. Aikmel',
    locationQuery: 'Lenek, Lombok Timur, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5447, lng: 116.5262 },
    manualAddressLabel: 'Kawasan Mata Air Mualan ke Lenek – Aikmel, Lombok Timur',
    volumeTarget: 30,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 15980,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 20.58, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 64.5,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: true,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional: 'PN 2 · Perluasan Akses Layanan Air Bersih Pedesaan',
    serviceRadiusKm: 4.5,
    corridorGroup: 'Koridor SPAM Lombok Timur Utara',
    catatanTeknis:
      'Masih belum terpenuhinya kebutuhan air bersih untuk wilayah kecamatan Lenek, jumlah yang belum terlayani sekitar 15.980 jiwa, sehingga PDAM kabupaten Lombok Timur mengusulkan untuk pembangunan baru dari MA. Mualan dengan kapasitas produksi 30 l/d. Sudah ada pembahasan dengan Subdit wilayah dan BTBGPL, namun masih dalam pemenuhan IPSDA. Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Masih belum terpenuhinya kebutuhan air bersih untuk wilayah kecamatan Lenek, dengan jumlah warga belum terlayani sekitar 15.980 jiwa. PDAM Kabupaten Lombok Timur mengusulkan pembangunan baru dari Mata Air Mualan berkapasitas produksi 30 L/detik.',
      dasarPenugasan: 'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi)',
      manfaatKegiatan:
        'Menyediakan air bersih perpipaan aman dan berkelanjutan bagi 15.980 jiwa warga Kecamatan Lenek dan Aikmel.',
      lingkupPekerjaan: [
        'Pembangunan unit penangkap mata air (broncaptering) MA. Mualan',
        'Pemasangan pipa transmisi dan jaringan pipa distribusi Lenek - Aikmel',
        'Penyelesaian dan pemenuhan izin pemanfaatan IPSDA',
      ],
      biayaFisikMiliar: 19.55,
      biayaSupervisiMiliar: 1.03,
      durasiHari: 330,
      durasiBulan: 11,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'November 2027',
      outputTambahan: '30 L/detik Pipa Transmisi & Distribusi',
      outcomeTambahan: '15.980 jiwa terlayani air minum baru',
      deskripsiLokasi:
        'Kawasan Mata Air Mualan melintasi koridor pelayanan Kecamatan Lenek dan Kecamatan Aikmel, Lombok Timur.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Lombok Timur' },
        studiKelayakan: {
          status: 'Lengkap',
          keterangan: 'Kajian hidrogeologi potensi debit MA. Mualan 30 L/d',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat permohonan Bupati Lombok Timur dan PDAM',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Lahan sumber mata air dan jalur pipa publik desa',
        },
        ded: {
          status: 'Lengkap',
          keterangan: 'DED jaringan pipa transmisi dan distribusi Lenek-Aikmel',
        },
        rab: { status: 'Lengkap', keterangan: 'RAB kebutuhan alokasi Rp 20,58 Miliar' },
        dokumenLingkungan: {
          status: 'Proses',
          keterangan: 'Penyusunan dokumen lingkungan UKL-UPL',
        },
        lainnya: {
          customLabel: 'Pemenuhan IPSDA',
          status: 'Proses',
          keterangan:
            'Sudah ada pembahasan dengan Subdit Wilayah & BTBGPL, proses finalisasi izin IPSDA',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-005',
    kodeUsulan: 'CK-NTB-27-005',
    namaProgram: 'Penataan Kawasan Pujut Tahap II, Kabupaten Lombok Tengah',
    sektor: SektorCiptaKarya.KAWASAN_STRATEGIS,
    kabupatenKota: 'Kab. Lombok Tengah',
    kecamatanKawasan: 'Kec. Pujut',
    locationQuery: 'Pujut, Lombok Tengah, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.8285, lng: 116.2750 },
    manualAddressLabel: 'Kawasan Permukiman & Sentra Pertanian Pujut, Lombok Tengah',
    volumeTarget: 26.02,
    satuanTarget: 'Hektare (Ha)',
    penerimaManfaatJiwa: 12500,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 2.5, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 80,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: true,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional: 'PN 2 · Penataan Kawasan Permukiman dan Akses Produksi Pertanian',
    serviceRadiusKm: 3.5,
    corridorGroup: 'Kawasan Strategis Lombok Tengah Selatan',
    catatanTeknis:
      'Banyaknya jalan penghubung yang kondisi sangat tidak layak dikarenakan jalan eksisting masih jalan tanah dan tidak memiliki saluran drainase, sehingga saat musim penghujan sering terjadi genangan dan mempengaruhi distribusi hasil panen dan potensi wisata setempat. Pengangkutan produksi pertanian mengalami kesulitan akibat jalan kurang layak. Perlu dilengkapi Dokumen UKL-UPL dan Izin Rekomtek. Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Banyak jalan penghubung berkondisi jalan tanah dan tidak memiliki saluran drainase sehingga saat musim hujan terjadi genangan yang menghambat distribusi hasil panen pertanian dan potensi wisata setempat, serta menurunkan efisiensi pengangkutan.',
      dasarPenugasan: 'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi)',
      manfaatKegiatan:
        'Meningkatkan kelancaran mobilitas pengangkutan panen pertanian, menghilangkan genangan air hujan, dan menata lingkungan permukiman seluas 26,02 Ha.',
      lingkupPekerjaan: [
        'Peningkatan jalan lingkungan penghubung produksi pertanian',
        'Pembangunan saluran drainase pencegah genangan banjir',
        'Penyusunan dokumen UKL-UPL dan pengurusan izin rekomendasi teknis (Rekomtek)',
      ],
      biayaFisikMiliar: 2.37,
      biayaSupervisiMiliar: 0.13,
      durasiHari: 210,
      durasiBulan: 7,
      waktuMulai: 'Februari 2027',
      waktuSelesai: 'Agustus 2027',
      outputTambahan: '26,02 Ha Kawasan Tertata',
      outcomeTambahan: 'Akses distribusi panen lancar tanpa hambatan genangan',
      deskripsiLokasi:
        'Sentra permukiman dan jalan penghubung sentra tani Kecamatan Pujut, Kabupaten Lombok Tengah.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RPKPP Kabupaten Lombok Tengah' },
        studiKelayakan: {
          status: 'Lengkap',
          keterangan: 'Kajian kelayakan penataan kawasan Pujut Tahap II',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat usulan prioritas Bupati Lombok Tengah',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Badan jalan penghubung desa Clean & Clear',
        },
        ded: {
          status: 'Lengkap',
          keterangan: 'DED peningkatan perkerasan jalan dan saluran drainase',
        },
        rab: { status: 'Lengkap', keterangan: 'RAB kebutuhan alokasi Rp 2,50 Miliar' },
        dokumenLingkungan: {
          status: 'Proses',
          keterangan: 'Perlu dilengkapi Dokumen UKL-UPL',
        },
        lainnya: {
          customLabel: 'Izin Rekomtek',
          status: 'Proses',
          keterangan: 'Perlu dilengkapi Izin Rekomtek saluran pengairan',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-006',
    kodeUsulan: 'CK-NTB-27-006',
    namaProgram:
      'Pembangunan TPST Oi Mbo, Kabupaten Bima dan Penataan TPA Oi Mbo Kabupaten Bima',
    sektor: SektorCiptaKarya.SANITASI,
    kabupatenKota: 'Kab. Bima',
    kecamatanKawasan: 'Kawasan PKW Raba - Oi Mbo',
    locationQuery: 'Oi Mbo, Bima, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.4721, lng: 118.7563 },
    manualAddressLabel: 'Kompleks TPST & TPA Oi Mbo, Kawasan PKW Raba, Bima',
    volumeTarget: 25000,
    satuanTarget: 'Kepala Keluarga (KK)',
    penerimaManfaatJiwa: 100000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 33.54, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 47,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.REVISI_RC,
    prioritasNasional: 'PN 2 · Pengurangan Sampah Perkotaan & Penataan TPA Ramah Lingkungan',
    serviceRadiusKm: 5.0,
    corridorGroup: 'Kawasan PKW Raba - Teluk Bima',
    catatanTeknis:
      'Dalam RTRW Nasional (PP.13/2017) termasuk dalam PKW Raba. Mendukung Kawasan Strategis Provinsi Perda RTRW No.5/2024 Teluk Bima. TPST: RIPS & FS proses reviu, DED & RAB proses reviu. TPA: Pemenuhan RC proses pengusulan ke Walikota, proses penyusunan justifikasi TPA, DED/RAB proses reviu. Belum ada pembahasan dengan Subdit wilayah dan BTBGPL. Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi). Memorandum Program.',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Termasuk dalam RTRW Nasional Pusat Kegiatan Wilayah (PKW Raba) dan Kawasan Strategis Ekonomi Teluk Bima. Pembangunan TPST dan penataan TPA Oi Mbo mendesak guna mengatasi overload timbulan sampah dan memperbaiki tata kelola persampahan perkotaan Bima.',
      dasarPenugasan:
        'Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi) · Memorandum Program',
      manfaatKegiatan:
        'Mengurangi beban residu TPA, memilah dan mendaur ulang sampah melayani 25.000 KK (100.000 jiwa) di kawasan perkotaan Bima.',
      lingkupPekerjaan: [
        'Pembangunan hanggar pengolahan sampah terpadu TPST Oi Mbo',
        'Pengadaan mesin pemilah, pencacah organik, dan komposting',
        'Penataan sel landfill dan pengelolaan air lindi TPA Oi Mbo',
        'Pembahasan teknis bersama Subdit Wilayah dan BTBGPL',
      ],
      biayaFisikMiliar: 31.86,
      biayaSupervisiMiliar: 1.68,
      durasiHari: 360,
      durasiBulan: 12,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Desember 2027',
      outputTambahan: '25.000 KK Layanan Persampahan Terpadu',
      outcomeTambahan: 'Volume timbulan sampah tereduksi 60%',
      deskripsiLokasi:
        'Kawasan fasilitas persampahan Oi Mbo pada koridor perkotaan PKW Raba, Kabupaten/Kota Bima.',
      rcDetails: {
        rencanaInduk: {
          status: 'Proses',
          keterangan: 'RIPS persampahan dalam proses reviu',
        },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Dokumen FS TPST dalam proses reviu',
        },
        suratMinatKepalaDaerah: {
          status: 'Proses',
          keterangan: 'Pemenuhan RC penataan TPA proses pengusulan ke Walikota/Bupati',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Aset lahan TPA Oi Mbo eksisting milik pemerintah daerah',
        },
        ded: {
          status: 'Proses',
          keterangan: 'DED TPST & TPA dalam proses reviu teknis',
        },
        rab: {
          status: 'Proses',
          keterangan: 'RAB kebutuhan alokasi Rp 33,54 Miliar dalam proses reviu',
        },
        dokumenLingkungan: {
          status: 'Proses',
          keterangan: 'Pembaruan dokumen AMDAL / UKL-UPL kawasan TPA',
        },
        lainnya: {
          customLabel: 'Justifikasi TPA',
          status: 'Proses',
          keterangan: 'Proses penyusunan justifikasi TPA; belum ada pembahasan Subdit & BTBGPL',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-007',
    kodeUsulan: 'CK-NTB-27-007',
    namaProgram:
      'Pembangunan TPST Raberas dan Penataan TPA Raberas Kabupaten Sumbawa',
    sektor: SektorCiptaKarya.SANITASI,
    kabupatenKota: 'Kab. Sumbawa',
    kecamatanKawasan: 'Kec. Sumbawa (PKW Sumbawa Besar)',
    locationQuery: 'Raberas, Sumbawa, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5135, lng: 117.4328 },
    manualAddressLabel: 'Kawasan Persampahan Raberas, Sumbawa Besar, Kab. Sumbawa',
    volumeTarget: 58750,
    satuanTarget: 'Kepala Keluarga (KK)',
    penerimaManfaatJiwa: 235000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 32.95, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 47,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.REVISI_RC,
    prioritasNasional: 'PN 2 · Pengelolaan Persampahan KSPN Teluk Saleh - Moyo - Tambora (SAMOTA)',
    serviceRadiusKm: 5.5,
    corridorGroup: 'Kawasan SAMOTA - Sumbawa Besar',
    catatanTeknis:
      'Dalam RTRW Nasional (PP.13/2017) termasuk dalam PKW Sumbawa Besar. Mendukung Kawasan Strategis SAMOTA (Perda No.5/2024). RISPS dalam proses penyusunan; FS dan DED, RAB dalam proses reviu. Belum ada pembahasan dengan Subdit wilayah dan BTBGPL. Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi). Memorandum Program.',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Termasuk dalam RTRW Nasional PKW Sumbawa Besar dan mendukung Kawasan Strategis Ekonomi Teluk Saleh-Moyo-Tambora (SAMOTA). Peningkatan fasilitas TPST dan penataan TPA Raberas diperlukan guna mengatasi timbulan sampah kota dan sentra perdagangan Sumbawa.',
      dasarPenugasan:
        'Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi) · Memorandum Program',
      manfaatKegiatan:
        'Melayani pengelolaan persampahan terpadu ramah lingkungan bagi 58.750 KK (235.000 jiwa) di Kabupaten Sumbawa.',
      lingkupPekerjaan: [
        'Pembangunan hanggar TPST Raberas dan pengadaan sarana pemilahan mekanikal',
        'Penataan sel penimbunan sanitary landfill dan kolam lindi TPA Raberas',
        'Finalisasi penyusunan RISPS dan reviu FS, DED, serta RAB',
      ],
      biayaFisikMiliar: 31.3,
      biayaSupervisiMiliar: 1.65,
      durasiHari: 360,
      durasiBulan: 12,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Desember 2027',
      outputTambahan: '58.750 KK Terlayani TPST & TPA',
      outcomeTambahan: '235.000 jiwa menikmati lingkungan bebas polusi sampah',
      deskripsiLokasi:
        'Kawasan persampahan Raberas, Kecamatan Sumbawa, Kabupaten Sumbawa.',
      rcDetails: {
        rencanaInduk: { status: 'Proses', keterangan: 'RISPS dalam proses penyusunan' },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Dokumen FS TPST Raberas dalam proses reviu',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat komitmen dan minat Bupati Sumbawa',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Aset lahan TPA Raberas milik Pemerintah Kabupaten Sumbawa',
        },
        ded: { status: 'Proses', keterangan: 'DED fasilitas TPST dan TPA dalam proses reviu' },
        rab: { status: 'Proses', keterangan: 'RAB alokasi Rp 32,95 Miliar dalam proses reviu' },
        dokumenLingkungan: {
          status: 'Proses',
          keterangan: 'Pembaruan izin lingkungan UKL-UPL / AMDAL TPA',
        },
        lainnya: {
          customLabel: 'Pembahasan Wilayah',
          status: 'Proses',
          keterangan: 'Belum ada pembahasan dengan Subdit Wilayah dan BTBGPL',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-008',
    kodeUsulan: 'CK-NTB-27-008',
    namaProgram:
      'Pembangunan IPA Kap.150 L/detik dan jaringan Perpipaan SPAM Masmirah - Zona Barat Mata Air Cerorong dan Danau Biru Kabupaten Lombok Tengah',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Lombok Tengah',
    kecamatanKawasan: 'Zona Barat - Cerorong & Danau Biru',
    locationQuery: 'Batukliang Utara, Lombok Tengah, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5312, lng: 116.3125 },
    manualAddressLabel: 'Mata Air Cerorong & Danau Biru ke Zona Barat Selong Belanak, Lombok Tengah',
    volumeTarget: 150,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 60000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'MYC',
    pagu: { y2027: 80.0, y2028: 67.65, y2029: 0, y2030: 0 },
    skorRc: 57.5,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: false,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.REVISI_RC,
    prioritasNasional:
      'PN 2 · Penyediaan Air Minum Wilayah Rawan Kekeringan & Kawasan Wisata Selong Belanak',
    serviceRadiusKm: 6.0,
    corridorGroup: 'Koridor SPAM Masmirah Zona Barat',
    catatanTeknis:
      'Ketersediaan debit kurang pada zona Barat dan belum terjangkau Perumdam Tiara. Pembangunan IPA Kap. 150 l/d menunjang penambahan pelayanan dan mendukung pariwisata Selong Belanak. Perlu didahului pembangunan unit air baku oleh DJ SDA / BBWS, pembebasan lahan IPA, review DED & FS, serta proses IPSDA. Belum ada pembahasan dengan Subdit wilayah dan BTBGPL. Usulan Komisi V DPR RI Dapil NTB II (Abdul Hadi). Memorandum Program.',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Ketersediaan debit yang kurang pada zona Barat Lombok Tengah dan belum terjangkau layanan Perumdam Tiara. Pembangunan IPA Kap. 150 L/detik diperlukan untuk memperluas cakupan pelayanan masyarakat dan mendukung kawasan pariwisata Selong Belanak.',
      dasarPenugasan:
        'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi) · Memorandum Program',
      manfaatKegiatan:
        'Menjamin pasokan air minum aman bagi 60.000 jiwa masyarakat zona Barat dan sarana akomodasi pariwisata Selong Belanak.',
      lingkupPekerjaan: [
        'Pembangunan IPA kapasitas 150 L/detik',
        'Pemasangan pipa transmisi air baku dari Mata Air Cerorong dan Danau Biru',
        'Pembangunan reservoir distribusi dan pipa jaringan distribusi utama zona Barat',
        'Sinergi pembangunan unit air baku bersama DJ SDA / BBWS Nusa Tenggara I',
      ],
      biayaFisikMiliar: 140.27,
      biayaSupervisiMiliar: 7.38,
      durasiHari: 540,
      durasiBulan: 18,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Juni 2028',
      outputTambahan: '150 L/detik IPA & Transmisi SPAM',
      outcomeTambahan: '60.000 jiwa & kawasan wisata terlayani',
      deskripsiLokasi:
        'Kawasan Mata Air Cerorong dan Danau Biru menuju zona Barat dan kawasan Selong Belanak, Lombok Tengah.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Lombok Tengah' },
        studiKelayakan: { status: 'Proses', keterangan: 'Perlu dilakukan review DED & FS' },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat minat Bupati Lombok Tengah dan komitmen Perumdam Tiara',
        },
        sertifikatLahan: {
          status: 'Proses',
          keterangan: 'Perlu pembebasan lahan lokasi IPA',
        },
        ded: { status: 'Proses', keterangan: 'Perlu review DED jaringan perpipaan dan IPA' },
        rab: { status: 'Proses', keterangan: 'RAB kebutuhan alokasi Rp 147,65 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Penyusunan dokumen AMDAL / UKL-UPL' },
        lainnya: {
          customLabel: 'Unit Air Baku BBWS',
          status: 'Proses',
          keterangan:
            'Perlu didahului unit air baku oleh DJ SDA / BBWS dan proses perizinan IPSDA',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-009',
    kodeUsulan: 'CK-NTB-27-009',
    namaProgram:
      'Pembangunan IPA Kap.150 L/detik dan jaringan perpipaan SPAM Meninting',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Lombok Barat',
    kecamatanKawasan: 'Kec. Batulayar - Kawasan Senggigi',
    locationQuery: 'Meninting, Lombok Barat, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5398, lng: 116.0827 },
    manualAddressLabel: 'Bendungan Meninting ke Kawasan Pariwisata Senggigi & Mataram',
    volumeTarget: 150,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 75000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'MYC',
    pagu: { y2027: 120.0, y2028: 106.48, y2029: 0, y2030: 0 },
    skorRc: 63.5,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: true,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional:
      'PN 2 · Pemanfaatan Air Baku Bendungan Meninting untuk KSPN Senggigi & Aglomerasi Mataram',
    serviceRadiusKm: 6.5,
    corridorGroup: 'Koridor Regional Lombok Barat - Mataram',
    catatanTeknis:
      'Mendukung Kawasan Strategis Pariwisata di Kawasan Senggigi. Persentase cakupan air minum di Kab Lombok Barat dan Kota Mataram baru 47,05% (160.165 SR atau 2.002 l/d), sedangkan ketersediaan air audit BPKP 2025 hanya 1.603 l/d, sehingga masih kurang 400 l/d. Perlu didahului unit air baku DJ SDA / BBWS, review DED & FS, serta proses IPSDA. Belum ada pembahasan dengan Subdit wilayah dan BTBGPL. Usulan Komisi V DPR RI Dapil NTB II (Abdul Hadi). Memorandum Program.',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Mendukung Kawasan Strategis Pariwisata di Kawasan Senggigi. Persentase cakupan layanan air minum di Lombok Barat dan Kota Mataram baru mencapai 47,05% (160.165 SR setara 2.002 L/d) sedangkan ketersediaan air hasil audit BPKP TA 2025 sebesar 1.603 L/d, sehingga ketersediaan air baku masih defisit 400 L/detik.',
      dasarPenugasan:
        'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi) · Memorandum Program',
      manfaatKegiatan:
        'Menutup defisit pasokan air minum regional bagi 75.000 jiwa masyarakat serta fasilitas akomodasi pariwisata KSPN Senggigi.',
      lingkupPekerjaan: [
        'Pembangunan IPA kapasitas 150 L/detik memanfaatkan air baku Bendungan Meninting',
        'Pemasangan pipa transmisi utama dari Bendungan Meninting ke Senggigi dan Mataram',
        'Pembangunan reservoir distribusi utama',
        'Sinkronisasi unit air baku BBWS dan pemenuhan proses IPSDA',
      ],
      biayaFisikMiliar: 215.16,
      biayaSupervisiMiliar: 11.32,
      durasiHari: 540,
      durasiBulan: 18,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Juni 2028',
      outputTambahan: '150 L/detik IPA & Transmisi Meninting',
      outcomeTambahan: '75.000 jiwa terlayani & defisit 400 l/d teratasi',
      deskripsiLokasi:
        'Hilir Bendungan Meninting melintasi Kecamatan Batulayar hingga perbatasan Kota Mataram, Lombok Barat.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Regional Lombok Barat - Mataram' },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Perlu dilakukan review DED & FS SPAM Meninting',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Kesepakatan bersama Bupati Lombok Barat dan Walikota Mataram',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Lahan tapak IPA di kawasan sabuk hijau bendungan',
        },
        ded: { status: 'Proses', keterangan: 'Review DED jaringan pipa transmisi dan IPA' },
        rab: { status: 'Proses', keterangan: 'RAB kebutuhan alokasi Rp 226,48 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Penyusunan dokumen lingkungan AMDAL' },
        lainnya: {
          customLabel: 'Unit Air Baku BBWS',
          status: 'Proses',
          keterangan:
            'Perlu didahului unit air baku oleh DJ SDA / BBWS dan proses perizinan IPSDA',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-010',
    kodeUsulan: 'CK-NTB-27-010',
    namaProgram:
      'Pembangunan IPA Kap. 80 L/detik dan Jaringan Perpipaan SPAM Ai Ngelar Kab. Sumbawa',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Sumbawa',
    kecamatanKawasan: 'Kec. Moyo Hilir - SAMOTA',
    locationQuery: 'Ai Ngelar, Sumbawa, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.5290, lng: 117.4812 },
    manualAddressLabel: 'Kawasan Ai Ngelar, Sekolah Garuda & Kompleks Marinir, Sumbawa',
    volumeTarget: 80,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 40000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'MYC',
    pagu: { y2027: 90.0, y2028: 76.63, y2029: 0, y2030: 0 },
    skorRc: 61.5,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: true,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional:
      'PN 2 · Penyediaan Air Minum Fasilitas Pendidikan, Hankam & Kawasan SAMOTA',
    serviceRadiusKm: 5.0,
    corridorGroup: 'Koridor SAMOTA - Sumbawa Timur',
    catatanTeknis:
      'Untuk mendukung ketersediaan air Sekolah Garuda dan Kompleks Marinir. Mendukung Kawasan Strategis SAMOTA dan perdagangan/jasa Sumbawa. Perlu dibangun intake dan pipa air baku (DJ SDA/BBWS) dan perlu review DED & FS. Tahun 2027, BBWS mengintervensi Intake Air Baku serta jaringan. Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi). Memorandum Program.',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Untuk mendukung ketersediaan air minum Sekolah Garuda dan Kompleks Marinir, serta mendukung Kawasan Strategis Provinsi SAMOTA dan sektor unggulan perdagangan, jasa, dan industri Kabupaten Sumbawa.',
      dasarPenugasan:
        'Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi) · Memorandum Program',
      manfaatKegiatan:
        'Menyediakan pasokan air minum aman berkapasitas 80 L/detik melayani 40.000 jiwa masyarakat, institusi pendidikan, dan fasilitas pertahanan negara.',
      lingkupPekerjaan: [
        'Pembangunan IPA modern kapasitas 80 L/detik',
        'Pemasangan pipa transmisi dan jaringan pipa distribusi Ai Ngelar',
        'Sinkronisasi intervensi intake air baku dan jaringan pipa transmisi oleh BBWS TA 2027',
      ],
      biayaFisikMiliar: 158.3,
      biayaSupervisiMiliar: 8.33,
      durasiHari: 540,
      durasiBulan: 18,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Juni 2028',
      outputTambahan: '80 L/detik IPA & Transmisi SPAM',
      outcomeTambahan: '40.000 jiwa, Sekolah Garuda & Marinir terlayani',
      deskripsiLokasi:
        'Kawasan Ai Ngelar menuju koridor Sekolah Garuda dan Kompleks Marinir, Kabupaten Sumbawa.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Sumbawa' },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Perlu review dokumen FS & keterpaduan jaringan',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat minat Bupati Sumbawa dan instansi terkait',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Lahan tapak IPA siap di kawasan Ai Ngelar',
        },
        ded: {
          status: 'Proses',
          keterangan: 'Perlu review DED instalasi pengolahan air dan transmisi',
        },
        rab: { status: 'Proses', keterangan: 'RAB kebutuhan alokasi Rp 166,63 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Penyusunan dokumen lingkungan UKL-UPL' },
        lainnya: {
          customLabel: 'Intervensi BBWS 2027',
          status: 'Proses',
          keterangan:
            'Tahun 2027, BBWS mengintervensi pembangunan Intake Air Baku serta jaringan pipa transmisi',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-011',
    kodeUsulan: 'CK-NTB-27-011',
    namaProgram:
      'Pembangunan IPA Kapasitas 2x50 L/detik dan Jaringan Perpipaan SPAM Mila Kabupaten Dompu',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Dompu',
    kecamatanKawasan: 'Kec. Woja & Kec. Dompu',
    locationQuery: 'Bendungan Mila, Dompu, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.4983, lng: 118.4239 },
    manualAddressLabel: 'Bendungan Mila ke Kawasan Perkotaan Woja - Dompu',
    volumeTarget: 100,
    satuanTarget: 'Liter/detik',
    penerimaManfaatJiwa: 45000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 62.12, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 22,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: false,
      dokumenLingkungan: false,
      lembagaPengelola: false,
    },
    statusVerifikasi: StatusVerifikasi.REVISI_RC,
    prioritasNasional:
      'PN 2 · Pemanfaatan Air Baku Bendungan Mila & Penyehatan PDAM Dompu',
    serviceRadiusKm: 5.0,
    corridorGroup: 'Koridor Bendungan Mila - Dompu',
    catatanTeknis:
      'Kebutuhan air masyarakat yang masih kurang untuk kecamatan Dompu karena kondisi IPA sudah tidak optimal. Penambahan sumber air baku karena pertumbuhan penduduk yang semakin pesat. Perlu menuntaskan pembangunan pipa air baku (setelah Pemda memfixkan titik lokasi IPA), serta perlu dilakukan upaya peningkatan kinerja dan penyehatan PDAM Kab Dompu. Penyelesaian SPAM Kandidi oleh Pemprov NTB dan optimalisasi IPA Rora/Selaparang. Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Kebutuhan air masyarakat yang masih kurang untuk kecamatan Dompu karena kondisi IPA eksisting tidak optimal, serta perlunya penambahan sumber air baku dari Bendungan Mila seiring pertumbuhan penduduk yang pesat.',
      dasarPenugasan: 'Komisi V DPR RI Daerah Pemilihan NTB I (Mori Hanafi)',
      manfaatKegiatan:
        'Menyediakan pasokan air minum kapasitas 100 L/detik (2x50 L/d) bagi 45.000 jiwa masyarakat di Kecamatan Woja dan Dompu.',
      lingkupPekerjaan: [
        'Pembangunan IPA kapasitas 2x50 L/detik',
        'Pembangunan pipa transmisi air baku dari Bendungan Mila',
        'Penetapan titik lokasi definitif IPA oleh Pemda dan perbaikan kinerja PDAM',
      ],
      biayaFisikMiliar: 59.01,
      biayaSupervisiMiliar: 3.11,
      durasiHari: 360,
      durasiBulan: 12,
      waktuMulai: 'Januari 2027',
      waktuSelesai: 'Desember 2027',
      outputTambahan: '100 L/detik (2x50 L/d) IPA & Transmisi',
      outcomeTambahan: '45.000 jiwa terlayani air minum aman',
      deskripsiLokasi:
        'Hilir Bendungan Mila melintasi Kecamatan Woja menuju wilayah perkotaan Kabupaten Dompu.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Dompu' },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Kajian pemanfaatan air baku Bendungan Mila',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat permohonan Bupati Dompu',
        },
        sertifikatLahan: {
          status: 'Belum Lengkap',
          keterangan: 'Perlu menuntaskan penetapan dan pembebasan titik lokasi IPA oleh Pemda',
        },
        ded: {
          status: 'Proses',
          keterangan: 'Penyiapan DED pipa air baku dan unit produksi IPA',
        },
        rab: { status: 'Proses', keterangan: 'RAB kebutuhan alokasi Rp 62,12 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Penyusunan dokumen lingkungan UKL-UPL' },
        lainnya: {
          customLabel: 'Penyehatan PDAM',
          status: 'Proses',
          keterangan:
            'Perlu penyehatan PDAM Dompu, integrasi SPAM Kandidi, dan optimalisasi IPA Rora/Selaparang',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-012',
    kodeUsulan: 'CK-NTB-27-012',
    namaProgram: 'Pembangunan TPST Sembalun, Kab Lombok Timur',
    sektor: SektorCiptaKarya.SANITASI,
    kabupatenKota: 'Kab. Lombok Timur',
    kecamatanKawasan: 'Kec. Sembalun',
    locationQuery: 'Sembalun, Lombok Timur, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.3621, lng: 116.5350 },
    manualAddressLabel: 'Kawasan Agropolitan & KSPN Rinjani Sembalun, Lombok Timur',
    volumeTarget: 6292,
    satuanTarget: 'Kepala Keluarga (KK)',
    penerimaManfaatJiwa: 25168,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 45.76, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 11,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: false,
      dokumenLingkungan: false,
      lembagaPengelola: false,
    },
    statusVerifikasi: StatusVerifikasi.REVISI_RC,
    prioritasNasional:
      'PN 2 · Pengelolaan Sampah KSPN Rinjani & Kawasan Agropolitan Sembalun',
    serviceRadiusKm: 4.5,
    corridorGroup: 'Kawasan KSPN Rinjani Sembalun',
    catatanTeknis:
      'Dalam Dokumen RIPARNAS (PP No.50/2011) termasuk mendukung KSPN Rinjani dan Sekitarnya. Dalam Dokumen RPIW termasuk Pengembangan Kawasan Prioritas Pariwisata KP Rinjani dan Kawasan Prioritas Pertanian Lombok Timur. Mendukung Kawasan Agropolitan Sembalun. RC Belum Terpenuhi: 1. Adanya perubahan lokasi yang menyebabkan status kesiapan lahan belum terpenuhi; 2. Perlu reviu FS, DED dan RAB. Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Dalam dokumen RIPARNAS termasuk mendukung KSPN Rinjani dan dalam dokumen RPIW mendukung Pengembangan Kawasan Prioritas Pariwisata KP Rinjani serta Kawasan Pertanian Agropolitan Sembalun. Fasilitas TPST diperlukan untuk mengolah timbulan sampah wisata dan pertanian.',
      dasarPenugasan: 'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi)',
      manfaatKegiatan:
        'Mengolah sampah organik pertanian dan sampah permukiman pariwisata melayani 6.292 KK (25.168 jiwa).',
      lingkupPekerjaan: [
        'Penyelesaian legalitas lahan dan sertifikasi pada lokasi baru TPST',
        'Pembangunan hanggar pengolahan sampah dan sarana komposting TPST Sembalun',
        'Reviu komprehensif dokumen FS, DED, dan RAB',
      ],
      biayaFisikMiliar: 43.47,
      biayaSupervisiMiliar: 2.29,
      durasiHari: 330,
      durasiBulan: 11,
      waktuMulai: 'Februari 2027',
      waktuSelesai: 'Desember 2027',
      outputTambahan: '6.292 KK Terlayani Pengolahan Sampah',
      outcomeTambahan: 'Kawasan ekowisata Rinjani Sembalun bersih lestari',
      deskripsiLokasi:
        'Lembah Sembalun, sentra pertanian agropolitan dan wisata lereng Rinjani, Lombok Timur.',
      rcDetails: {
        rencanaInduk: {
          status: 'Lengkap',
          keterangan: 'RIPARNAS KSPN Rinjani & RPIW Agropolitan Sembalun',
        },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Perlu reviu FS karena adanya perubahan lokasi',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat minat Bupati Lombok Timur',
        },
        sertifikatLahan: {
          status: 'Belum Lengkap',
          keterangan:
            'Adanya perubahan lokasi menyebabkan status kesiapan lahan belum terpenuhi',
        },
        ded: {
          status: 'Proses',
          keterangan: 'Perlu reviu DED menyesuaikan tapak kontur lokasi baru',
        },
        rab: { status: 'Proses', keterangan: 'RAB kebutuhan alokasi Rp 45,76 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Penyusunan dokumen lingkungan UKL-UPL lokasi baru' },
        lainnya: {
          customLabel: 'Kesiapan Lembaga O&P',
          status: 'Proses',
          keterangan: 'Penguatan kelembagaan pengelola persampahan KSPN Sembalun',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-013',
    kodeUsulan: 'CK-NTB-27-013',
    namaProgram: 'Pembangunan TPST Kab Lombok Barat',
    sektor: SektorCiptaKarya.SANITASI,
    kabupatenKota: 'Kab. Lombok Barat',
    kecamatanKawasan: 'Kec. Gerung / Kebon Talo',
    locationQuery: 'Gerung, Lombok Barat, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.6821, lng: 116.1287 },
    manualAddressLabel: 'Kawasan Gerung / Kebon Talo, Kab. Lombok Barat',
    volumeTarget: 15000,
    satuanTarget: 'Kepala Keluarga (KK)',
    penerimaManfaatJiwa: 60000,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 28.5, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 35,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional:
      'PN 2 · Pengurangan Sampah & Pengurangan Beban Overloading TPA Regional',
    serviceRadiusKm: 5.0,
    corridorGroup: 'Koridor Perkotaan Lombok Barat Selatan',
    catatanTeknis:
      'Pembangunan TPST untuk mengatasi krisis volume sampah, mengurangi beban overloading di Tempat Pembuangan Akhir (TPA) dan memanfaatkan teknologi pemilahan, pengomposan organik, dan daur ulang anorganik. Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Pembangunan TPST di Kabupaten Lombok Barat diperlukan untuk mengatasi krisis volume sampah perkotaan, mengurangi beban overloading di TPA, serta memanfaatkan teknologi pemilahan, pengomposan sampah organik, dan daur ulang anorganik.',
      dasarPenugasan: 'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi)',
      manfaatKegiatan:
        'Mengurangi beban residu pembuangan akhir ke TPA dan menyediakan sistem pengolahan sampah modern melayani 15.000 KK (60.000 jiwa).',
      lingkupPekerjaan: [
        'Pembangunan hanggar pengolahan sampah TPST Lombok Barat',
        'Pengadaan peralatan conveyor pemilahan, mesin pencacah kompos, dan pres sampah',
        'Penyusunan kelengkapan DED, RAB definitif, dan dokumen lingkungan',
      ],
      biayaFisikMiliar: 27.08,
      biayaSupervisiMiliar: 1.42,
      durasiHari: 300,
      durasiBulan: 10,
      waktuMulai: 'Maret 2027',
      waktuSelesai: 'Desember 2027',
      outputTambahan: '15.000 KK Layanan TPST',
      outcomeTambahan: '60.000 jiwa menikmati lingkungan bebas sampah',
      deskripsiLokasi:
        'Kawasan penyangga perkotaan Gerung / Kebon Talo, Kabupaten Lombok Barat.',
      rcDetails: {
        rencanaInduk: {
          status: 'Lengkap',
          keterangan: 'Masterplan Pengelolaan Sampah Kabupaten Lombok Barat',
        },
        studiKelayakan: {
          status: 'Proses',
          keterangan: 'Kajian kelayakan teknologi TPST dan reduksi sampah',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat usulan dan komitmen Bupati Lombok Barat',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Aset lahan Pemerintah Kabupaten Lombok Barat',
        },
        ded: { status: 'Proses', keterangan: 'Penyiapan DED teknis hanggar TPST' },
        rab: { status: 'Proses', keterangan: 'Estimasi RAB alokasi Rp 28,50 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Penyusunan dokumen lingkungan UKL-UPL' },
        lainnya: {
          customLabel: 'Teknologi Pemilahan',
          status: 'Proses',
          keterangan: 'Pemanfaatan teknologi pemilahan, komposting organik, dan daur ulang anorganik',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
  {
    id: 'usulan-ck-014',
    kodeUsulan: 'CK-NTB-27-014',
    namaProgram:
      'Pembangunan SPAM Desa Rempek, Kec. Gangga dan Desa Samaguna, Kec. Tanjung Kab. Lombok Utara',
    sektor: SektorCiptaKarya.AIR_MINUM,
    kabupatenKota: 'Kab. Lombok Utara',
    kecamatanKawasan: 'Kec. Gangga & Kec. Tanjung',
    locationQuery: 'Gangga, Lombok Utara, Nusa Tenggara Barat, Indonesia',
    manualPosition: { lat: -8.3512, lng: 116.2084 },
    manualAddressLabel: 'Desa Rempek (Kec. Gangga) & Desa Samaguna (Kec. Tanjung), Lombok Utara',
    volumeTarget: 2500,
    satuanTarget: 'Sambungan Rumah (SR)',
    penerimaManfaatJiwa: 12500,
    sumberDana: SumberDana.APBN_RM,
    skemaKontrak: 'SYC',
    pagu: { y2027: 24.85, y2028: 0, y2029: 0, y2030: 0 },
    skorRc: 40,
    readiness: {
      dokumenPerencanaan: true,
      dedRab: false,
      kesiapanLahan: true,
      dokumenLingkungan: false,
      lembagaPengelola: true,
    },
    statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
    prioritasNasional:
      'PN 2 · Integrasi Jaringan SPAM Sekeper & SPAM Anjah Layanan Dasar Permukiman',
    serviceRadiusKm: 4.5,
    corridorGroup: 'Koridor SPAM Lombok Utara',
    catatanTeknis:
      'Diperlukan pembangunan dan/atau peningkatan SPAM di Desa Rempek dan Desa Samaguna sebagai upaya untuk memperluas cakupan pelayanan dan memenuhi kebutuhan air minum masyarakat secara lebih efektif dan berkelanjutan. Untuk Desa Rempek sudah dilayani PDAM melalui SPAM Sekeper. Untuk Desa Samaguna sudah dilayani PDAM melalui SPAM Anjah (khusus Desa Samaguna tahun 2026 mendapatkan bantuan SR dari Pekerjaan Optimalisasi SPAM Anjah). Usulan Komisi V DPR RI Dapil NTB II (Abdul Hadi).',
    templateDetails: {
      provinsi: 'Nusa Tenggara Barat',
      latarBelakang:
        'Diperlukan pembangunan dan/atau peningkatan SPAM di Desa Rempek dan Desa Samaguna sebagai upaya memperluas cakupan pelayanan dan memenuhi kebutuhan air minum masyarakat secara efektif dan berkelanjutan, melalui infrastruktur terintegrasi dari sumber air baku, pengolahan, perpipaan, hingga sambungan pelayanan.',
      dasarPenugasan: 'Usulan Komisi V DPR RI Daerah Pemilihan NTB II (Abdul Hadi)',
      manfaatKegiatan:
        'Memperluas layanan air minum perpipaan bagi 2.500 SR (12.500 jiwa) di Desa Rempek dan Desa Samaguna.',
      lingkupPekerjaan: [
        'Peningkatan dan integrasi pipa distribusi SPAM Sekeper dan SPAM Anjah',
        'Pemasangan pipa jaringan distribusi utama dan sambungan rumah (SR)',
        'Pembangunan bak penampung dan pengatur tekanan',
      ],
      biayaFisikMiliar: 23.61,
      biayaSupervisiMiliar: 1.24,
      durasiHari: 300,
      durasiBulan: 10,
      waktuMulai: 'Februari 2027',
      waktuSelesai: 'November 2027',
      outputTambahan: '2.500 Sambungan Rumah (SR)',
      outcomeTambahan: '12.500 jiwa terlayani air minum perpipaan',
      deskripsiLokasi:
        'Desa Rempek (Kecamatan Gangga) dan Desa Samaguna (Kecamatan Tanjung), Kabupaten Lombok Utara.',
      rcDetails: {
        rencanaInduk: { status: 'Lengkap', keterangan: 'RISPAM Kabupaten Lombok Utara' },
        studiKelayakan: {
          status: 'Lengkap',
          keterangan: 'Kajian integrasi sistem SPAM Sekeper & SPAM Anjah',
        },
        suratMinatKepalaDaerah: {
          status: 'Lengkap',
          keterangan: 'Surat usulan Bupati Lombok Utara dan PDAM',
        },
        sertifikatLahan: {
          status: 'Lengkap',
          keterangan: 'Lahan bak penampung dan jalur pipa desa bebas sengketa',
        },
        ded: {
          status: 'Proses',
          keterangan: 'Penyiapan DED perpipaan distribusi dan sambungan rumah',
        },
        rab: { status: 'Proses', keterangan: 'Estimasi RAB alokasi Rp 24,85 Miliar' },
        dokumenLingkungan: { status: 'Proses', keterangan: 'Dokumen lingkungan SPPL / UKL-UPL' },
        lainnya: {
          customLabel: 'Sinergi Bantuan 2026',
          status: 'Lengkap',
          keterangan:
            'Desa Samaguna tahun 2026 mendapatkan bantuan SR dari Pekerjaan Optimalisasi SPAM Anjah',
        },
      },
    },
    updatedAt: '2026-11-10',
    isPublished: true,
  },
];

// Non-persisted sample template object used ONLY when inspecting the blank KEMENPU template preview
export const TEMPLATE_DEMO_PROPOSAL: UsulanProgram = {
  id: '__template_demo__',
  kodeUsulan: 'CONTOH-TEMPLATE',
  namaProgram: 'NAMA USULAN KEGIATAN',
  sektor: SektorCiptaKarya.AIR_MINUM,
  kabupatenKota: 'KABUPATEN/KOTA',
  kecamatanKawasan: 'Kawasan Prioritas',
  locationQuery: 'Mataram, Nusa Tenggara Barat, Indonesia',
  manualPosition: { lat: -8.5833, lng: 116.1167 },
  volumeTarget: 0,
  satuanTarget: 'Liter/detik',
  penerimaManfaatJiwa: 0,
  sumberDana: SumberDana.APBN_RM,
  skemaKontrak: 'MYC',
  pagu: { y2027: 0, y2028: 0, y2029: 0, y2030: 0 },
  skorRc: 0,
  readiness: {
    dokumenPerencanaan: false,
    dedRab: false,
    kesiapanLahan: false,
    dokumenLingkungan: false,
    lembagaPengelola: false,
  },
  statusVerifikasi: StatusVerifikasi.MENUNGGU_KONREG,
  prioritasNasional: 'Jelaskan terkait dukungan kegiatan terhadap PN, PKPN, dan/atau prioritas lainnya',
  serviceRadiusKm: 4.0,
  catatanTeknis:
    'Gambaran lokasi kegiatan/ kondisi sistem jaringan/ kondisi awal vs rencana yang bisa menjelaskan urgensitas kegiatan',
  templateDetails: {
    provinsi: 'PROVINSI',
    latarBelakang: 'Latar belakang pelaksanaan kegiatan infrastruktur Cipta Karya',
    dasarPenugasan: 'Dasar penugasan / arahan strategis / dokumen perencanaan',
    manfaatKegiatan: 'Jelaskan manfaat kegiatan bagi masyarakat dan wilayah layanan',
    lingkupPekerjaan: ['Lingkup 1', 'Lingkup 2', '...'],
    biayaFisikMiliar: 0,
    biayaSupervisiMiliar: 0,
    durasiHari: 0,
    durasiBulan: 0,
    waktuMulai: '-',
    waktuSelesai: '-',
    outputTambahan: '...... Sambungan Rumah',
    outcomeTambahan: '......',
    deskripsiLokasi:
      'Gambaran lokasi kegiatan/ kondisi sistem jaringan/ kondisi awal vs rencana yang bisa menjelaskan urgensitas kegiatan',
    rcDetails: {
      rencanaInduk: { status: '', ada: false, kurang: false, sesuai: false, keterangan: '' },
      fsDedRab: { status: '', ada: false, kurang: false, sesuai: false, keterangan: '' },
      suratMinatKepalaDaerah: {
        status: '',
        ada: false,
        kurang: false,
        sesuai: false,
        keterangan: '',
      },
      sertifikatLahan: { status: '', ada: false, kurang: false, sesuai: false, keterangan: '' },
      dokumenLingkungan: { status: '', ada: false, kurang: false, sesuai: false, keterangan: '' },
      lainnya: {
        customLabel: 'Lainnya.....(silakan tambahkan)',
        status: '',
        ada: false,
        kurang: false,
        sesuai: false,
        keterangan: '',
      },
    },
  },
  updatedAt: new Date().toISOString().slice(0, 10),
};

export function tryParseNumberFlexible(val: string | number | undefined | null): number | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const str = String(val).trim();
  if (str === '') return null;
  let cleaned = str.replace(/\s/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNumberFlexible(val: string | number | undefined | null): number {
  return tryParseNumberFlexible(val) ?? 0;
}

export function getTotalPaguUsulan(pagu: UsulanProgram['pagu']): number {
  return Number((pagu.y2027 + pagu.y2028 + pagu.y2029 + pagu.y2030).toFixed(2));
}

export function resolveProposalTemplateDetails(proposal: UsulanProgram): Required<
  Omit<ProposalTemplateDetails, 'lokasiGambarUrl' | 'rcDetails'>
> & {
  lokasiGambarUrl?: string;
  rcDetails: Record<RcDocKey, RcDocumentEntry>;
} {
  const d = proposal.templateDetails ?? {};
  const totalPagu = getTotalPaguUsulan(proposal.pagu);

  const hasExplicitBudgetSplit =
    typeof d.biayaFisikMiliar === 'number' || typeof d.biayaSupervisiMiliar === 'number';
  const biayaFisikMiliar = hasExplicitBudgetSplit
    ? Number((d.biayaFisikMiliar ?? 0).toFixed(2))
    : Number((totalPagu * 0.95).toFixed(2));
  const biayaSupervisiMiliar = hasExplicitBudgetSplit
    ? Number((d.biayaSupervisiMiliar ?? 0).toFixed(2))
    : Number(Math.max(0, totalPagu - biayaFisikMiliar).toFixed(2));

  const activeYearsCount = [
    proposal.pagu.y2027 > 0,
    proposal.pagu.y2028 > 0,
    proposal.pagu.y2029 > 0,
    proposal.pagu.y2030 > 0,
  ].filter(Boolean).length;
  const defaultMonths = activeYearsCount > 0 ? activeYearsCount * 12 : 12;
  const durasiBulan =
    typeof d.durasiBulan === 'number' && Number.isFinite(d.durasiBulan)
      ? d.durasiBulan
      : defaultMonths;
  const durasiHari =
    typeof d.durasiHari === 'number' && Number.isFinite(d.durasiHari)
      ? d.durasiHari
      : durasiBulan * 30;

  const activeYearLabels: string[] = [];
  if (proposal.pagu.y2027 > 0) activeYearLabels.push('2027');
  if (proposal.pagu.y2028 > 0) activeYearLabels.push('2028');
  if (proposal.pagu.y2029 > 0) activeYearLabels.push('2029');
  if (proposal.pagu.y2030 > 0) activeYearLabels.push('2030');

  const waktuMulai =
    d.waktuMulai !== undefined && d.waktuMulai.trim() !== ''
      ? d.waktuMulai
      : activeYearLabels.length > 0
        ? `Januari ${activeYearLabels[0]}`
        : '-';
  const waktuSelesai =
    d.waktuSelesai !== undefined && d.waktuSelesai.trim() !== ''
      ? d.waktuSelesai
      : activeYearLabels.length > 0
        ? `Desember ${activeYearLabels[activeYearLabels.length - 1]}`
        : '-';

  const existingRc = d.rcDetails ?? {};

  const normalizeEntry = (
    entry: RcDocumentEntry | undefined,
    fallbackReadyFlag?: boolean,
    defaultCustomLabel?: string
  ): RcDocumentEntry => {
    if (!entry) {
      const ada = Boolean(fallbackReadyFlag);
      const sesuai = Boolean(fallbackReadyFlag);
      const kurang = fallbackReadyFlag === false;
      return {
        status: formatRcChecklistSummary({ ada, kurang, sesuai }),
        ada,
        kurang,
        sesuai,
        keterangan: '',
        ...(defaultCustomLabel ? { customLabel: defaultCustomLabel } : {}),
      };
    }
    const flags = getRcChecklistFlags(entry);
    return {
      ...entry,
      ...flags,
      status: entry.status?.trim() || formatRcChecklistSummary(flags),
      keterangan: entry.keterangan ?? '',
      ...(defaultCustomLabel && !entry.customLabel ? { customLabel: defaultCustomLabel } : {}),
    };
  };

  const resolveMergedFsDedRab = (): RcDocumentEntry => {
    if (existingRc.fsDedRab) {
      return normalizeEntry(existingRc.fsDedRab);
    }
    const legacyParts = [
      existingRc.studiKelayakan,
      existingRc.ded,
      existingRc.rab,
    ].filter((item): item is RcDocumentEntry => Boolean(item));

    if (legacyParts.length === 0) {
      return normalizeEntry(undefined, proposal.readiness.dedRab);
    }

    const partFlags = legacyParts.map((item) => getRcChecklistFlags(item));
    const anyAda = partFlags.some((f) => f.ada);
    const anyKurang = partFlags.some((f) => f.kurang || !f.sesuai);
    const allSesuai = partFlags.every((f) => f.sesuai && !f.kurang);
    const flags = {
      ada: anyAda,
      kurang: allSesuai ? false : anyKurang,
      sesuai: allSesuai,
    };

    const notes = Array.from(
      new Set(
        legacyParts
          .map((item) => item.keterangan?.trim())
          .filter((text): text is string => Boolean(text))
      )
    );

    return {
      status: formatRcChecklistSummary(flags),
      ...flags,
      keterangan: notes.join(' · '),
    };
  };

  const rcDetails: Record<RcDocKey, RcDocumentEntry> = {
    rencanaInduk: normalizeEntry(existingRc.rencanaInduk, proposal.readiness.dokumenPerencanaan),
    fsDedRab: resolveMergedFsDedRab(),
    suratMinatKepalaDaerah: normalizeEntry(
      existingRc.suratMinatKepalaDaerah,
      proposal.readiness.lembagaPengelola
    ),
    sertifikatLahan: normalizeEntry(existingRc.sertifikatLahan, proposal.readiness.kesiapanLahan),
    dokumenLingkungan: normalizeEntry(
      existingRc.dokumenLingkungan,
      proposal.readiness.dokumenLingkungan
    ),
    lainnya: normalizeEntry(
      existingRc.lainnya,
      undefined,
      'Lainnya.....(silakan tambahkan)'
    ),
  };

  return {
    provinsi: d.provinsi?.trim() || 'Nusa Tenggara Barat',
    latarBelakang:
      d.latarBelakang?.trim() ||
      proposal.catatanTeknis?.trim() ||
      `Pemenuhan kebutuhan layanan infrastruktur ${SEKTOR_SHORT_LABELS[proposal.sektor]} pada ${proposal.kecamatanKawasan}, ${proposal.kabupatenKota}.`,
    dasarPenugasan:
      d.dasarPenugasan?.trim() ||
      'Sinkronisasi Program Infrastruktur Cipta Karya BPBPK Nusa Tenggara Barat TA 2027–2030',
    manfaatKegiatan:
      d.manfaatKegiatan?.trim() ||
      (proposal.penerimaManfaatJiwa > 0
        ? `Meningkatkan akses layanan infrastruktur dasar bagi ${proposal.penerimaManfaatJiwa.toLocaleString('id-ID')} jiwa di ${proposal.kabupatenKota}.`
        : `Meningkatkan akses layanan infrastruktur dasar di ${proposal.kabupatenKota}.`),
    lingkupPekerjaan:
      Array.isArray(d.lingkupPekerjaan) && d.lingkupPekerjaan.length > 0
        ? d.lingkupPekerjaan
        : [
            `Pembangunan / optimalisasi ${proposal.namaProgram}`,
            ...(proposal.volumeTarget > 0
              ? [`Pekerjaan fisik kapasitas ${proposal.volumeTarget} ${proposal.satuanTarget}`]
              : []),
          ],
    biayaFisikMiliar,
    biayaSupervisiMiliar,
    durasiHari,
    durasiBulan,
    waktuMulai,
    waktuSelesai,
    outputTambahan: d.outputTambahan?.trim() ?? '',
    outcomeTambahan: d.outcomeTambahan?.trim() ?? '',
    deskripsiLokasi:
      d.deskripsiLokasi?.trim() ||
      proposal.catatanTeknis?.trim() ||
      `Lokasi kegiatan berada di ${proposal.kecamatanKawasan}, ${proposal.kabupatenKota} dengan radius cakupan layanan ${proposal.serviceRadiusKm} km.`,
    lokasiGambarUrl: d.lokasiGambarUrl,
    statusManual: d.statusManual?.trim() ?? '',
    rcDetails,
  };
}

export function getRcChecklistFlags(entry?: Partial<RcDocumentEntry>): {
  ada: boolean;
  kurang: boolean;
  sesuai: boolean;
} {
  if (!entry) return { ada: false, kurang: false, sesuai: false };
  if (
    entry.ada !== undefined ||
    entry.kurang !== undefined ||
    entry.sesuai !== undefined
  ) {
    return {
      ada: Boolean(entry.ada),
      kurang: Boolean(entry.kurang),
      sesuai: Boolean(entry.sesuai),
    };
  }
  const norm = (entry.status ?? '').trim().toLowerCase();
  if (!norm || norm === '-') {
    return { ada: false, kurang: false, sesuai: false };
  }
  if (
    (norm.includes('lengkap') && !norm.includes('belum')) ||
    norm.includes('sesuai') ||
    norm === 'selesai' ||
    norm === 'terpenuhi' ||
    norm === 'siap'
  ) {
    return { ada: true, kurang: false, sesuai: true };
  }
  if (norm === 'ada') {
    return { ada: true, kurang: false, sesuai: false };
  }
  if (norm.includes('proses') || norm.includes('revisi') || norm.includes('sebagian')) {
    return { ada: true, kurang: true, sesuai: false };
  }
  if (norm.includes('kurang') || norm.includes('belum')) {
    return { ada: false, kurang: true, sesuai: false };
  }
  return { ada: false, kurang: false, sesuai: false };
}

export function formatRcChecklistSummary(flags: {
  ada: boolean;
  kurang: boolean;
  sesuai: boolean;
}): string {
  const parts: string[] = [];
  if (flags.ada) parts.push('Ada');
  if (flags.kurang) parts.push('Kurang');
  if (flags.sesuai) parts.push('Sesuai');
  return parts.join(', ');
}

export function deriveReadinessFromRcTable(
  rcDetails: Partial<Record<LegacyRcDocKey, RcDocumentEntry>>,
  fallback: ReadinessCriteria
): ReadinessCriteria {
  const isEntryReady = (entry?: RcDocumentEntry) => {
    if (!entry) return false;
    const flags = getRcChecklistFlags(entry);
    if (flags.sesuai && !flags.kurang) return true;
    if (flags.ada && !flags.kurang) return true;
    return false;
  };

  return {
    dokumenPerencanaan: rcDetails.rencanaInduk
      ? isEntryReady(rcDetails.rencanaInduk)
      : fallback.dokumenPerencanaan,
    dedRab: rcDetails.fsDedRab
      ? isEntryReady(rcDetails.fsDedRab)
      : rcDetails.studiKelayakan || rcDetails.ded || rcDetails.rab
        ? [rcDetails.studiKelayakan, rcDetails.ded, rcDetails.rab]
            .filter((item): item is RcDocumentEntry => Boolean(item))
            .every((item) => isEntryReady(item))
        : fallback.dedRab,
    kesiapanLahan: rcDetails.sertifikatLahan
      ? isEntryReady(rcDetails.sertifikatLahan)
      : fallback.kesiapanLahan,
    dokumenLingkungan: rcDetails.dokumenLingkungan
      ? isEntryReady(rcDetails.dokumenLingkungan)
      : fallback.dokumenLingkungan,
    lembagaPengelola: rcDetails.suratMinatKepalaDaerah
      ? isEntryReady(rcDetails.suratMinatKepalaDaerah)
      : fallback.lembagaPengelola,
  };
}

export function getPaguForYearFilter(
  usulan: UsulanProgram,
  yearFilter: 'ALL' | '2027' | '2028' | '2029' | '2030'
): number {
  if (yearFilter === 'ALL') return getTotalPaguUsulan(usulan.pagu);
  if (yearFilter === '2027') return usulan.pagu.y2027;
  if (yearFilter === '2028') return usulan.pagu.y2028;
  if (yearFilter === '2029') return usulan.pagu.y2029;
  return usulan.pagu.y2030;
}

export function isActiveInYear(
  usulan: UsulanProgram,
  yearFilter: 'ALL' | '2027' | '2028' | '2029' | '2030'
): boolean {
  if (yearFilter === 'ALL') return true;
  return getPaguForYearFilter(usulan, yearFilter) > 0;
}

export function getReadinessScore(
  rc: ReadinessCriteria,
  manualSkorRc?: number
): { completed: number; total: number; percentage: number } {
  const values = [
    rc.dokumenPerencanaan,
    rc.dedRab,
    rc.kesiapanLahan,
    rc.dokumenLingkungan,
    rc.lembagaPengelola,
  ];
  const completed = values.filter(Boolean).length;
  const fallbackPercentage = Math.round((completed / 5) * 100);
  const percentage =
    typeof manualSkorRc === 'number' && Number.isFinite(manualSkorRc)
      ? Math.min(100, Math.max(0, Number(manualSkorRc.toFixed(1))))
      : fallbackPercentage;
  return {
    completed,
    total: 5,
    percentage,
  };
}

export function formatRpMiliar(val: number): string {
  return `Rp ${val.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} M`;
}

export function formatActiveYears(pagu: UsulanProgram['pagu']): string {
  const years: string[] = [];
  if (pagu.y2027 > 0) years.push('2027');
  if (pagu.y2028 > 0) years.push('2028');
  if (pagu.y2029 > 0) years.push('2029');
  if (pagu.y2030 > 0) years.push('2030');
  if (years.length === 0) return 'Belum Terjadwal';
  if (years.length === 1) return `TA ${years[0]}`;
  return `TA ${years[0]}–${years[years.length - 1]}`;
}

function createCirclePolygonCoords(
  lat: number,
  lng: number,
  radiusKm: number,
  sides = 28
): [number, number][] {
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371;
  const latRad = (lat * Math.PI) / 180;

  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const dLat = (radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.sin(angle);
    const dLng =
      ((radiusKm / earthRadiusKm) * (180 / Math.PI) * Math.cos(angle)) /
      Math.max(Math.cos(latRad), 0.01);
    coords.push([Number((lng + dLng).toFixed(6)), Number((lat + dLat).toFixed(6))]);
  }
  return coords;
}

export function buildSpatialGeoJsonLayers(
  proposals: UsulanProgram[],
  resolvedMap: Record<string, ResolvedPlaceInfo>,
  options: { includePolygons: boolean; includeCorridors: boolean }
) {
  const features: Array<{
    type: 'Feature';
    id: string;
    geometry:
      | { type: 'Polygon'; coordinates: [number, number][][] }
      | { type: 'LineString'; coordinates: [number, number][] };
    properties: Record<string, unknown>;
  }> = [];

  if (options.includePolygons) {
    for (const p of proposals) {
      const pos = p.manualPosition ?? resolvedMap[p.locationQuery]?.position;
      if (!pos) continue;
      const color = SEKTOR_COLORS[p.sektor];
      features.push({
        type: 'Feature',
        id: `poly-${p.id}`,
        geometry: {
          type: 'Polygon',
          coordinates: [createCirclePolygonCoords(pos.lat, pos.lng, p.serviceRadiusKm)],
        },
        properties: {
          featureKind: 'service_polygon',
          proposalId: p.id,
          kodeUsulan: p.kodeUsulan,
          namaProgram: p.namaProgram,
          sektor: p.sektor,
          strokeColor: color.stroke,
          fillColor: color.fill,
        },
      });
    }
  }

  if (options.includeCorridors) {
    const groups: Record<
      string,
      Array<{ proposal: UsulanProgram; lng: number; lat: number }>
    > = {};
    for (const p of proposals) {
      if (!p.corridorGroup) continue;
      const pos = p.manualPosition ?? resolvedMap[p.locationQuery]?.position;
      if (!pos) continue;
      if (!groups[p.corridorGroup]) groups[p.corridorGroup] = [];
      groups[p.corridorGroup].push({ proposal: p, lng: pos.lng, lat: pos.lat });
    }

    Object.entries(groups).forEach(([groupName, nodes]) => {
      if (nodes.length < 2) return;
      const sorted = [...nodes].sort((a, b) => a.lng - b.lng);
      features.push({
        type: 'Feature',
        id: `corridor-${groupName}`,
        geometry: {
          type: 'LineString',
          coordinates: sorted.map((n) => [n.lng, n.lat]),
        },
        properties: {
          featureKind: 'corridor_line',
          corridorName: groupName,
          strokeColor: '#0f172a',
        },
      });
    });
  }

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}

export function exportProposalsAsGeoJson(
  proposals: UsulanProgram[],
  resolvedMap: Record<string, ResolvedPlaceInfo>
): string {
  const features = proposals
    .map((p) => {
      const resolved = resolvedMap[p.locationQuery];
      const pos = p.manualPosition ?? resolved?.position;
      if (!pos) return null;
      return {
        type: 'Feature',
        id: p.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))],
        },
        properties: {
          kodeUsulan: p.kodeUsulan,
          namaProgram: p.namaProgram,
          sektor: p.sektor,
          kabupatenKota: p.kabupatenKota,
          kecamatanKawasan: p.kecamatanKawasan,
          alamatTeresolusi: p.manualAddressLabel ?? resolved?.formattedAddress ?? '',
          sumberLokasi: 'OpenStreetMap',
          volumeTarget: p.volumeTarget,
          satuanTarget: p.satuanTarget,
          penerimaManfaatJiwa: p.penerimaManfaatJiwa,
          sumberDana: p.sumberDana,
          skemaKontrak: p.skemaKontrak,
          pagu2027_Miliar: p.pagu.y2027,
          pagu2028_Miliar: p.pagu.y2028,
          pagu2029_Miliar: p.pagu.y2029,
          pagu2030_Miliar: p.pagu.y2030,
          totalPagu_Miliar: getTotalPaguUsulan(p.pagu),
          readinessPersen: getReadinessScore(p.readiness, p.skorRc).percentage,
          statusVerifikasi: p.statusVerifikasi,
          serviceRadiusKm: p.serviceRadiusKm,
        },
      };
    })
    .filter(Boolean);

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      metadata: {
        sistem: 'SIMPRA BPBPK Nusa Tenggara Barat TA. 2027–2030',
        atribusiSpasial: 'OpenStreetMap',
        tanggalEkspor: new Date().toISOString(),
      },
      features,
    },
    null,
    2
  );
}

export function exportProposalsAsCsv(
  proposals: UsulanProgram[],
  resolvedMap: Record<string, ResolvedPlaceInfo>
): string {
  const headers = [
    'Kode Usulan',
    'Nama Program',
    'Sektor Cipta Karya',
    'Kabupaten/Kota',
    'Kecamatan/Kawasan',
    'Latitude',
    'Longitude',
    'Volume Target',
    'Satuan',
    'Penerima Manfaat (Jiwa)',
    'Sumber Dana',
    'Skema',
    'Pagu 2027 (Rp M)',
    'Pagu 2028 (Rp M)',
    'Pagu 2029 (Rp M)',
    'Pagu 2030 (Rp M)',
    'Total Pagu 2027-2030 (Rp M)',
    'Kesiapan RC (%)',
    'Status',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = proposals.map((p) => {
    const pos = p.manualPosition ?? resolvedMap[p.locationQuery]?.position;
    return [
      p.kodeUsulan,
      p.namaProgram,
      SEKTOR_SHORT_LABELS[p.sektor],
      p.kabupatenKota,
      p.kecamatanKawasan,
      pos ? pos.lat.toFixed(6) : '',
      pos ? pos.lng.toFixed(6) : '',
      p.templateDetails?.outputTambahan?.trim() ||
        (p.volumeTarget > 0 ? String(p.volumeTarget) : ''),
      p.templateDetails?.outputTambahan?.trim() ? '' : p.satuanTarget,
      p.penerimaManfaatJiwa,
      p.sumberDana,
      p.skemaKontrak,
      p.pagu.y2027,
      p.pagu.y2028,
      p.pagu.y2029,
      p.pagu.y2030,
      getTotalPaguUsulan(p.pagu),
      getReadinessScore(p.readiness, p.skorRc).percentage,
      p.templateDetails?.statusManual ?? '',
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
