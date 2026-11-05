export enum SektorCiptaKarya {
  AIR_MINUM = 'Sistem Penyediaan Air Minum (SPAM)',
  SANITASI = 'Sanitasi',
  KAWASAN_STRATEGIS = 'Pengembangan Kawasan Strategis (PKS)',
  BINA_PENATAAN_BANGUNAN = 'Bina Penataan Bangunan (BPB)',
}

export enum SumberDana {
  APBN_RM = 'APBN Rupiah Murni',
  SBSN = 'SBSN',
  PHLN = 'PHLN',
  KPBU = 'KPBU',
}

export enum StatusVerifikasi {
  TERVERIFIKASI = 'Terverifikasi Lengkap',
  REVISI_RC = 'Revisi Dokumen RC',
  MENUNGGU_KONREG = 'Menunggu Konreg',
}

export enum WorkspaceView {
  OVERVIEW = 'overview',
  SPATIAL = 'spatial',
  MATRIX = 'matrix',
  BUDGET = 'budget',
}

export interface ReadinessCriteria {
  dokumenPerencanaan: boolean; // RISPAM / SSK / RPKPP / FS
  dedRab: boolean; // Detailed Engineering Design & RAB
  kesiapanLahan: boolean; // Clean & Clear Land Certificate
  dokumenLingkungan: boolean; // AMDAL / UKL-UPL
  lembagaPengelola: boolean; // Komitmen Pemda / UPTD / BUMD
}

export type RcDocKey =
  | 'rencanaInduk'
  | 'studiKelayakan'
  | 'suratMinatKepalaDaerah'
  | 'sertifikatLahan'
  | 'ded'
  | 'rab'
  | 'dokumenLingkungan'
  | 'lainnya';

export interface RcDocumentEntry {
  status: string;
  keterangan: string;
  customLabel?: string;
}

export interface ProposalTemplateDetails {
  provinsi?: string;
  latarBelakang?: string;
  dasarPenugasan?: string;
  manfaatKegiatan?: string;
  lingkupPekerjaan?: string[];
  biayaFisikMiliar?: number;
  biayaSupervisiMiliar?: number;
  durasiHari?: number;
  durasiBulan?: number;
  waktuMulai?: string;
  waktuSelesai?: string;
  outputTambahan?: string;
  outcomeTambahan?: string;
  deskripsiLokasi?: string;
  lokasiGambarUrl?: string;
  rcDetails?: Partial<Record<RcDocKey, RcDocumentEntry>>;
}

export interface PaguTahunan {
  y2027: number; // dalam Rp Miliar
  y2028: number;
  y2029: number;
  y2030: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ResolvedPlaceInfo {
  position: LatLngPoint;
  displayName: string;
  formattedAddress: string;
  source: 'places_api' | 'map_click' | 'gazetteer' | 'nominatim';
}

export interface UsulanProgram {
  id: string;
  kodeUsulan: string;
  namaProgram: string;
  sektor: SektorCiptaKarya;
  kabupatenKota: string;
  kecamatanKawasan: string;
  locationQuery: string;
  manualPosition?: LatLngPoint;
  manualAddressLabel?: string;
  volumeTarget: number;
  satuanTarget: string;
  penerimaManfaatJiwa: number;
  sumberDana: SumberDana;
  skemaKontrak: 'SYC' | 'MYC';
  pagu: PaguTahunan;
  skorRc?: number;
  readiness: ReadinessCriteria;
  statusVerifikasi: StatusVerifikasi;
  prioritasNasional: string;
  serviceRadiusKm: number;
  corridorGroup?: string;
  catatanTeknis: string;
  templateDetails?: ProposalTemplateDetails;
  updatedAt: string;
  authorUid?: string;
  isLocked?: boolean;
  isPublished?: boolean;
}

export type AccessMode = 'portal' | 'account';

export interface AccountSessionProfile {
  displayName: string;
  unitKerja: string;
  loginMethod: 'pin';
}

export interface SpatialLayerVisibility {
  markers: boolean;
  servicePolygons: boolean;
  corridorLines: boolean;
  customGeoJson: boolean;
}

export type MapStyleType = 'roadmap' | 'hybrid' | 'terrain';
