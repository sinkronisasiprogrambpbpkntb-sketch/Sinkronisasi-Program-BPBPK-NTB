import { jsPDF } from 'jspdf';
import {
  formatActiveYears,
  getRcChecklistFlags,
  KEMENPU_RC_ROWS,
} from '../data/initialProposals';
import {
  CustomRcDocumentEntry,
  LatLngPoint,
  ProposalTemplateDetails,
  RcDocKey,
  RcDocumentEntry,
  ReadinessCriteria,
  UsulanProgram,
} from '../types/ciptaKarya';
import { PdfSignatoriesConfig, PdfSignatoryParty } from './exportRcInfographicPdf';
import {
  getCachedPuBatikAssets,
  getCachedPuWordmarkDataUrl,
  PuBatikPdfAssets,
} from './puLogoAsset';

export interface ProposalProfilePdfInput {
  proposal: UsulanProgram;
  details: ProposalTemplateDetails;
  totalPagu: number;
  rcPercentage: number;
  rcTable: Record<RcDocKey, RcDocumentEntry>;
  customRcItems?: CustomRcDocumentEntry[];
  includeDetailRc?: boolean;
  position: LatLngPoint;
  imageDataUrl?: string;
  signatories?: PdfSignatoriesConfig;
  wordmarkDataUrl?: string | null;
  batikAssets?: PuBatikPdfAssets | null;
}

export interface ProposalProfilePdfPreviewPayload {
  blobUrl: string;
  fileName: string;
  pageCount: number;
}

type RgbTuple = [number, number, number];

const PU_NAVY: RgbTuple = [6, 20, 89];
const PU_GOLD: RgbTuple = [232, 150, 17];
const PU_GOLD_LIGHT: RgbTuple = [253, 230, 138];
const PU_BORDER: RgbTuple = [199, 211, 232];
const PU_TINT: RgbTuple = [238, 242, 250];
const NAVY_DARK: RgbTuple = [11, 60, 124];
const GOLD_ACCENT: RgbTuple = [245, 168, 0];
const SLATE_900: RgbTuple = [15, 23, 42];
const SLATE_800: RgbTuple = [30, 41, 59];
const SLATE_700: RgbTuple = [51, 65, 85];
const SLATE_500: RgbTuple = [100, 116, 139];
const SLATE_400: RgbTuple = [148, 163, 184];
const SLATE_300: RgbTuple = [203, 213, 225];
const SLATE_200: RgbTuple = [226, 232, 240];
const SLATE_100: RgbTuple = [241, 245, 249];
const WHITE: RgbTuple = [255, 255, 255];
const STEEL_SUBTITLE: RgbTuple = [71, 102, 145];
const EMERALD_700: RgbTuple = [15, 118, 110];
const AMBER_700: RgbTuple = [180, 83, 9];
const BLUE_700: RgbTuple = [29, 78, 216];

function sanitizePdfText(value: string): string {
  return String(value ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2192/g, '->')
    .replace(/\u00b7/g, '|')
    .replace(/\u2022/g, '-')
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatNumberMiliar(val: number): string {
  return val.toLocaleString('id-ID', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

function truncateLine(doc: jsPDF, text: string, maxWidth: number): string {
  const clean = sanitizePdfText(text);
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 3 && doc.getTextWidth(`${cut}...`) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}...`;
}

function drawCardFrame(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  rightBadge?: string
) {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...PU_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Deep Batik PU Navy header band + Gold accent strip
  doc.setFillColor(...PU_NAVY);
  doc.rect(x + 0.15, y + 0.15, w - 0.3, 7.6, 'F');
  doc.setFillColor(...PU_GOLD);
  doc.rect(x + 0.15, y + 7.45, w - 0.3, 0.55, 'F');

  // Gold accent dot + crisp white card title
  doc.setFillColor(...PU_GOLD);
  doc.circle(x + 3.8, y + 4.1, 1.05, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(sanitizePdfText(title), x + 6.4, y + 5.1);

  if (rightBadge) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...PU_GOLD_LIGHT);
    doc.text(sanitizePdfText(rightBadge), x + w - 3.5, y + 5.1, { align: 'right' });
  }
}

const CORE_READINESS_PDF_META: Array<{
  key: keyof ReadinessCriteria;
  label: string;
  desc: string;
}> = [
  {
    key: 'dokumenPerencanaan',
    label: 'Dokumen Perencanaan',
    desc: 'RISPAM / RIPS / RISPAL / RIPKS / Masterplan',
  },
  {
    key: 'dedRab',
    label: 'DED & RAB',
    desc: 'FS, Detailed Engineering Design & RAB',
  },
  {
    key: 'kesiapanLahan',
    label: 'Kesiapan Lahan',
    desc: 'Sertifikat / Status Lahan Clean & Clear',
  },
  {
    key: 'dokumenLingkungan',
    label: 'Dokumen Lingkungan',
    desc: 'AMDAL / UKL-UPL / SPPL',
  },
  {
    key: 'lembagaPengelola',
    label: 'Lembaga Pengelola',
    desc: 'Surat Minat & Komitmen Pemda / UPTD / BUMD',
  },
];

function getRcDetailStatusPdfStyle(flags: {
  ada: boolean;
  kurang: boolean;
  sesuai: boolean;
}): {
  label: string;
  fill: RgbTuple;
  border: RgbTuple;
  text: RgbTuple;
} {
  if (flags.sesuai && !flags.kurang) {
    return {
      label: 'Sesuai & Lengkap',
      fill: [236, 253, 245],
      border: [167, 243, 208],
      text: [6, 95, 70],
    };
  }
  if (flags.ada && flags.kurang) {
    return {
      label: 'Ada | Perlu Dilengkapi',
      fill: [255, 251, 235],
      border: [253, 230, 138],
      text: [146, 64, 14],
    };
  }
  if (flags.kurang) {
    return {
      label: 'Kurang / Revisi',
      fill: [255, 251, 235],
      border: [253, 230, 138],
      text: [146, 64, 14],
    };
  }
  if (flags.ada) {
    return {
      label: 'Ada (Dalam Reviu)',
      fill: [239, 246, 255],
      border: [191, 219, 254],
      text: [30, 64, 175],
    };
  }
  return {
    label: 'Belum Tersedia',
    fill: [241, 245, 249],
    border: [203, 213, 225],
    text: [71, 85, 105],
  };
}

function drawBatikPageChrome(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  batikAssets: PuBatikPdfAssets | null | undefined
) {
  if (batikAssets?.watermarkDataUrl?.startsWith('data:image/')) {
    try {
      doc.addImage(
        batikAssets.watermarkDataUrl,
        'JPEG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );
    } catch {
      // plain paper fallback
    }
  }

  if (batikAssets?.stripDataUrl?.startsWith('data:image/')) {
    try {
      doc.addImage(batikAssets.stripDataUrl, 'JPEG', 0, 0, pageWidth, 2.8, undefined, 'FAST');
    } catch {
      doc.setFillColor(...PU_NAVY);
      doc.rect(0, 0, pageWidth, 2.8, 'F');
    }
  } else {
    doc.setFillColor(...PU_NAVY);
    doc.rect(0, 0, pageWidth, 2.8, 'F');
  }
  doc.setFillColor(...PU_GOLD);
  doc.rect(0, 2.8, pageWidth, 0.55, 'F');

  doc.setFillColor(...PU_GOLD);
  doc.rect(0, pageHeight - 2.65, pageWidth, 0.45, 'F');
  if (batikAssets?.stripDataUrl?.startsWith('data:image/')) {
    try {
      doc.addImage(
        batikAssets.stripDataUrl,
        'JPEG',
        0,
        pageHeight - 2.2,
        pageWidth,
        2.2,
        undefined,
        'FAST'
      );
    } catch {
      doc.setFillColor(...PU_NAVY);
      doc.rect(0, pageHeight - 2.2, pageWidth, 2.2, 'F');
    }
  } else {
    doc.setFillColor(...PU_NAVY);
    doc.rect(0, pageHeight - 2.2, pageWidth, 2.2, 'F');
  }
}

function drawSignatureBlock(
  doc: jsPDF,
  marginX: number,
  sigY: number,
  contentWidth: number,
  sigH: number,
  signatories?: PdfSignatoriesConfig
) {
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...PU_BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, sigY, contentWidth, sigH, 2, 2, 'FD');
  doc.setFillColor(...PU_NAVY);
  doc.rect(marginX + 1, sigY, contentWidth - 2, 1.1, 'F');
  doc.setFillColor(...PU_GOLD);
  doc.rect(marginX + 1, sigY, 32, 1.1, 'F');

  const sigConfig: PdfSignatoriesConfig = signatories ?? {
    tempatTanggal: '',
    mengesahkan: { jabatan: '', nama: '' },
    mengesahkan3: { jabatan: '', nama: '' },
    menyetujui: { jabatan: '', nama: '' },
  };

  const sigColMaxW = contentWidth * 0.28;
  const nameY = sigY + sigH - 4.0;

  const drawSignatorySide = (
    centerX: number,
    headingLabel: string,
    topMeta: string,
    party: PdfSignatoryParty
  ) => {
    const cleanTop = sanitizePdfText(topMeta);
    if (cleanTop) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(...SLATE_700);
      doc.text(truncateLine(doc, cleanTop, sigColMaxW), centerX, sigY + 4.2, {
        align: 'center',
      });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...SLATE_900);
    doc.text(headingLabel, centerX, sigY + 8.0, { align: 'center' });

    const cleanJabatan = sanitizePdfText(party.jabatan);
    if (cleanJabatan) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...SLATE_700);
      const jabLines = doc.splitTextToSize(cleanJabatan, sigColMaxW).slice(0, 2) as string[];
      jabLines.forEach((line, lIdx) => {
        doc.text(line, centerX, sigY + 11.6 + lIdx * 3.1, { align: 'center' });
      });
    }

    const cleanNama = sanitizePdfText(party.nama);
    if (cleanNama) {
      const displayNama = truncateLine(doc, cleanNama, sigColMaxW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(...SLATE_900);
      doc.text(displayNama, centerX, nameY, { align: 'center' });

      const namaWidth = doc.getTextWidth(displayNama);
      doc.setDrawColor(...SLATE_900);
      doc.setLineWidth(0.25);
      doc.line(centerX - namaWidth / 2, nameY + 0.9, centerX + namaWidth / 2, nameY + 0.9);
      doc.setLineWidth(0.2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...SLATE_400);
      doc.text('( .............................. )', centerX, nameY, {
        align: 'center',
      });
    }
  };

  drawSignatorySide(
    marginX + contentWidth * 0.17,
    'Mengesahkan,',
    '',
    sigConfig.mengesahkan
  );
  drawSignatorySide(
    marginX + contentWidth * 0.5,
    'Mengesahkan,',
    '',
    sigConfig.mengesahkan3 ?? { jabatan: '', nama: '' }
  );
  drawSignatorySide(
    marginX + contentWidth * 0.83,
    'Menyetujui,',
    sigConfig.tempatTanggal,
    sigConfig.menyetujui
  );
}

function buildProposalProfilePdfDoc(input: ProposalProfilePdfInput): {
  doc: jsPDF;
  fileName: string;
} {
  const {
    proposal,
    details,
    totalPagu,
    rcPercentage,
    rcTable,
    position,
    imageDataUrl,
    signatories,
  } = input;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const marginX = 11;
  const contentWidth = pageWidth - marginX * 2; // 275
  const batikAssets = input.batikAssets ?? getCachedPuBatikAssets();

  // Subtle A4 Batik PU Paper Watermark + Top & Bottom Ornamental Ribbons
  drawBatikPageChrome(doc, pageWidth, pageHeight, batikAssets);

  // HEADER (framed on clean white surface so PU wordmark stays razor-sharp)
  const headerY = 5.4;
  const headerH = 15.2;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...PU_BORDER);
  doc.setLineWidth(0.28);
  doc.roundedRect(marginX, headerY, contentWidth, headerH, 2, 2, 'FD');

  doc.setFillColor(...PU_NAVY);
  doc.rect(marginX + 1.8, headerY + 1.6, 2.2, headerH - 3.2, 'F');
  doc.setFillColor(...GOLD_ACCENT);
  doc.rect(marginX + 4.0, headerY + 1.6, 2.2, headerH - 3.2, 'F');

  const titleMaxW = contentWidth - 62;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.0);
  doc.setTextColor(...PU_NAVY);
  const titleLines = doc
    .splitTextToSize(sanitizePdfText(proposal.namaProgram).toUpperCase(), titleMaxW)
    .slice(0, 2) as string[];
  titleLines.forEach((line, idx) => {
    doc.text(line, marginX + 8.5, headerY + 5.2 + idx * 4.2);
  });

  const subY = headerY + (titleLines.length > 1 ? 13.0 : 9.8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...STEEL_SUBTITLE);
  doc.text(
    truncateLine(
      doc,
      `${proposal.kabupatenKota} | ${details.provinsi ?? 'Nusa Tenggara Barat'} (${proposal.kodeUsulan} | ${formatActiveYears(proposal.pagu)})`,
      titleMaxW
    ),
    marginX + 8.5,
    subY
  );

  // Right Official Kementerian Pekerjaan Umum Logo
  const wordmarkDataUrl = input.wordmarkDataUrl ?? getCachedPuWordmarkDataUrl();
  if (wordmarkDataUrl && wordmarkDataUrl.startsWith('data:image/')) {
    try {
      const logoH = 11.2;
      const logoW = logoH * (262 / 64);
      const logoX = pageWidth - marginX - logoW - 3;
      const logoY = headerY + 2.0;
      doc.addImage(wordmarkDataUrl, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
    } catch {
      // Fallback if canvas image load failed
    }
  }

  // ROW 1: Gambaran Umum (41%) | Urgensi Strategis (33%) | Lingkup Pekerjaan (26%)
  const gap = 3.5;
  const row1Y = 23;
  const row1H = 36;
  const r1W1 = contentWidth * 0.41;
  const r1W2 = contentWidth * 0.33;
  const r1W3 = contentWidth - r1W1 - r1W2 - gap * 2;

  const r1X1 = marginX;
  const r1X2 = r1X1 + r1W1 + gap;
  const r1X3 = r1X2 + r1W2 + gap;

  drawCardFrame(doc, r1X1, row1Y, r1W1, row1H, 'Gambaran Umum');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(...SLATE_700);
  let y1 = row1Y + 12.2;
  const latarLines = doc
    .splitTextToSize(sanitizePdfText(`- Latar belakang: ${details.latarBelakang ?? '-'}`), r1W1 - 7)
    .slice(0, 3) as string[];
  latarLines.forEach((line) => {
    doc.text(line, r1X1 + 3.5, y1);
    y1 += 3.2;
  });
  y1 += 0.9;
  const dasarLines = doc
    .splitTextToSize(sanitizePdfText(`- Dasar penugasan: ${details.dasarPenugasan ?? '-'}`), r1W1 - 7)
    .slice(0, 3) as string[];
  dasarLines.forEach((line) => {
    if (y1 <= row1Y + row1H - 2.0) {
      doc.text(line, r1X1 + 3.5, y1);
      y1 += 3.2;
    }
  });

  drawCardFrame(doc, r1X2, row1Y, r1W2, row1H, 'Urgensi Strategis');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(...SLATE_700);
  let y2 = row1Y + 12.2;
  const pnLines = doc
    .splitTextToSize(sanitizePdfText(`- Dukungan Prioritas: ${proposal.prioritasNasional}`), r1W2 - 7)
    .slice(0, 2) as string[];
  pnLines.forEach((line) => {
    doc.text(line, r1X2 + 3.5, y2);
    y2 += 3.2;
  });
  y2 += 0.9;
  const manfaatLines = doc
    .splitTextToSize(sanitizePdfText(`- Manfaat kegiatan: ${details.manfaatKegiatan ?? '-'}`), r1W2 - 7)
    .slice(0, 4) as string[];
  manfaatLines.forEach((line) => {
    if (y2 <= row1Y + row1H - 2.0) {
      doc.text(line, r1X2 + 3.5, y2);
      y2 += 3.2;
    }
  });

  drawCardFrame(doc, r1X3, row1Y, r1W3, row1H, 'Lingkup Pekerjaan');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(...SLATE_700);
  let y3 = row1Y + 12.2;
  (details.lingkupPekerjaan ?? []).slice(0, 5).forEach((item) => {
    const wrapped = doc
      .splitTextToSize(sanitizePdfText(`[ ] ${item}`), r1W3 - 7)
      .slice(0, 2) as string[];
    wrapped.forEach((line) => {
      if (y3 <= row1Y + row1H - 2.0) {
        doc.text(line, r1X3 + 3.5, y3);
        y3 += 3.1;
      }
    });
    y3 += 0.6;
  });

  // ROW 2: Kebutuhan Anggaran (50%) | Output & Outcome (50%)
  const row2Y = row1Y + row1H + 2.5;
  const row2H = 24;
  const r2W = (contentWidth - gap) / 2;
  const r2X1 = marginX;
  const r2X2 = marginX + r2W + gap;

  drawCardFrame(doc, r2X1, row2Y, r2W, row2H, 'Kebutuhan Anggaran');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...SLATE_900);
  doc.text(
    truncateLine(
      doc,
      `Estimasi total: Rp ${formatNumberMiliar(totalPagu)} Miliar (${proposal.sumberDana} | ${formatActiveYears(proposal.pagu)})`,
      r2W - 7
    ),
    r2X1 + 3.5,
    row2Y + 12.2
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(...SLATE_700);
  doc.text(
    `> Fisik: Rp ${formatNumberMiliar(details.biayaFisikMiliar ?? 0)} Miliar`,
    r2X1 + 3.5,
    row2Y + 16.8
  );
  doc.text(
    `> Manajemen Konstruksi / Supervisi: Rp ${formatNumberMiliar(details.biayaSupervisiMiliar ?? 0)} Miliar`,
    r2X1 + 3.5,
    row2Y + 21.0
  );

  drawCardFrame(doc, r2X2, row2Y, r2W, row2H, 'Output & Outcome');
  const ooColW = (r2W - 10) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE_900);
  doc.text('Output', r2X2 + 3.5, row2Y + 12.0);
  doc.text('Outcome', r2X2 + 3.5 + ooColW + 3, row2Y + 12.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_700);
  const outLines = doc
    .splitTextToSize(sanitizePdfText(details.outputTambahan || '-'), ooColW)
    .slice(0, 3) as string[];
  outLines.forEach((line, idx) => {
    doc.text(line, r2X2 + 3.5, row2Y + 15.6 + idx * 3.1);
  });
  const outcomeLines = doc
    .splitTextToSize(sanitizePdfText(details.outcomeTambahan || '-'), ooColW)
    .slice(0, 3) as string[];
  outcomeLines.forEach((line, idx) => {
    doc.text(line, r2X2 + 3.5 + ooColW + 3, row2Y + 15.6 + idx * 3.1);
  });

  const shouldIncludeDetailRc = input.includeDetailRc !== false;

  // ROW 3: Gambaran Lokasi Kegiatan (47%) | Status Readiness Criteria (RC) (53%)
  const row3Y = row2Y + row2H + 2.5;
  const row3H = shouldIncludeDetailRc ? 108 : 71;
  const r3W1 = contentWidth * 0.47;
  const r3W2 = contentWidth - r3W1 - gap;
  const r3X1 = marginX;
  const r3X2 = r3X1 + r3W1 + gap;

  drawCardFrame(doc, r3X1, row3Y, r3W1, row3H, 'Gambaran Lokasi Kegiatan');
  const locBoxX = r3X1 + 3.5;
  const locBoxY = row3Y + 10.5;
  const locBoxW = r3W1 - 7;
  const locBoxH = shouldIncludeDetailRc ? 78 : 44.5;

  doc.setFillColor(...SLATE_100);
  doc.setDrawColor(...SLATE_200);
  doc.roundedRect(locBoxX, locBoxY, locBoxW, locBoxH, 1.5, 1.5, 'FD');

  let imageRendered = false;
  if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
    try {
      const format = imageDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(
        imageDataUrl,
        format,
        locBoxX + 1.5,
        locBoxY + 1.5,
        locBoxW - 3,
        locBoxH - 3,
        undefined,
        'FAST'
      );
      imageRendered = true;
    } catch {
      imageRendered = false;
    }
  }

  if (!imageRendered) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(...NAVY_DARK);
    doc.text('Titik Koordinat & Lokasi Spasial Usulan', locBoxX + 4, locBoxY + 7.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9.0);
    doc.setTextColor(...SLATE_900);
    doc.text(
      `Lat: ${position.lat.toFixed(6)}   |   Lng: ${position.lng.toFixed(6)}`,
      locBoxX + 4,
      locBoxY + 14.0
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...SLATE_700);
    doc.text(
      truncateLine(doc, `Wilayah: ${proposal.kecamatanKawasan}, ${proposal.kabupatenKota}`, locBoxW - 8),
      locBoxX + 4,
      locBoxY + 20.5
    );
    doc.text(
      truncateLine(doc, `Target: ${proposal.volumeTarget.toLocaleString('id-ID')} ${proposal.satuanTarget}`, locBoxW - 8),
      locBoxX + 4,
      locBoxY + 25.5
    );
    doc.text(
      truncateLine(
        doc,
        `Penerima Manfaat: ${proposal.penerimaManfaatJiwa.toLocaleString('id-ID')} Jiwa | Radius: ${proposal.serviceRadiusKm} km`,
        locBoxW - 8
      ),
      locBoxX + 4,
      locBoxY + 30.5
    );

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.6);
    doc.setTextColor(...SLATE_500);
    doc.text(
      'Unggah gambar skema/peta pada jendela Profil Usulan untuk menyematkan gambar di area ini.',
      locBoxX + 4,
      locBoxY + locBoxH - 3.5
    );
  }

  // Location description below map/image box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...SLATE_700);
  const descLines = doc
    .splitTextToSize(sanitizePdfText(`> ${details.deskripsiLokasi}`), locBoxW)
    .slice(0, 3) as string[];
  descLines.forEach((line, idx) => {
    doc.text(line, locBoxX, locBoxY + locBoxH + 3.8 + idx * 3.2);
  });

  // Card 8: Status Readiness Criteria (RC) Table
  drawCardFrame(
    doc,
    r3X2,
    row3Y,
    r3W2,
    row3H,
    'Status Readiness Criteria (RC)',
    `Skor RC: ${rcPercentage}%`
  );

  const tblX = r3X2 + 3.5;
  const tblY = row3Y + 10.5;
  const tblW = r3W2 - 7;
  const colDocW = tblW * 0.36;
  const colStatusEachW = (tblW * 0.27) / 3;
  const colStatusTotalW = colStatusEachW * 3;
  const colKetW = tblW - colDocW - colStatusTotalW;

  // Table header (2-row grouped header)
  const hdrRow1H = 5.2;
  const hdrRow2H = 5.0;
  const hdrTotalH = hdrRow1H + hdrRow2H;

  doc.setFillColor(...PU_TINT);
  doc.setDrawColor(...PU_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(tblX, tblY, tblW, hdrTotalH, 'FD');

  // Column dividers inside header
  doc.line(tblX + colDocW, tblY, tblX + colDocW, tblY + hdrTotalH);
  doc.line(tblX + colDocW + colStatusTotalW, tblY, tblX + colDocW + colStatusTotalW, tblY + hdrTotalH);
  doc.line(tblX + colDocW, tblY + hdrRow1H, tblX + colDocW + colStatusTotalW, tblY + hdrRow1H);
  doc.line(tblX + colDocW + colStatusEachW, tblY + hdrRow1H, tblX + colDocW + colStatusEachW, tblY + hdrTotalH);
  doc.line(
    tblX + colDocW + colStatusEachW * 2,
    tblY + hdrRow1H,
    tblX + colDocW + colStatusEachW * 2,
    tblY + hdrTotalH
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...PU_NAVY);
  doc.text('Dokumen', tblX + colDocW / 2, tblY + 6.3, { align: 'center' });
  doc.text('Status', tblX + colDocW + colStatusTotalW / 2, tblY + 3.7, { align: 'center' });
  doc.text('Keterangan', tblX + colDocW + colStatusTotalW + colKetW / 2, tblY + 6.3, {
    align: 'center',
  });

  doc.setFontSize(6.5);
  doc.text('Ada', tblX + colDocW + colStatusEachW * 0.5, tblY + 8.5, { align: 'center' });
  doc.text('Kurang', tblX + colDocW + colStatusEachW * 1.5, tblY + 8.5, { align: 'center' });
  doc.text('Sesuai', tblX + colDocW + colStatusEachW * 2.5, tblY + 8.5, { align: 'center' });

  // Table rows (KEMENPU 6 standard rows)
  const availableBodyH = row3H - 22;
  const rowH = Math.min(
    shouldIncludeDetailRc ? 12.5 : 8.2,
    Math.max(7.2, availableBodyH / KEMENPU_RC_ROWS.length)
  );

  KEMENPU_RC_ROWS.forEach((row, rIdx) => {
    const ry = tblY + hdrTotalH + rIdx * rowH;
    const entry = rcTable[row.key] ?? { status: '', keterangan: '' };
    const flags = getRcChecklistFlags(entry);
    const docName =
      row.key === 'lainnya' && entry.customLabel?.trim() ? entry.customLabel : row.defaultLabel;

    doc.setFillColor(...WHITE);
    doc.setDrawColor(...SLATE_300);
    doc.rect(tblX, ry, tblW, rowH, 'FD');

    doc.line(tblX + colDocW, ry, tblX + colDocW, ry + rowH);
    doc.line(tblX + colDocW + colStatusEachW, ry, tblX + colDocW + colStatusEachW, ry + rowH);
    doc.line(
      tblX + colDocW + colStatusEachW * 2,
      ry,
      tblX + colDocW + colStatusEachW * 2,
      ry + rowH
    );
    doc.line(tblX + colDocW + colStatusTotalW, ry, tblX + colDocW + colStatusTotalW, ry + rowH);

    // Doc label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...SLATE_800);
    const dLines = doc.splitTextToSize(sanitizePdfText(docName), colDocW - 3.5).slice(0, 2) as string[];
    dLines.forEach((line, lIdx) => {
      doc.text(line, tblX + 1.8, ry + 3.3 + lIdx * 2.9);
    });

    // Checkmarks rendered as crisp 'V'
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    if (flags.ada) {
      doc.setTextColor(...EMERALD_700);
      doc.text('V', tblX + colDocW + colStatusEachW * 0.5, ry + rowH * 0.62, { align: 'center' });
    }
    if (flags.kurang) {
      doc.setTextColor(...AMBER_700);
      doc.text('V', tblX + colDocW + colStatusEachW * 1.5, ry + rowH * 0.62, { align: 'center' });
    }
    if (flags.sesuai) {
      doc.setTextColor(...BLUE_700);
      doc.text('V', tblX + colDocW + colStatusEachW * 2.5, ry + rowH * 0.62, { align: 'center' });
    }

    // Keterangan
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(...SLATE_700);
    const kLines = doc
      .splitTextToSize(sanitizePdfText(entry.keterangan || '-'), colKetW - 3.5)
      .slice(0, 2) as string[];
    kLines.forEach((line, lIdx) => {
      doc.text(line, tblX + colDocW + colStatusTotalW + 1.8, ry + 3.3 + lIdx * 2.9);
    });
  });

  if (!shouldIncludeDetailRc) {
    // Fallback Signature Block on Page 1 only when Detail Status RC is excluded
    drawSignatureBlock(doc, marginX, row3Y + row3H + 2.5, contentWidth, 34, signatories);
  }

  // PAGE 2+: Detail Status Readiness Criteria (RC)
  if (shouldIncludeDetailRc) {
    const customRcList = input.customRcItems ?? details.customRcItems ?? [];
    const totalDocsCount = KEMENPU_RC_ROWS.length + customRcList.length;

    interface DetailPdfRow {
      no: number;
      docLabel: string;
      isCustom: boolean;
      subNotes: string[];
      acuan: string;
      flags: { ada: boolean; kurang: boolean; sesuai: boolean };
      keterangan: string;
    }

    const detailRows: DetailPdfRow[] = KEMENPU_RC_ROWS.map((row, idx) => {
      const entry = rcTable[row.key] ?? { status: '', keterangan: '' };
      const flags = getRcChecklistFlags(entry);
      const docLabel =
        row.key === 'lainnya' && entry.customLabel?.trim()
          ? entry.customLabel
          : row.defaultLabel;
      const rawLegacy = proposal.templateDetails?.rcDetails;
      const subNotes: string[] = [];
      if (row.key === 'fsDedRab' && rawLegacy) {
        if (rawLegacy.studiKelayakan) {
          subNotes.push(
            `Studi Kelayakan (FS): ${rawLegacy.studiKelayakan.status || '-'}${
              rawLegacy.studiKelayakan.keterangan ? ` (${rawLegacy.studiKelayakan.keterangan})` : ''
            }`
          );
        }
        if (rawLegacy.ded) {
          subNotes.push(
            `DED Teknis: ${rawLegacy.ded.status || '-'}${
              rawLegacy.ded.keterangan ? ` (${rawLegacy.ded.keterangan})` : ''
            }`
          );
        }
        if (rawLegacy.rab) {
          subNotes.push(
            `RAB: ${rawLegacy.rab.status || '-'}${
              rawLegacy.rab.keterangan ? ` (${rawLegacy.rab.keterangan})` : ''
            }`
          );
        }
      }
      return {
        no: idx + 1,
        docLabel,
        isCustom: false,
        subNotes,
        acuan: row.placeholderNote,
        flags,
        keterangan: entry.keterangan?.trim() || 'Belum ada keterangan tambahan.',
      };
    });

    customRcList.forEach((item, customIdx) => {
      detailRows.push({
        no: KEMENPU_RC_ROWS.length + customIdx + 1,
        docLabel: item.namaDokumen,
        isCustom: true,
        subNotes: [],
        acuan:
          item.acuanStandar?.trim() ||
          'Dokumen pendukung tambahan sesuai kebutuhan verifikasi.',
        flags: getRcChecklistFlags(item),
        keterangan: item.keterangan?.trim() || 'Belum ada keterangan tambahan.',
      });
    });

    const summaryCounts = detailRows.reduce(
      (acc, r) => {
        if (r.flags.ada) acc.ada += 1;
        if (r.flags.kurang) acc.kurang += 1;
        if (r.flags.sesuai) acc.sesuai += 1;
        return acc;
      },
      { ada: 0, kurang: 0, sesuai: 0 }
    );

    const drawDetailPageHeader = (isContinuation: boolean) => {
      doc.addPage();
      drawBatikPageChrome(doc, pageWidth, pageHeight, batikAssets);

      const dHeaderY = 5.4;
      const dHeaderH = 14.5;
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...PU_BORDER);
      doc.setLineWidth(0.28);
      doc.roundedRect(marginX, dHeaderY, contentWidth, dHeaderH, 2, 2, 'FD');

      doc.setFillColor(...PU_NAVY);
      doc.rect(marginX + 1.8, dHeaderY + 1.6, 2.2, dHeaderH - 3.2, 'F');
      doc.setFillColor(...GOLD_ACCENT);
      doc.rect(marginX + 4.0, dHeaderY + 1.6, 2.2, dHeaderH - 3.2, 'F');

      const dTitleMaxW = contentWidth - 62;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.0);
      doc.setTextColor(...PU_NAVY);
      doc.text(
        truncateLine(
          doc,
          `DETAIL STATUS READINESS CRITERIA (RC)${isContinuation ? ' (LANJUTAN)' : ''} - ${proposal.namaProgram.toUpperCase()}`,
          dTitleMaxW
        ),
        marginX + 8.5,
        dHeaderY + 5.6
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(...STEEL_SUBTITLE);
      doc.text(
        truncateLine(
          doc,
          `${proposal.kodeUsulan} | ${proposal.kabupatenKota} | Skor RC: ${rcPercentage}% | Total ${totalDocsCount} Dokumen RC`,
          dTitleMaxW
        ),
        marginX + 8.5,
        dHeaderY + 10.6
      );

      if (wordmarkDataUrl && wordmarkDataUrl.startsWith('data:image/')) {
        try {
          const logoH = 10.8;
          const logoW = logoH * (262 / 64);
          doc.addImage(
            wordmarkDataUrl,
            'PNG',
            pageWidth - marginX - logoW - 3,
            dHeaderY + 1.8,
            logoW,
            logoH,
            undefined,
            'FAST'
          );
        } catch {
          // ignore logo error
        }
      }
    };

    drawDetailPageHeader(false);

    // 4 Verification Metadata Summary Cards
    const metaY = 22.2;
    const metaH = 13.0;
    const metaGap = 3.0;
    const metaCardW = (contentWidth - metaGap * 3) / 4;
    const metaItems = [
      {
        label: 'Status Verifikasi / Matriks',
        value: details.statusManual?.trim() || proposal.statusVerifikasi,
      },
      {
        label: 'Pembahasan dengan BPBPK NTB',
        value: `${details.jumlahPembahasanBpbpk ?? 0} Kali Pembahasan`,
      },
      {
        label: 'Kelengkapan Dokumen RC',
        value: `Ada ${summaryCounts.ada}/${totalDocsCount} | Sesuai ${summaryCounts.sesuai}/${totalDocsCount} | Kurang ${summaryCounts.kurang}/${totalDocsCount}`,
      },
      {
        label: 'Tautan Berkas / Data RC',
        value: details.linkDataRc?.trim() || 'Belum diisi',
      },
    ];

    metaItems.forEach((m, idx) => {
      const mx = marginX + idx * (metaCardW + metaGap);
      doc.setFillColor(248, 250, 254);
      doc.setDrawColor(...PU_BORDER);
      doc.setLineWidth(0.25);
      doc.roundedRect(mx, metaY, metaCardW, metaH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_500);
      doc.text(sanitizePdfText(m.label), mx + 3, metaY + 4.4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...PU_NAVY);
      doc.text(truncateLine(doc, m.value, metaCardW - 6), mx + 3, metaY + 9.4);
    });

    // Detail Table Column Geometry across 275mm
    const dTblX = marginX;
    const colNoW = 9;
    const colNamaW = 54;
    const colAcuanW = 52;
    const colAdaW = 11;
    const colKurangW = 13;
    const colSesuaiW = 13;
    const colStatW = 32;
    const colKetDetailW =
      contentWidth -
      colNoW -
      colNamaW -
      colAcuanW -
      colAdaW -
      colKurangW -
      colSesuaiW -
      colStatW; // 91mm

    const drawDetailTableHeader = (startY: number): number => {
      // Top dark navy banner
      doc.setFillColor(...PU_NAVY);
      doc.setDrawColor(...PU_BORDER);
      doc.rect(dTblX, startY, contentWidth, 7.2, 'FD');
      doc.setFillColor(...PU_GOLD);
      doc.rect(dTblX, startY + 6.7, contentWidth, 0.5, 'F');
      doc.setFillColor(...PU_GOLD);
      doc.circle(dTblX + 3.5, startY + 3.5, 0.95, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      doc.setTextColor(...WHITE);
      doc.text(
        'Rincian Lengkap Status Readiness Criteria (RC)',
        dTblX + 6.2,
        startY + 4.6
      );
      doc.setFontSize(7.4);
      doc.setTextColor(...PU_GOLD_LIGHT);
      doc.text(
        `${totalDocsCount} Dokumen | Skor RC: ${rcPercentage}%`,
        dTblX + contentWidth - 3,
        startY + 4.6,
        { align: 'right' }
      );

      // Column headers
      const chY = startY + 7.2;
      const chH = 7.4;
      doc.setFillColor(...PU_TINT);
      doc.setDrawColor(...PU_BORDER);
      doc.setLineWidth(0.2);
      doc.rect(dTblX, chY, contentWidth, chH, 'FD');

      const dividers = [
        colNoW,
        colNoW + colNamaW,
        colNoW + colNamaW + colAcuanW,
        colNoW + colNamaW + colAcuanW + colAdaW,
        colNoW + colNamaW + colAcuanW + colAdaW + colKurangW,
        colNoW + colNamaW + colAcuanW + colAdaW + colKurangW + colSesuaiW,
        colNoW + colNamaW + colAcuanW + colAdaW + colKurangW + colSesuaiW + colStatW,
      ];
      dividers.forEach((dx) => {
        doc.line(dTblX + dx, chY, dTblX + dx, chY + chH);
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.9);
      doc.setTextColor(...PU_NAVY);
      doc.text('No', dTblX + colNoW / 2, chY + 4.8, { align: 'center' });
      doc.text('Dokumen Readiness Criteria', dTblX + colNoW + 2.5, chY + 4.8);
      doc.text('Acuan / Standar Kelengkapan', dTblX + colNoW + colNamaW + 2.5, chY + 4.8);
      doc.text('Ada', dTblX + dividers[2] + colAdaW / 2, chY + 4.8, { align: 'center' });
      doc.text('Kurang', dTblX + dividers[3] + colKurangW / 2, chY + 4.8, { align: 'center' });
      doc.text('Sesuai', dTblX + dividers[4] + colSesuaiW / 2, chY + 4.8, { align: 'center' });
      doc.text('Status Detail', dTblX + dividers[5] + colStatW / 2, chY + 4.8, { align: 'center' });
      doc.text('Keterangan & Catatan Verifikasi Lengkap', dTblX + dividers[6] + 2.5, chY + 4.8);

      return chY + chH;
    };

    let cursorY = drawDetailTableHeader(37.6);
    const tableMaxY = pageHeight - 13;

    detailRows.forEach((row) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      const nameLines = doc.splitTextToSize(
        sanitizePdfText(row.docLabel),
        colNamaW - 4.5
      ) as string[];

      const subNoteWrapped: string[] = [];
      if (row.subNotes.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.9);
        row.subNotes.forEach((s) => {
          const wLines = doc.splitTextToSize(sanitizePdfText(s), colNamaW - 5) as string[];
          subNoteWrapped.push(...wLines.slice(0, 2));
        });
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      const acuanLines = doc.splitTextToSize(
        sanitizePdfText(row.acuan),
        colAcuanW - 4.5
      ) as string[];
      const ketLines = doc.splitTextToSize(
        sanitizePdfText(row.keterangan),
        colKetDetailW - 4.5
      ) as string[];

      const nameBlockH =
        nameLines.length * 3.1 +
        (subNoteWrapped.length > 0 ? 1.5 + subNoteWrapped.length * 2.7 : 0);
      const acuanBlockH = acuanLines.length * 3.0;
      const ketBlockH = ketLines.length * 3.0;
      const rowH = Math.max(9.5, Math.max(nameBlockH, acuanBlockH, ketBlockH) + 3.6);

      if (cursorY + rowH > tableMaxY) {
        drawDetailPageHeader(true);
        cursorY = drawDetailTableHeader(22.2);
      }

      doc.setFillColor(...WHITE);
      doc.setDrawColor(...PU_BORDER);
      doc.setLineWidth(0.2);
      doc.rect(dTblX, cursorY, contentWidth, rowH, 'FD');

      const dividers = [
        colNoW,
        colNoW + colNamaW,
        colNoW + colNamaW + colAcuanW,
        colNoW + colNamaW + colAcuanW + colAdaW,
        colNoW + colNamaW + colAcuanW + colAdaW + colKurangW,
        colNoW + colNamaW + colAcuanW + colAdaW + colKurangW + colSesuaiW,
        colNoW + colNamaW + colAcuanW + colAdaW + colKurangW + colSesuaiW + colStatW,
      ];
      dividers.forEach((dx) => {
        doc.line(dTblX + dx, cursorY, dTblX + dx, cursorY + rowH);
      });

      // No
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...SLATE_500);
      doc.text(String(row.no), dTblX + colNoW / 2, cursorY + 4.4, { align: 'center' });

      // Nama Dokumen + subNotes
      let nameY = cursorY + 4.2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(...PU_NAVY);
      nameLines.forEach((l) => {
        doc.text(l, dTblX + colNoW + 2.2, nameY);
        nameY += 3.1;
      });
      if (subNoteWrapped.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.9);
        doc.setTextColor(...SLATE_500);
        nameY += 0.8;
        subNoteWrapped.forEach((l) => {
          doc.text(l, dTblX + colNoW + 2.2, nameY);
          nameY += 2.7;
        });
      }

      // Acuan
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(...SLATE_700);
      acuanLines.forEach((l, i) => {
        doc.text(l, dTblX + dividers[1] + 2.2, cursorY + 4.2 + i * 3.0);
      });

      // Checklist V marks
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.0);
      if (row.flags.ada) {
        doc.setTextColor(...EMERALD_700);
        doc.text('V', dTblX + dividers[2] + colAdaW / 2, cursorY + 5.2, { align: 'center' });
      }
      if (row.flags.kurang) {
        doc.setTextColor(...AMBER_700);
        doc.text('V', dTblX + dividers[3] + colKurangW / 2, cursorY + 5.2, { align: 'center' });
      }
      if (row.flags.sesuai) {
        doc.setTextColor(...BLUE_700);
        doc.text('V', dTblX + dividers[4] + colSesuaiW / 2, cursorY + 5.2, { align: 'center' });
      }

      // Status Detail badge
      const statStyle = getRcDetailStatusPdfStyle(row.flags);
      const pillW = colStatW - 3.6;
      const pillX = dTblX + dividers[5] + 1.8;
      const pillY = cursorY + 1.8;
      doc.setFillColor(...statStyle.fill);
      doc.setDrawColor(...statStyle.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(pillX, pillY, pillW, 4.8, 0.9, 0.9, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(...statStyle.text);
      doc.text(truncateLine(doc, statStyle.label, pillW - 1.5), pillX + pillW / 2, pillY + 3.2, {
        align: 'center',
      });

      // Keterangan Lengkap
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(...SLATE_700);
      ketLines.forEach((l, i) => {
        doc.text(l, dTblX + dividers[6] + 2.2, cursorY + 4.2 + i * 3.0);
      });

      cursorY += rowH;
    });

    // Bottom Cards: 5 Indikator Inti (57%) & Catatan Teknis Balai (43%)
    const bottomCardsH = 38;
    const bottomGapY = 3.0;
    if (cursorY + bottomGapY + bottomCardsH > tableMaxY) {
      drawDetailPageHeader(true);
      cursorY = 22.2;
    } else {
      cursorY += bottomGapY;
    }

    const leftCardW = contentWidth * 0.57;
    const rightCardW = contentWidth - leftCardW - gap;
    const rightCardX = marginX + leftCardW + gap;

    drawCardFrame(
      doc,
      marginX,
      cursorY,
      leftCardW,
      bottomCardsH,
      '5 Indikator Inti Readiness Criteria (RC)'
    );

    const indCols = 2;
    const indCardGap = 2.5;
    const indBoxW = (leftCardW - 7 - indCardGap) / indCols;
    const indBoxH = 8.0;
    CORE_READINESS_PDF_META.forEach((item, idx) => {
      const colIdx = idx % indCols;
      const rowIdx = Math.floor(idx / indCols);
      const ix = marginX + 3.5 + colIdx * (indBoxW + indCardGap);
      const iy = cursorY + 9.8 + rowIdx * (indBoxH + 1.2);
      const isOk = Boolean(proposal.readiness[item.key]);

      doc.setFillColor(248, 250, 254);
      doc.setDrawColor(...PU_BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(ix, iy, indBoxW, indBoxH, 1.2, 1.2, 'FD');

      doc.setFillColor(...(isOk ? EMERALD_700 : SLATE_200));
      doc.roundedRect(ix + 2, iy + 2.0, 3.4, 3.4, 0.7, 0.7, 'F');
      if (isOk) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(...WHITE);
        doc.text('V', ix + 3.7, iy + 4.6, { align: 'center' });
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...SLATE_900);
      doc.text(truncateLine(doc, item.label, indBoxW - 9), ix + 7.0, iy + 3.7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.6);
      doc.setTextColor(...SLATE_500);
      doc.text(truncateLine(doc, item.desc, indBoxW - 9), ix + 7.0, iy + 6.6);
    });

    drawCardFrame(
      doc,
      rightCardX,
      cursorY,
      rightCardW,
      bottomCardsH,
      'Catatan Teknis & Tindak Lanjut Verifikasi Balai'
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(...SLATE_700);
    const noteText =
      proposal.catatanTeknis?.trim() ||
      'Belum ada catatan teknis tambahan untuk usulan ini.';
    const wrappedNotes = doc
      .splitTextToSize(sanitizePdfText(noteText), rightCardW - 7)
      .slice(0, 7) as string[];
    wrappedNotes.forEach((line, lIdx) => {
      doc.text(line, rightCardX + 3.5, cursorY + 11.6 + lIdx * 3.3);
    });

    // Pengesahan di bagian bawah Detail Status RC (di bawah 5 Indikator Inti RC)
    cursorY += bottomCardsH;
    const detailSigH = 32;
    const detailSigGap = 2.8;
    if (cursorY + detailSigGap + detailSigH > tableMaxY) {
      drawDetailPageHeader(true);
      cursorY = 22.2;
    } else {
      cursorY += detailSigGap;
    }
    drawSignatureBlock(doc, marginX, cursorY, contentWidth, detailSigH, signatories);
  }

  // Footer stamped consistently across all pages
  const totalPages = doc.getNumberOfPages();
  const footerY = pageHeight - 5.5;
  const printDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  for (let pageNum = 1; pageNum <= totalPages; pageNum += 1) {
    doc.setPage(pageNum);
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...SLATE_500);
    const footerLabel =
      pageNum === 1
        ? `SIMPRA BPBPK NTB | Profil Usulan Program (${proposal.kodeUsulan})`
        : `SIMPRA BPBPK NTB | Detail Status Readiness Criteria (RC) (${proposal.kodeUsulan})`;
    doc.text(sanitizePdfText(footerLabel), marginX, footerY);
    doc.text(
      sanitizePdfText(`Dicetak: ${printDate} | Halaman ${pageNum} dari ${totalPages}`),
      pageWidth - marginX,
      footerY,
      { align: 'right' }
    );
  }

  const safeKode = (proposal.kodeUsulan || 'usulan').replace(/[^a-zA-Z0-9_-]/g, '-');
  const fileName = `Profil-Usulan-${safeKode}.pdf`;
  return { doc, fileName };
}

export function createProposalProfilePdfPreview(
  input: ProposalProfilePdfInput
): ProposalProfilePdfPreviewPayload {
  const { doc, fileName } = buildProposalProfilePdfDoc(input);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return {
    blobUrl,
    fileName,
    pageCount: doc.getNumberOfPages(),
  };
}

export function exportProposalProfilePdf(input: ProposalProfilePdfInput): string {
  const { doc, fileName } = buildProposalProfilePdfDoc(input);
  doc.save(fileName);
  return fileName;
}
