import {
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
    placeholderNote: 'RISPAM / SSK / Masterplan Kawasan',
  },
  {
    key: 'studiKelayakan',
    defaultLabel: 'Studi Kelayakan',
    placeholderNote: 'Feasibility Study (FS)',
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
    key: 'ded',
    defaultLabel: 'Detailed Engineering Design (DED)',
    placeholderNote: 'Gambar rencana teknis rinci',
  },
  {
    key: 'rab',
    defaultLabel: 'Rencana Anggaran Biaya (RAB)',
    placeholderNote: 'RAB & reviu harga satuan',
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

// Empty initial proposals list per user instruction ("Hapus daftar usulan kegiatan")
export const INITIAL_PROPOSALS: UsulanProgram[] = [];

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
      rencanaInduk: { status: '', keterangan: '' },
      studiKelayakan: { status: '', keterangan: '' },
      suratMinatKepalaDaerah: { status: '', keterangan: '' },
      sertifikatLahan: { status: '', keterangan: '' },
      ded: { status: '', keterangan: '' },
      rab: { status: '', keterangan: '' },
      dokumenLingkungan: { status: '', keterangan: '' },
      lainnya: {
        customLabel: 'Lainnya.....(silakan tambahkan)',
        status: '',
        keterangan: '',
      },
    },
  },
  updatedAt: new Date().toISOString().slice(0, 10),
};

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

  const defaultRcStatus = (flag: boolean) => (flag ? 'Lengkap' : 'Belum Lengkap');
  const existingRc = d.rcDetails ?? {};

  const rcDetails: Record<RcDocKey, RcDocumentEntry> = {
    rencanaInduk: existingRc.rencanaInduk ?? {
      status: defaultRcStatus(proposal.readiness.dokumenPerencanaan),
      keterangan: '',
    },
    studiKelayakan: existingRc.studiKelayakan ?? {
      status: defaultRcStatus(proposal.readiness.dokumenPerencanaan),
      keterangan: '',
    },
    suratMinatKepalaDaerah: existingRc.suratMinatKepalaDaerah ?? {
      status: defaultRcStatus(proposal.readiness.lembagaPengelola),
      keterangan: '',
    },
    sertifikatLahan: existingRc.sertifikatLahan ?? {
      status: defaultRcStatus(proposal.readiness.kesiapanLahan),
      keterangan: '',
    },
    ded: existingRc.ded ?? {
      status: defaultRcStatus(proposal.readiness.dedRab),
      keterangan: '',
    },
    rab: existingRc.rab ?? {
      status: defaultRcStatus(proposal.readiness.dedRab),
      keterangan: '',
    },
    dokumenLingkungan: existingRc.dokumenLingkungan ?? {
      status: defaultRcStatus(proposal.readiness.dokumenLingkungan),
      keterangan: '',
    },
    lainnya: existingRc.lainnya ?? {
      customLabel: 'Lainnya.....(silakan tambahkan)',
      status: '',
      keterangan: '',
    },
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
      `Meningkatkan akses layanan infrastruktur dasar bagi ${proposal.penerimaManfaatJiwa.toLocaleString('id-ID')} jiwa di ${proposal.kabupatenKota}.`,
    lingkupPekerjaan:
      Array.isArray(d.lingkupPekerjaan) && d.lingkupPekerjaan.length > 0
        ? d.lingkupPekerjaan
        : [
            `Pembangunan / optimalisasi ${proposal.namaProgram}`,
            `Pekerjaan fisik kapasitas ${proposal.volumeTarget.toLocaleString('id-ID')} ${proposal.satuanTarget}`,
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
    rcDetails,
  };
}

export function deriveReadinessFromRcTable(
  rcDetails: Partial<Record<RcDocKey, RcDocumentEntry>>,
  fallback: ReadinessCriteria
): ReadinessCriteria {
  const isReadyText = (s?: string) => {
    if (!s) return false;
    const norm = s.trim().toLowerCase();
    return (
      norm.includes('lengkap') && !norm.includes('belum')
    ) || norm === 'ada' || norm === 'selesai' || norm === 'terpenuhi' || norm === 'siap';
  };

  return {
    dokumenPerencanaan:
      rcDetails.rencanaInduk || rcDetails.studiKelayakan
        ? isReadyText(rcDetails.rencanaInduk?.status) ||
          isReadyText(rcDetails.studiKelayakan?.status)
        : fallback.dokumenPerencanaan,
    dedRab:
      rcDetails.ded || rcDetails.rab
        ? isReadyText(rcDetails.ded?.status) && isReadyText(rcDetails.rab?.status)
        : fallback.dedRab,
    kesiapanLahan: rcDetails.sertifikatLahan
      ? isReadyText(rcDetails.sertifikatLahan.status)
      : fallback.kesiapanLahan,
    dokumenLingkungan: rcDetails.dokumenLingkungan
      ? isReadyText(rcDetails.dokumenLingkungan.status)
      : fallback.dokumenLingkungan,
    lembagaPengelola: rcDetails.suratMinatKepalaDaerah
      ? isReadyText(rcDetails.suratMinatKepalaDaerah.status)
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
    'Status Verifikasi',
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
      p.volumeTarget,
      p.satuanTarget,
      p.penerimaManfaatJiwa,
      p.sumberDana,
      p.skemaKontrak,
      p.pagu.y2027,
      p.pagu.y2028,
      p.pagu.y2029,
      p.pagu.y2030,
      getTotalPaguUsulan(p.pagu),
      getReadinessScore(p.readiness, p.skorRc).percentage,
      p.statusVerifikasi,
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
