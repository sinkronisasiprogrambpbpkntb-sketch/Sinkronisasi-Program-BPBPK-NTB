import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileCheck2,
  ImagePlus,
  ListChecks,
  LocateFixed,
  MapPin,
  PieChart,
  Printer,
  Save,
  Square,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import {
  buildSpatialGeoJsonLayers,
  deriveReadinessFromRcTable,
  formatActiveYears,
  getReadinessScore,
  getTotalPaguUsulan,
  KEMENPU_RC_ROWS,
  resolveProposalTemplateDetails,
} from '../data/initialProposals';
import {
  LatLngPoint,
  ProposalTemplateDetails,
  RcDocKey,
  RcDocumentEntry,
  ReadinessCriteria,
  ResolvedPlaceInfo,
  SektorCiptaKarya,
  UsulanProgram,
} from '../types/ciptaKarya';

export async function compressUploadedImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        const maxWidth = 920;
        const maxHeight = 620;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses kanvas gambar.'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function getSektorMarkerBadge(sektor: SektorCiptaKarya): { code: string; bgHex: string } {
  switch (sektor) {
    case SektorCiptaKarya.AIR_MINUM:
      return { code: 'AM', bgHex: '#1d4ed8' };
    case SektorCiptaKarya.SANITASI:
      return { code: 'PLP', bgHex: '#0f766e' };
    case SektorCiptaKarya.KAWASAN_STRATEGIS:
      return { code: 'PKS', bgHex: '#d97706' };
    case SektorCiptaKarya.BINA_PENATAAN_BANGUNAN:
      return { code: 'BPB', bgHex: '#1e293b' };
  }
}

interface PreviewMiniMapProps {
  proposal: UsulanProgram;
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  position: LatLngPoint;
  miniMapType: 'roadmap' | 'hybrid';
}

const PreviewMiniMap: React.FC<PreviewMiniMapProps> = ({
  proposal,
  resolvedPlaces,
  position,
  miniMapType,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseGroupRef = useRef<L.LayerGroup | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      center: [position.lat, position.lng],
      zoom: 12,
      zoomControl: true,
    });

    const baseGroup = L.layerGroup().addTo(map);
    const overlayGroup = L.layerGroup().addTo(map);

    mapRef.current = map;
    baseGroupRef.current = baseGroup;
    overlayGroupRef.current = overlayGroup;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      baseGroupRef.current = null;
      overlayGroupRef.current = null;
    };
  }, [position.lat, position.lng]);

  useEffect(() => {
    const baseGroup = baseGroupRef.current;
    if (!baseGroup) return;
    baseGroup.clearLayers();

    if (miniMapType === 'hybrid') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: '&copy; Esri' }
      ).addTo(baseGroup);
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap' }
      ).addTo(baseGroup);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(baseGroup);
    }
  }, [miniMapType]);

  useEffect(() => {
    const map = mapRef.current;
    const overlayGroup = overlayGroupRef.current;
    if (!map || !overlayGroup) return;

    overlayGroup.clearLayers();
    map.setView([position.lat, position.lng], 12, { animate: false });

    const singleFc = buildSpatialGeoJsonLayers([proposal], resolvedPlaces, {
      includePolygons: true,
      includeCorridors: false,
    });

    L.geoJSON(singleFc as unknown as GeoJsonObject, {
      style: (feature) => {
        const stroke = String(feature?.properties?.strokeColor ?? '#0284c7');
        const fill = String(feature?.properties?.fillColor ?? '#0284c7');
        return {
          color: stroke,
          weight: 2,
          opacity: 0.85,
          fillColor: fill,
          fillOpacity: 0.16,
        };
      },
    }).addTo(overlayGroup);

    const badge = getSektorMarkerBadge(proposal.sektor);
    const icon = L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div style="width:28px;height:28px;border-radius:9999px;border:2px solid #ffffff;background:${badge.bgHex};color:#ffffff;font-family:monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(15,23,42,0.35);">${badge.code}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([position.lat, position.lng], { icon }).addTo(overlayGroup);
  }, [proposal, resolvedPlaces, position.lat, position.lng]);

  return <div ref={containerRef} className="w-full h-full" />;
};

const KemenpuBrandLockup: React.FC = () => (
  <div className="flex flex-col items-end select-none shrink-0">
    <div className="flex items-center gap-1.5">
      {/* Geometric PU Mark */}
      <div className="w-7 h-7 rounded-[4px] bg-[#f5a800] relative overflow-hidden flex items-end justify-start p-0.5 shrink-0">
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <path d="M2 22V8h7a5 5 0 0 1 0 10H6v4H2Z" fill="#0b3c7c" />
          <path d="M13 11h4v6a3 3 0 0 0 6 0v-6h1v7a5 5 0 0 1-11 0v-7Z" fill="#0b3c7c" />
        </svg>
      </div>
      <div className="font-display text-2xl sm:text-[26px] font-black tracking-tight leading-none">
        <span className="text-[#f5a800]">KEMEN</span>
        <span className="text-[#0b3c7c]">PU</span>
      </div>
    </div>
    <div className="mt-1 text-[8px] sm:text-[8.5px] font-bold tracking-[0.06em] text-[#0b3c7c] uppercase whitespace-nowrap">
      SIGAP MEMBANGUN NEGERI UNTUK RAKYAT
    </div>
  </div>
);

export interface ProposalPreviewModalProps {
  proposal: UsulanProgram | null;
  proposalsList: UsulanProgram[];
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  canEdit: boolean;
  isTemplateDemo?: boolean;
  canManageProposal?: (proposal: UsulanProgram) => boolean;
  onClose: () => void;
  onSelectProposal: (id: string) => void;
  onToggleReadiness: (id: string, key: keyof ReadinessCriteria) => void;
  onUpdateSkorRc: (id: string, skorRc: number) => void;
  onSaveProposal?: (proposal: UsulanProgram) => void;
  onEditProposal: (proposal: UsulanProgram) => void;
  onDeleteProposal: (proposal: UsulanProgram) => void;
  onFocusMainMap?: (id: string) => void;
}

function formatNumberMiliar(val: number): string {
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

export const ProposalPreviewModal: React.FC<ProposalPreviewModalProps> = ({
  proposal,
  proposalsList,
  resolvedPlaces,
  canEdit,
  isTemplateDemo = false,
  canManageProposal,
  onClose,
  onSelectProposal,
  onUpdateSkorRc,
  onSaveProposal,
  onEditProposal,
  onDeleteProposal,
  onFocusMainMap,
}) => {
  const [miniMapType, setMiniMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [locationMediaTab, setLocationMediaTab] = useState<'map' | 'image'>('map');
  const [rcDraft, setRcDraft] = useState<string>('0');
  const [rcTableDraft, setRcTableDraft] = useState<Record<RcDocKey, RcDocumentEntry>>(
    () => resolveProposalTemplateDetails(proposal ?? ({
      id: 'init',
      kodeUsulan: '',
      namaProgram: '',
      sektor: SektorCiptaKarya.AIR_MINUM,
      kabupatenKota: '',
      kecamatanKawasan: '',
      locationQuery: '',
      volumeTarget: 0,
      satuanTarget: '',
      penerimaManfaatJiwa: 0,
      sumberDana: 'APBN Rupiah Murni' as UsulanProgram['sumberDana'],
      skemaKontrak: 'SYC',
      pagu: { y2027: 0, y2028: 0, y2029: 0, y2030: 0 },
      readiness: {
        dokumenPerencanaan: false,
        dedRab: false,
        kesiapanLahan: false,
        dokumenLingkungan: false,
        lembagaPengelola: false,
      },
      statusVerifikasi: 'Menunggu Konreg' as UsulanProgram['statusVerifikasi'],
      prioritasNasional: '',
      serviceRadiusKm: 3.5,
      catatanTeknis: '',
      updatedAt: '2026-11-04',
    })).rcDetails
  );
  const [imageDraftUrl, setImageDraftUrl] = useState<string | undefined>(undefined);
  const [uploadAlert, setUploadAlert] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentRcVal = proposal
    ? getReadinessScore(proposal.readiness, proposal.skorRc).percentage
    : 0;

  useEffect(() => {
    if (!proposal) return;
    const resolved = resolveProposalTemplateDetails(proposal);
    setRcDraft(String(getReadinessScore(proposal.readiness, proposal.skorRc).percentage));
    setRcTableDraft(resolved.rcDetails);
    setImageDraftUrl(resolved.lokasiGambarUrl);
    setLocationMediaTab(resolved.lokasiGambarUrl ? 'image' : 'map');
    setUploadAlert(null);
  }, [proposal?.id, proposal]);

  const currentIndex = useMemo(() => {
    if (!proposal || isTemplateDemo) return -1;
    return proposalsList.findIndex((p) => p.id === proposal.id);
  }, [proposal, proposalsList, isTemplateDemo]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < proposalsList.length - 1;

  useEffect(() => {
    if (!proposal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (
        e.key === 'ArrowLeft' &&
        hasPrev &&
        !(document.activeElement instanceof HTMLInputElement)
      ) {
        onSelectProposal(proposalsList[currentIndex - 1].id);
      } else if (
        e.key === 'ArrowRight' &&
        hasNext &&
        !(document.activeElement instanceof HTMLInputElement)
      ) {
        onSelectProposal(proposalsList[currentIndex + 1].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proposal, hasPrev, hasNext, currentIndex, proposalsList, onClose, onSelectProposal]);

  if (!proposal) return null;

  const details = resolveProposalTemplateDetails(proposal);
  const totalPagu = getTotalPaguUsulan(proposal.pagu);
  const resolvedInfo = resolvedPlaces[proposal.locationQuery];
  const position = proposal.manualPosition ?? resolvedInfo?.position ?? {
    lat: -8.62,
    lng: 117.35,
  };
  const allowManageCurrent =
    !isTemplateDemo &&
    canEdit &&
    !proposal.isLocked &&
    (canManageProposal ? canManageProposal(proposal) : true);

  const buildUpdatedProposalFromPreview = (
    overrideDetails?: Partial<ProposalTemplateDetails>,
    overrideSkorRc?: number
  ): UsulanProgram => {
    const parsedRc = Number(rcDraft);
    const nextSkorRc =
      overrideSkorRc !== undefined
        ? overrideSkorRc
        : rcDraft.trim() !== '' && !Number.isNaN(parsedRc)
          ? Math.min(100, Math.max(0, Number(parsedRc.toFixed(1))))
          : currentRcVal;

    const mergedRcDetails = overrideDetails?.rcDetails ?? rcTableDraft;
    const nextReadiness = deriveReadinessFromRcTable(mergedRcDetails, proposal.readiness);

    const nextTemplateDetails: ProposalTemplateDetails = {
      ...(proposal.templateDetails ?? {}),
      provinsi: details.provinsi,
      latarBelakang: details.latarBelakang,
      dasarPenugasan: details.dasarPenugasan,
      manfaatKegiatan: details.manfaatKegiatan,
      lingkupPekerjaan: details.lingkupPekerjaan,
      biayaFisikMiliar: details.biayaFisikMiliar,
      biayaSupervisiMiliar: details.biayaSupervisiMiliar,
      durasiHari: details.durasiHari,
      durasiBulan: details.durasiBulan,
      waktuMulai: details.waktuMulai,
      waktuSelesai: details.waktuSelesai,
      outputTambahan: details.outputTambahan,
      outcomeTambahan: details.outcomeTambahan,
      deskripsiLokasi: details.deskripsiLokasi,
      lokasiGambarUrl: imageDraftUrl,
      rcDetails: mergedRcDetails,
      ...overrideDetails,
    };

    return {
      ...proposal,
      skorRc: nextSkorRc,
      readiness: nextReadiness,
      templateDetails: nextTemplateDetails,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
  };

  const handleCommitInlinePreviewSave = () => {
    if (!allowManageCurrent || !onSaveProposal) return;
    const updated = buildUpdatedProposalFromPreview();
    onSaveProposal(updated);
  };

  const handleRcCellChange = (
    key: RcDocKey,
    field: 'status' | 'keterangan' | 'customLabel',
    value: string
  ) => {
    setRcTableDraft((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleUploadLocationImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setUploadAlert(null);
      const dataUrl = await compressUploadedImageFile(file);
      setImageDraftUrl(dataUrl);
      setLocationMediaTab('image');
      if (allowManageCurrent && onSaveProposal) {
        onSaveProposal(buildUpdatedProposalFromPreview({ lokasiGambarUrl: dataUrl }));
      }
    } catch (err) {
      setUploadAlert(err instanceof Error ? err.message : 'Gagal mengunggah gambar lokasi.');
    }
  };

  const handleDownloadSlideHtml = () => {
    const rcRowsHtml = KEMENPU_RC_ROWS.map((row) => {
      const entry = rcTableDraft[row.key] ?? { status: '', keterangan: '' };
      const docName =
        row.key === 'lainnya' && entry.customLabel?.trim()
          ? entry.customLabel
          : row.defaultLabel;
      return `<tr>
        <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">${docName}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;text-align:center;font-weight:600;">${entry.status || '-'}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #cbd5e1;">${entry.keterangan || '-'}</td>
      </tr>`;
    }).join('');

    const lingkupHtml = details.lingkupPekerjaan
      .map((item) => `<li style="margin-bottom:4px;">&#9744; ${item}</li>`)
      .join('');

    const htmlDoc = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Paparan Usulan ${proposal.kodeUsulan} - KEMENPU</title>
<style>
  body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background:#f8fafc; color:#1e293b; margin:0; padding:24px; }
  .slide { max-width:1240px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:28px 32px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
  .title-wrap { display:flex; align-items:stretch; gap:14px; }
  .bars { display:flex; width:14px; flex-shrink:0; }
  .bar-blue { width:7px; background:#0b3c7c; }
  .bar-gold { width:7px; background:#f5a800; }
  h1 { margin:0; font-size:24px; font-weight:800; text-transform:uppercase; color:#1e293b; }
  .subtitle { margin-top:4px; font-size:15px; color:#5b7fa6; text-transform:uppercase; font-weight:500; }
  .brand { text-align:right; }
  .brand-name { font-size:26px; font-weight:900; letter-spacing:-0.02em; }
  .brand-tag { font-size:8.5px; font-weight:700; color:#0b3c7c; letter-spacing:0.06em; }
  .row3 { display:grid; grid-template-columns: 5fr 4fr 3fr; gap:14px; margin-bottom:14px; }
  .row2 { display:grid; grid-template-columns: 1fr 1fr; gap:14px; margin-bottom:14px; }
  .row-bottom { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
  .card { border:1px solid #cbd5e1; border-radius:14px; padding:14px 16px; }
  .card-title { font-size:15px; font-weight:700; color:#1e293b; padding-bottom:8px; margin-bottom:10px; border-bottom:1px solid #e2e8f0; }
  ul { margin:6px 0 0; padding-left:18px; font-size:12.5px; line-height:1.55; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { padding:7px 10px; border-bottom:1px solid #94a3b8; text-align:center; font-weight:700; }
</style>
</head>
<body>
  <div class="slide">
    <div class="header">
      <div class="title-wrap">
        <div class="bars"><div class="bar-blue"></div><div class="bar-gold"></div></div>
        <div>
          <h1>${proposal.namaProgram}</h1>
          <div class="subtitle">${proposal.kabupatenKota} , ${details.provinsi}</div>
        </div>
      </div>
      <div class="brand">
        <div class="brand-name"><span style="color:#f5a800;">KEMEN</span><span style="color:#0b3c7c;">PU</span></div>
        <div class="brand-tag">SIGAP MEMBANGUN NEGERI UNTUK RAKYAT</div>
      </div>
    </div>
    <div class="row3">
      <div class="card">
        <div class="card-title">Gambaran Umum</div>
        <div style="font-size:12.5px;line-height:1.55;">
          <ul>
            <li><strong>Latar belakang:</strong> ${details.latarBelakang}</li>
            <li><strong>Dasar penugasan:</strong> ${details.dasarPenugasan}</li>
          </ul>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Urgensi Strategis</div>
        <ul>
          <li>${proposal.prioritasNasional}</li>
          <li>${details.manfaatKegiatan}</li>
        </ul>
      </div>
      <div class="card">
        <div class="card-title">Lingkup Pekerjaan</div>
        <ul style="list-style:none;padding-left:0;">${lingkupHtml}</ul>
      </div>
    </div>
    <div class="row2">
      <div class="card">
        <div class="card-title">Kebutuhan Anggaran</div>
        <div style="font-size:12.5px;line-height:1.6;">
          <div>Estimasi total kebutuhan anggaran sebesar <strong>Rp ${formatNumberMiliar(totalPagu)} Miliar</strong></div>
          <div>&#10070; Fisik Rp ${formatNumberMiliar(details.biayaFisikMiliar)} Miliar</div>
          <div>&#10070; Manajemen Konstruksi/Supervisi Rp ${formatNumberMiliar(details.biayaSupervisiMiliar)} Miliar</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Output &amp; Outcome</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px;line-height:1.6;">
          <div>
            <strong>Output</strong>
            ${details.outputTambahan ? `<div>&#10070; ${details.outputTambahan}</div>` : '<div>&#10070; —</div>'}
          </div>
          <div>
            <strong>Outcome</strong>
            <div>&#10070; ${proposal.penerimaManfaatJiwa.toLocaleString('id-ID')} jiwa</div>
            ${details.outcomeTambahan ? `<div>&#10070; ${details.outcomeTambahan}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="row-bottom">
      <div class="card">
        <div class="card-title">Gambaran Lokasi Kegiatan</div>
        ${
          imageDraftUrl
            ? `<img src="${imageDraftUrl}" alt="Gambaran Lokasi" style="width:100%;height:240px;object-fit:contain;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:8px;" />`
            : `<div style="padding:18px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin-bottom:8px;font-size:12px;">Koordinat Lokasi: <strong>${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}</strong> (${proposal.kecamatanKawasan}, ${proposal.kabupatenKota})</div>`
        }
        <div style="font-size:12px;line-height:1.5;">&#10070; ${details.deskripsiLokasi}</div>
      </div>
      <div class="card">
        <div class="card-title">Status <em>Readiness Criteria</em> (RC) — Skor: ${rcDraft}%</div>
        <table>
          <thead>
            <tr>
              <th style="border-right:1px solid #cbd5e1;">Dokumen</th>
              <th style="border-right:1px solid #cbd5e1;">Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>${rcRowsHtml}</tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Paparan-Usulan-${proposal.kodeUsulan}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-[2px] p-2 sm:p-5 overflow-y-auto print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-[1320px] max-h-[95vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-0">
        {/* Top Utility & Action Bar (Hidden on Print) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            {!isTemplateDemo && proposalsList.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onSelectProposal(proposalsList[currentIndex - 1].id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="font-mono text-xs text-slate-300 px-1 tabular-nums">
                  {currentIndex + 1} / {proposalsList.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onSelectProposal(proposalsList[currentIndex + 1].id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <span className="text-xs text-slate-300 font-mono">
              {isTemplateDemo
                ? 'Contoh Tampilan Template Preview Usulan KEMENPU'
                : `${proposal.kodeUsulan} · ${formatActiveYears(proposal.pagu)}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleUploadLocationImage(e)}
              className="hidden"
            />

            {allowManageCurrent && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer whitespace-nowrap"
                title="Unggah gambar skema jaringan atau peta lokasi untuk kartu Gambaran Lokasi Kegiatan"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Unggah Gambar Lokasi</span>
              </button>
            )}

            {!isTemplateDemo && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadSlideHtml}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh HTML</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cetak / PDF</span>
                </button>
              </>
            )}

            {allowManageCurrent && (
              <>
                {onSaveProposal && (
                  <button
                    type="button"
                    onClick={handleCommitInlinePreviewSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProposal(proposal);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Formulir</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDeleteProposal(proposal);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-600/90 hover:bg-red-600 text-white cursor-pointer"
                  title="Hapus usulan ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {uploadAlert && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-xs text-red-800 print:hidden">
            {uploadAlert}
          </div>
        )}

        {/* KEMENPU Executive Slide Canvas (Matches Poster_f7f60e1e.png Template) */}
        <div className="flex-1 overflow-y-auto bg-white p-5 sm:p-8 space-y-4">
          {/* SLIDE HEADER: Left Navy/Gold Bar + Uppercase Title & Subtitle | Right KEMENPU Lockup */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-1">
            <div className="flex items-stretch gap-3.5 min-w-0">
              <div className="flex shrink-0 select-none" aria-hidden="true">
                <div className="w-2 bg-[#0b3c7c]" />
                <div className="w-2.5 bg-[#f5a800]" />
              </div>
              <div className="min-w-0 py-0.5">
                <h1
                  id="preview-modal-title"
                  className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 uppercase leading-snug"
                >
                  {proposal.namaProgram}
                </h1>
                <div className="mt-0.5 text-sm sm:text-base font-medium text-[#5b7fa6] uppercase tracking-wide">
                  {proposal.kabupatenKota} , {details.provinsi}
                </div>
              </div>
            </div>

            <KemenpuBrandLockup />
          </div>

          {/* ROW 1: Gambaran Umum (5) | Urgensi Strategis (4) | Lingkup Pekerjaan (3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Card 1: Gambaran Umum */}
            <div className="lg:col-span-5 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
                <Target className="w-5 h-5 text-[#0284c7] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">Gambaran Umum</h2>
              </div>
              <div className="text-xs text-slate-700 leading-relaxed space-y-2">
                <p className="text-slate-600">Informasi umum pelaksanaan kegiatan:</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    <span className="font-semibold text-slate-800">Latar belakang: </span>
                    <span>{details.latarBelakang}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">Dasar penugasan: </span>
                    <span>{details.dasarPenugasan}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Urgensi Strategis */}
            <div className="lg:col-span-4 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
                <AlertTriangle className="w-5 h-5 text-[#0284c7] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Urgensi Strategis
                </h2>
              </div>
              <ul className="list-disc pl-4 space-y-2 text-xs text-slate-700 leading-relaxed">
                <li>
                  <span className="font-semibold text-slate-800">
                    Dukungan PN / PKPN / Prioritas:{' '}
                  </span>
                  <span>{proposal.prioritasNasional}</span>
                </li>
                <li>
                  <span className="font-semibold text-slate-800">Manfaat kegiatan: </span>
                  <span>{details.manfaatKegiatan}</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Lingkup Pekerjaan */}
            <div className="lg:col-span-3 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
                <ListChecks className="w-5 h-5 text-[#0284c7] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Lingkup Pekerjaan
                </h2>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {details.lingkupPekerjaan.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Square className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ROW 2: Kebutuhan Anggaran (6) | Output & Outcome (6) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Card 4: Kebutuhan Anggaran */}
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
                <Wallet className="w-5 h-5 text-[#0284c7] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Kebutuhan Anggaran
                </h2>
              </div>
              <div className="text-xs text-slate-700 leading-relaxed space-y-1.5">
                <p>
                  Estimasi total kebutuhan anggaran sebesar{' '}
                  <strong className="font-mono text-slate-900">
                    Rp {formatNumberMiliar(totalPagu)} Miliar
                  </strong>{' '}
                  <span className="text-slate-500">
                    ({proposal.sumberDana} · {formatActiveYears(proposal.pagu)})
                  </span>
                </p>
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-700 select-none" aria-hidden="true">
                      ❖
                    </span>
                    <span>
                      Fisik Rp{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumberMiliar(details.biayaFisikMiliar)}
                      </strong>{' '}
                      Miliar
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-700 select-none" aria-hidden="true">
                      ❖
                    </span>
                    <span>
                      Manajemen Konstruksi/Supervisi Rp{' '}
                      <strong className="font-mono text-slate-900">
                        {formatNumberMiliar(details.biayaSupervisiMiliar)}
                      </strong>{' '}
                      Miliar
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Output & Outcome */}
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
                <PieChart className="w-5 h-5 text-[#0284c7] shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Output &amp; Outcome
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900">Output</div>
                  {details.outputTambahan ? (
                    <div className="flex items-start gap-1.5">
                      <span aria-hidden="true">❖</span>
                      <span>{details.outputTambahan}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <span aria-hidden="true">❖</span>
                      <span>—</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-slate-900">Outcome</div>
                  <div className="flex items-start gap-1.5">
                    <span aria-hidden="true">❖</span>
                    <span>
                      <strong className="font-mono text-slate-900">
                        {proposal.penerimaManfaatJiwa.toLocaleString('id-ID')}
                      </strong>{' '}
                      jiwa
                    </span>
                  </div>
                  {details.outcomeTambahan && (
                    <div className="flex items-start gap-1.5">
                      <span aria-hidden="true">❖</span>
                      <span>{details.outcomeTambahan}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: Gambaran Lokasi Kegiatan (6) | Status Readiness Criteria (RC) (6) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Card 7: Gambaran Lokasi Kegiatan */}
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#0284c7] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-800">
                      Gambaran Lokasi Kegiatan
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 print:hidden">
                    {imageDraftUrl && (
                      <div className="inline-flex bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setLocationMediaTab('image')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            locationMediaTab === 'image'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Gambar
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationMediaTab('map')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            locationMediaTab === 'map'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Peta GIS
                        </button>
                      </div>
                    )}

                    {locationMediaTab === 'map' && (
                      <div className="inline-flex bg-slate-100 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setMiniMapType('roadmap')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            miniMapType === 'roadmap'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Peta
                        </button>
                        <button
                          type="button"
                          onClick={() => setMiniMapType('hybrid')}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md cursor-pointer ${
                            miniMapType === 'hybrid'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Satelit
                        </button>
                      </div>
                    )}

                    {!isTemplateDemo && onFocusMainMap && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onFocusMainMap(proposal.id);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#0284c7] hover:bg-sky-50 rounded-md cursor-pointer"
                        title="Fokuskan lokasi pada Peta Utama"
                      >
                        <LocateFixed className="w-3 h-3" />
                        <span>Peta Utama</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Map or Uploaded Schematic Frame */}
                <div className="h-[285px] w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100 relative">
                  {imageDraftUrl && locationMediaTab === 'image' ? (
                    <img
                      src={imageDraftUrl}
                      alt={`Gambaran Lokasi ${proposal.namaProgram}`}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <PreviewMiniMap
                      proposal={proposal}
                      resolvedPlaces={resolvedPlaces}
                      position={position}
                      miniMapType={miniMapType}
                    />
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                <span className="shrink-0 select-none" aria-hidden="true">
                  ❖
                </span>
                <span>{details.deskripsiLokasi}</span>
              </div>
            </div>

            {/* Card 8: Status Readiness Criteria (RC) */}
            <div className="lg:col-span-6 bg-white border border-slate-300 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-[#0284c7] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-slate-800">
                      Status <span className="italic">Readiness Criteria</span> (RC)
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-600">Skor RC:</span>
                    {allowManageCurrent ? (
                      <div className="flex items-center bg-slate-50 border border-slate-300 rounded-md px-2 py-0.5 w-20 focus-within:border-blue-700 focus-within:bg-white">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          aria-label="Skor RC Manual (%)"
                          value={rcDraft}
                          onChange={(e) => setRcDraft(e.target.value)}
                          onBlur={() => {
                            const num = Number(rcDraft);
                            if (!Number.isNaN(num) && rcDraft.trim() !== '') {
                              const clamped = Math.min(100, Math.max(0, Number(num.toFixed(1))));
                              setRcDraft(String(clamped));
                              onUpdateSkorRc(proposal.id, clamped);
                            }
                          }}
                          className="w-full text-xs font-mono font-bold tabular-nums text-right text-slate-900 bg-transparent focus:outline-none"
                        />
                        <span className="text-[11px] font-mono text-slate-500 ml-0.5">%</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-bold tabular-nums text-slate-900">
                        {rcDraft}%
                      </span>
                    )}
                  </div>
                </div>

                {/* 3-Column KEMENPU RC Table: Dokumen | Status | Keterangan */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-800">
                        <th className="py-2 px-2.5 text-center font-bold border-r border-slate-300 w-[38%]">
                          Dokumen
                        </th>
                        <th className="py-2 px-2.5 text-center font-bold border-r border-slate-300 w-[24%]">
                          Status
                        </th>
                        <th className="py-2 px-2.5 text-center font-bold w-[38%]">
                          Keterangan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-slate-700">
                      {KEMENPU_RC_ROWS.map((row) => {
                        const entry = rcTableDraft[row.key] ?? {
                          status: '',
                          keterangan: '',
                        };
                        return (
                          <tr key={row.key} className="hover:bg-slate-50/60">
                            <td className="py-2 px-2.5 border-r border-slate-300 align-middle">
                              {row.key === 'lainnya' && allowManageCurrent ? (
                                <input
                                  type="text"
                                  value={entry.customLabel ?? row.defaultLabel}
                                  onChange={(e) =>
                                    handleRcCellChange('lainnya', 'customLabel', e.target.value)
                                  }
                                  placeholder="Lainnya (silakan tambahkan)"
                                  className="w-full bg-transparent text-xs text-slate-800 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 rounded px-1 py-0.5"
                                />
                              ) : (
                                <span>{entry.customLabel || row.defaultLabel}</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-300 align-middle text-center">
                              {allowManageCurrent ? (
                                <input
                                  type="text"
                                  value={entry.status}
                                  onChange={(e) =>
                                    handleRcCellChange(row.key, 'status', e.target.value)
                                  }
                                  placeholder="Lengkap / Proses / -"
                                  className="w-full bg-transparent text-center text-xs font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 rounded px-1 py-0.5"
                                />
                              ) : (
                                <span className="font-medium text-slate-900">
                                  {entry.status || ''}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 align-middle">
                              {allowManageCurrent ? (
                                <input
                                  type="text"
                                  value={entry.keterangan}
                                  onChange={(e) =>
                                    handleRcCellChange(row.key, 'keterangan', e.target.value)
                                  }
                                  placeholder="Isi keterangan..."
                                  className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 rounded px-1 py-0.5"
                                />
                              ) : (
                                <span>{entry.keterangan || ''}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {allowManageCurrent && onSaveProposal && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
                  <span className="text-[11px] text-slate-500">
                    Kolom Status dan Keterangan RC di atas dapat langsung diketik dan disimpan.
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitInlinePreviewSave}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Tabel RC</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
