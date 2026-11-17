import { jsPDF } from 'jspdf';
import { formatRpMiliar, SEKTOR_SHORT_LABELS } from '../data/initialProposals';
import { SektorCiptaKarya, UsulanProgram } from '../types/ciptaKarya';
import { getCachedPuLogoDataUrl } from './puLogoAsset';

export interface PdfRankedProposalItem {
  proposal: UsulanProgram;
  rcPercentage: number;
  rcCompleted: number;
  rcTotal: number;
  isManualScore: boolean;
  totalPagu: number;
  tier: 'HIGH' | 'MEDIUM' | 'LOW';
  tierLabel: string;
  statusDisplay: string;
}

export interface PdfSummaryStats {
  highest: PdfRankedProposalItem | null;
  lowest: PdfRankedProposalItem | null;
  averagePct: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalCount: number;
}

export interface PdfSectorAverage {
  sektor: SektorCiptaKarya;
  shortLabel: string;
  count: number;
  avgPct: number;
  maxPct: number;
  minPct: number;
  totalPagu: number;
}

export interface PdfRegionalAverage {
  kabupaten: string;
  count: number;
  avgPct: number;
  totalPagu: number;
}

export interface PdfSignatoryParty {
  jabatan: string;
  nama: string;
}

export interface PdfSignatoriesConfig {
  tempatTanggal: string;
  mengesahkan: PdfSignatoryParty;
  menyetujui: PdfSignatoryParty;
}

export type RcPdfLayoutMode = 'multi' | 'single-sheet';

export interface PdfExportContext {
  yearFilterLabel: string;
  sectorFilterLabel?: string;
  sortOrder: 'desc' | 'asc';
  tierFilterLabel: string;
  statusFilterLabel: string;
  searchQuery: string;
  signatories?: PdfSignatoriesConfig;
  logoDataUrl?: string | null;
  layoutMode?: RcPdfLayoutMode;
}

type RgbTuple = [number, number, number];

const COLOR_SLATE_900: RgbTuple = [15, 23, 42];
const COLOR_SLATE_700: RgbTuple = [51, 65, 85];
const COLOR_SLATE_500: RgbTuple = [100, 116, 139];
const COLOR_SLATE_400: RgbTuple = [148, 163, 184];
const COLOR_SLATE_200: RgbTuple = [226, 232, 240];
const COLOR_SLATE_100: RgbTuple = [241, 245, 249];
const COLOR_WHITE: RgbTuple = [255, 255, 255];

const COLOR_BLUE_700: RgbTuple = [29, 78, 216];
const COLOR_BLUE_600: RgbTuple = [37, 99, 235];
const COLOR_EMERALD_600: RgbTuple = [5, 150, 105];
const COLOR_EMERALD_700: RgbTuple = [4, 120, 87];
const COLOR_AMBER_500: RgbTuple = [245, 158, 11];
const COLOR_AMBER_700: RgbTuple = [180, 83, 9];

function sanitizePdfText(raw: string): string {
  return String(raw ?? '')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

function getTierColors(pct: number): {
  bar: RgbTuple;
  text: RgbTuple;
  label: string;
} {
  if (pct >= 80) {
    return {
      bar: COLOR_EMERALD_600,
      text: COLOR_EMERALD_700,
      label: 'Siap (>=80%)',
    };
  }
  if (pct >= 50) {
    return {
      bar: COLOR_BLUE_600,
      text: COLOR_BLUE_700,
      label: 'Proses (50-79%)',
    };
  }
  return {
    bar: COLOR_AMBER_500,
    text: COLOR_AMBER_700,
    label: 'Perlu Lengkapi (<50%)',
  };
}

function truncateTextToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  const clean = sanitizePdfText(text);
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  let result = clean;
  while (result.length > 3 && doc.getTextWidth(`${result}...`) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}...`;
}

export interface RcPdfPreviewPayload {
  blobUrl: string;
  fileName: string;
  pageCount: number;
}

function buildRcInfographicSingleSheetPdfDoc(
  rankedItems: PdfRankedProposalItem[],
  summaryStats: PdfSummaryStats,
  context: PdfExportContext
): { doc: jsPDF; fileName: string } {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2; // 277
  const footerLineY = pageHeight - 8;

  const printTimestamp = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const puLogoDataUrl = context.logoDataUrl ?? getCachedPuLogoDataUrl();

  // 1. Compact Top Institutional Banner (y: 7..26, height 19mm)
  const bannerY = 7;
  const bannerH = 19;
  doc.setFillColor(...COLOR_SLATE_900);
  doc.rect(marginX, bannerY, contentWidth, bannerH, 'F');
  doc.setFillColor(...COLOR_BLUE_700);
  doc.rect(marginX, bannerY, 2.2, bannerH, 'F');

  let hasLogoRendered = false;
  if (puLogoDataUrl && puLogoDataUrl.startsWith('data:image/')) {
    try {
      doc.setDrawColor(232, 150, 17);
      doc.setLineWidth(0.3);
      doc.rect(marginX + 3.5, bannerY + 2.3, 14.4, 14.4, 'S');
      doc.addImage(
        puLogoDataUrl,
        'PNG',
        marginX + 3.7,
        bannerY + 2.5,
        14,
        14,
        undefined,
        'FAST'
      );
      hasLogoRendered = true;
    } catch {
      hasLogoRendered = false;
    } finally {
      doc.setLineWidth(0.2);
    }
  }

  const leftTextX = hasLogoRendered ? marginX + 20.5 : marginX + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(147, 197, 253);
  doc.text(
    'KEMENTERIAN PEKERJAAN UMUM · SIMPRA BPBPK NUSA TENGGARA BARAT',
    leftTextX,
    bannerY + 4.4
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...COLOR_WHITE);
  doc.text(
    'INFOGRAFIS PERINGKAT SKOR READINESS CRITERIA (RC)',
    leftTextX,
    bannerY + 10.0
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(253, 230, 138);
  doc.text(
    'Usulan Program Infrastruktur Cipta Karya - BPBPK Nusa Tenggara Barat',
    leftTextX,
    bannerY + 15.2
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    sanitizePdfText(`Tahun Anggaran: ${context.yearFilterLabel} | Mode: 1 Kertas`),
    pageWidth - marginX - 3.5,
    bannerY + 5.0,
    { align: 'right' }
  );
  doc.text(
    sanitizePdfText(`Dicetak: ${printTimestamp}`),
    pageWidth - marginX - 3.5,
    bannerY + 9.8,
    { align: 'right' }
  );
  doc.text(
    sanitizePdfText(`Cakupan Paket: ${rankedItems.length} dari ${summaryStats.totalCount} Usulan`),
    pageWidth - marginX - 3.5,
    bannerY + 14.8,
    { align: 'right' }
  );

  // 2. Compact Filter Context Strip (y: 27.2..32.4)
  const stripY = bannerY + bannerH + 1.4;
  doc.setFillColor(...COLOR_SLATE_100);
  doc.setDrawColor(...COLOR_SLATE_200);
  doc.roundedRect(marginX, stripY, contentWidth, 5.4, 1.2, 1.2, 'FD');

  const sortText =
    context.sortOrder === 'desc' ? 'Tertinggi ke Terendah' : 'Terendah ke Tertinggi';
  const metaParts = [
    `Sektor Teknis: ${context.sectorFilterLabel || 'Semua Sektor Teknis'}`,
    `Urutan: ${sortText}`,
    `Kesiapan: ${context.tierFilterLabel}`,
    `Status Usulan: ${context.statusFilterLabel}`,
  ];
  if (context.searchQuery.trim()) {
    metaParts.push(`Pencarian: "${context.searchQuery.trim()}"`);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(...COLOR_SLATE_700);
  doc.text(
    truncateTextToWidth(doc, metaParts.join('  |  '), contentWidth - 6),
    marginX + 3,
    stripY + 3.7
  );

  // 3. Compact 3-Column KPI Summary Row (y: 34..54.5, height 20.5mm)
  const kpiY = stripY + 7;
  const kpiH = 20.5;
  const kpiGap = 3.5;
  const kpiW = (contentWidth - kpiGap * 2) / 3;

  const drawCompactKpiFrame = (colIdx: number, title: string) => {
    const x = marginX + colIdx * (kpiW + kpiGap);
    doc.setFillColor(...COLOR_WHITE);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(x, kpiY, kpiW, kpiH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(sanitizePdfText(title), x + 3, kpiY + 4.1);
    return x;
  };

  // KPI 1: Highest
  const kpi1X = drawCompactKpiFrame(0, 'Skor RC Tertinggi');
  if (summaryStats.highest) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.2);
    doc.setTextColor(...COLOR_EMERALD_700);
    doc.text(`${summaryStats.highest.rcPercentage}%`, kpi1X + 3, kpiY + 9.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(sanitizePdfText(summaryStats.highest.proposal.kodeUsulan), kpi1X + kpiW - 3, kpiY + 9.8, {
      align: 'right',
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(
      truncateTextToWidth(doc, summaryStats.highest.proposal.namaProgram, kpiW - 6),
      kpi1X + 3,
      kpiY + 14.3
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      truncateTextToWidth(
        doc,
        `${summaryStats.highest.proposal.kabupatenKota} · ${SEKTOR_SHORT_LABELS[summaryStats.highest.proposal.sektor]}`,
        kpiW - 6
      ),
      kpi1X + 3,
      kpiY + 18.2
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada paket usulan', kpi1X + 3, kpiY + 11.5);
  }

  // KPI 2: Lowest
  const kpi2X = drawCompactKpiFrame(1, 'Skor RC Terendah');
  if (summaryStats.lowest) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.2);
    doc.setTextColor(...COLOR_AMBER_700);
    doc.text(`${summaryStats.lowest.rcPercentage}%`, kpi2X + 3, kpiY + 9.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(sanitizePdfText(summaryStats.lowest.proposal.kodeUsulan), kpi2X + kpiW - 3, kpiY + 9.8, {
      align: 'right',
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(
      truncateTextToWidth(doc, summaryStats.lowest.proposal.namaProgram, kpiW - 6),
      kpi2X + 3,
      kpiY + 14.3
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      truncateTextToWidth(
        doc,
        `${summaryStats.lowest.proposal.kabupatenKota} · ${SEKTOR_SHORT_LABELS[summaryStats.lowest.proposal.sektor]}`,
        kpiW - 6
      ),
      kpi2X + 3,
      kpiY + 18.2
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada paket usulan', kpi2X + 3, kpiY + 11.5);
  }

  // KPI 3: Tier distribution
  const kpi3X = drawCompactKpiFrame(2, 'Jumlah Usulan per Kesiapan');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...COLOR_SLATE_500);
  doc.text(`${summaryStats.totalCount} Paket`, kpi3X + kpiW - 3, kpiY + 4.1, { align: 'right' });

  const totalDist = Math.max(1, summaryStats.totalCount);
  const highShare =
    summaryStats.totalCount > 0 ? Math.round((summaryStats.highCount / totalDist) * 100) : 0;
  const mediumShare =
    summaryStats.totalCount > 0 ? Math.round((summaryStats.mediumCount / totalDist) * 100) : 0;
  const lowShare =
    summaryStats.totalCount > 0 ? Math.max(0, 100 - highShare - mediumShare) : 0;

  const kpi3BarW = kpiW - 6;
  const kpi3Rows: Array<{
    label: string;
    count: number;
    share: number;
    textColor: RgbTuple;
    barColor: RgbTuple;
    y: number;
  }> = [
    {
      label: 'Siap (>=80%)',
      count: summaryStats.highCount,
      share: highShare,
      textColor: COLOR_EMERALD_700,
      barColor: COLOR_EMERALD_600,
      y: kpiY + 8.0,
    },
    {
      label: 'Proses (50-79%)',
      count: summaryStats.mediumCount,
      share: mediumShare,
      textColor: COLOR_BLUE_700,
      barColor: COLOR_BLUE_600,
      y: kpiY + 12.6,
    },
    {
      label: 'Kurang (<50%)',
      count: summaryStats.lowCount,
      share: lowShare,
      textColor: COLOR_AMBER_700,
      barColor: COLOR_AMBER_500,
      y: kpiY + 17.2,
    },
  ];
  kpi3Rows.forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.1);
    doc.setTextColor(...COLOR_SLATE_700);
    doc.text(r.label, kpi3X + 3, r.y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...r.textColor);
    doc.text(`${r.count} (${r.share}%)`, kpi3X + kpiW - 3, r.y, { align: 'right' });
    const trackY = r.y + 0.9;
    doc.setFillColor(...COLOR_SLATE_100);
    doc.roundedRect(kpi3X + 3, trackY, kpi3BarW, 1.3, 0.5, 0.5, 'F');
    if (r.count > 0) {
      const fillW = Math.max(2, (kpi3BarW * Math.max(4, r.share)) / 100);
      doc.setFillColor(...r.barColor);
      doc.roundedRect(kpi3X + 3, trackY, fillW, 1.3, 0.5, 0.5, 'F');
    }
  });

  // 4. Section Header (y: 56..63, height 6.8mm)
  const secY = kpiY + kpiH + 2;
  doc.setFillColor(...COLOR_SLATE_100);
  doc.setDrawColor(...COLOR_SLATE_200);
  doc.roundedRect(marginX, secY, contentWidth, 6.8, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(...COLOR_SLATE_900);
  const sortTitle =
    context.sortOrder === 'desc' ? 'Tertinggi - Terendah' : 'Terendah - Tertinggi';
  doc.text(
    `Grafik Peringkat Skor RC per Paket Usulan (${sortTitle}) · Seluruh ${rankedItems.length} Paket dalam 1 Kertas`,
    marginX + 3,
    secY + 4.5
  );

  const legendItems: Array<{ label: string; color: RgbTuple }> = [
    { label: 'Siap (>=80%)', color: COLOR_EMERALD_600 },
    { label: 'Proses (50-79%)', color: COLOR_BLUE_600 },
    { label: 'Kurang (<50%)', color: COLOR_AMBER_500 },
  ];
  let lx = pageWidth - marginX - 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...COLOR_SLATE_700);
  doc.text('| Ambang = 80%', lx, secY + 4.5, { align: 'right' });
  lx -= doc.getTextWidth('| Ambang = 80%') + 4;
  for (let i = legendItems.length - 1; i >= 0; i -= 1) {
    const leg = legendItems[i];
    const lw = doc.getTextWidth(leg.label);
    doc.setTextColor(...COLOR_SLATE_700);
    doc.text(leg.label, lx, secY + 4.5, { align: 'right' });
    doc.setFillColor(...leg.color);
    doc.circle(lx - lw - 2, secY + 3.7, 1.0, 'F');
    lx -= lw + 5.5;
  }

  // 5. Signature geometry reserved at bottom so Grid uses maximum space above it
  const sigBoxHeight = 27.5;
  const sigY = footerLineY - 2.0 - sigBoxHeight; // 172.5mm
  const gridStartY = secY + 8.3; // ~64.8mm
  const maxGridBottomY = sigY - 2.2; // 170.3mm
  const availableGridH = Math.max(30, maxGridBottomY - gridStartY); // ~105.5mm

  if (rankedItems.length === 0) {
    doc.setFillColor(...COLOR_WHITE);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(marginX, gridStartY, contentWidth, 16, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      'Tidak ada paket usulan yang cocok dengan filter status, kesiapan, atau pencarian saat ini.',
      pageWidth / 2,
      gridStartY + 9.5,
      { align: 'center' }
    );
  } else {
    const count = rankedItems.length;
    const cols = count <= 8 ? 1 : count <= 24 ? 2 : count <= 45 ? 3 : 4;
    const colGap = cols === 1 ? 0 : cols === 2 ? 3.5 : cols === 3 ? 2.8 : 2.2;
    const colW = (contentWidth - colGap * (cols - 1)) / cols;
    const rowsPerCol = Math.ceil(count / cols);
    const maxSlotH = cols === 1 ? 13.8 : cols === 2 ? 12.2 : 10.0;
    const slotH = Math.min(maxSlotH, availableGridH / rowsPerCol);
    const rowGap = slotH >= 10 ? 1.2 : slotH >= 7 ? 0.85 : 0.55;
    const cardH = Math.max(3.6, slotH - rowGap);

    rankedItems.forEach((item, idx) => {
      const colIdx = Math.floor(idx / rowsPerCol);
      const rowIdx = idx % rowsPerCol;
      const cardX = marginX + colIdx * (colW + colGap);
      const cardY = gridStartY + rowIdx * slotH;
      const p = item.proposal;
      const tierMeta = getTierColors(item.rcPercentage);
      const rankNum = `#${String(idx + 1).padStart(2, '0')}`;
      const isTopThree = idx < 3 && context.sortOrder === 'desc';

      doc.setFillColor(...COLOR_WHITE);
      doc.setDrawColor(...COLOR_SLATE_200);
      doc.setLineWidth(0.18);
      doc.roundedRect(cardX, cardY, colW, cardH, 1.0, 1.0, 'FD');

      if (cols === 1 && cardH >= 10.5) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.4);
        doc.setTextColor(...(isTopThree ? COLOR_BLUE_700 : COLOR_SLATE_400));
        doc.text(rankNum, cardX + 3, cardY + 4.4);

        const textStartX = cardX + 12.5;
        const maxTitleW = colW - 12.5 - 38;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.0);
        doc.setTextColor(...COLOR_SLATE_900);
        doc.text(truncateTextToWidth(doc, p.namaProgram, maxTitleW), textStartX, cardY + 4.2);

        const subLine = `${p.kodeUsulan} · ${SEKTOR_SHORT_LABELS[p.sektor]} · ${p.kabupatenKota} · ${formatRpMiliar(item.totalPagu)} · ${item.statusDisplay}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...COLOR_SLATE_500);
        doc.text(truncateTextToWidth(doc, subLine, maxTitleW), textStartX, cardY + 7.4);

        const rightX = cardX + colW - 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        doc.setTextColor(...tierMeta.text);
        doc.text(`${item.rcPercentage}%`, rightX, cardY + 4.4, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.0);
        doc.setTextColor(...COLOR_SLATE_500);
        doc.text(sanitizePdfText(tierMeta.label), rightX, cardY + 7.4, { align: 'right' });

        const barX = textStartX;
        const barW = colW - 15.5;
        const barH = 1.9;
        const barY = cardY + cardH - 2.9;
        doc.setFillColor(...COLOR_SLATE_100);
        doc.roundedRect(barX, barY, barW, barH, 0.7, 0.7, 'F');
        const fillW = (barW * Math.max(1.5, Math.min(100, item.rcPercentage))) / 100;
        doc.setFillColor(...tierMeta.bar);
        doc.roundedRect(barX, barY, fillW, barH, 0.7, 0.7, 'F');
        const thresholdX = barX + barW * 0.8;
        doc.setDrawColor(...COLOR_SLATE_700);
        doc.setLineWidth(0.3);
        doc.line(thresholdX, barY - 0.4, thresholdX, barY + barH + 0.4);
      } else if (cardH >= 8.2) {
        const padX = 2.4;
        const rightScoreW = 14;
        const titleX = cardX + padX + 7.2;
        const maxTitleW = colW - padX * 2 - 7.2 - rightScoreW;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(...(isTopThree ? COLOR_BLUE_700 : COLOR_SLATE_400));
        doc.text(rankNum, cardX + padX, cardY + 3.4);

        doc.setTextColor(...COLOR_SLATE_900);
        doc.text(truncateTextToWidth(doc, p.namaProgram, maxTitleW), titleX, cardY + 3.4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(...tierMeta.text);
        doc.text(`${item.rcPercentage}%`, cardX + colW - padX, cardY + 3.6, { align: 'right' });

        const subLine = `${p.kabupatenKota} · ${SEKTOR_SHORT_LABELS[p.sektor]} · ${formatRpMiliar(item.totalPagu)}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(...COLOR_SLATE_500);
        doc.text(truncateTextToWidth(doc, subLine, colW - padX * 2 - 7.2), titleX, cardY + 6.0);

        const barX = titleX;
        const barW = colW - padX * 2 - 7.2;
        const barH = 1.45;
        const barY = cardY + cardH - 2.15;
        doc.setFillColor(...COLOR_SLATE_100);
        doc.roundedRect(barX, barY, barW, barH, 0.5, 0.5, 'F');
        const fillW = (barW * Math.max(1.5, Math.min(100, item.rcPercentage))) / 100;
        doc.setFillColor(...tierMeta.bar);
        doc.roundedRect(barX, barY, fillW, barH, 0.5, 0.5, 'F');
        const thresholdX = barX + barW * 0.8;
        doc.setDrawColor(...COLOR_SLATE_700);
        doc.setLineWidth(0.25);
        doc.line(thresholdX, barY - 0.3, thresholdX, barY + barH + 0.3);
      } else {
        const padX = 2.0;
        const fontSize = cardH >= 6.2 ? 6.0 : 5.1;
        const rankW = 6.2;
        const scoreW = 11.5;
        const maxTitleW = colW - padX * 2 - rankW - scoreW;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        doc.setTextColor(...(isTopThree ? COLOR_BLUE_700 : COLOR_SLATE_400));
        doc.text(rankNum, cardX + padX, cardY + cardH * 0.52);

        doc.setTextColor(...COLOR_SLATE_900);
        doc.text(
          truncateTextToWidth(doc, `${p.namaProgram} (${p.kabupatenKota})`, maxTitleW),
          cardX + padX + rankW,
          cardY + cardH * 0.52
        );

        doc.setTextColor(...tierMeta.text);
        doc.text(`${item.rcPercentage}%`, cardX + colW - padX, cardY + cardH * 0.52, {
          align: 'right',
        });

        const barX = cardX + padX + rankW;
        const barW = colW - padX * 2 - rankW;
        const barH = 1.05;
        const barY = cardY + cardH - 1.55;
        doc.setFillColor(...COLOR_SLATE_100);
        doc.roundedRect(barX, barY, barW, barH, 0.4, 0.4, 'F');
        const fillW = (barW * Math.max(1.5, Math.min(100, item.rcPercentage))) / 100;
        doc.setFillColor(...tierMeta.bar);
        doc.roundedRect(barX, barY, fillW, barH, 0.4, 0.4, 'F');
        const thresholdX = barX + barW * 0.8;
        doc.setDrawColor(...COLOR_SLATE_700);
        doc.setLineWidth(0.2);
        doc.line(thresholdX, barY - 0.2, thresholdX, barY + barH + 0.2);
      }
      doc.setLineWidth(0.2);
    });
  }

  // 6. Signature Block (Mengesahkan Kiri & Menyetujui Kanan)
  doc.setFillColor(...COLOR_WHITE);
  doc.setDrawColor(...COLOR_SLATE_200);
  doc.roundedRect(marginX, sigY, contentWidth, sigBoxHeight, 1.5, 1.5, 'FD');

  const leftCenterX = marginX + contentWidth * 0.25;
  const rightCenterX = marginX + contentWidth * 0.75;
  const sigColMaxW = contentWidth * 0.42;

  const sigConfig: PdfSignatoriesConfig = context.signatories ?? {
    tempatTanggal: '',
    mengesahkan: { jabatan: '', nama: '' },
    menyetujui: { jabatan: '', nama: '' },
  };

  const renderSingleSheetSignatureCol = (
    centerX: number,
    headingLabel: string,
    topMeta: string,
    party: PdfSignatoryParty
  ) => {
    const cleanTop = sanitizePdfText(topMeta);
    if (cleanTop) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_SLATE_700);
      doc.text(truncateTextToWidth(doc, cleanTop, sigColMaxW), centerX, sigY + 4.0, {
        align: 'center',
      });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(headingLabel, centerX, sigY + 7.6, { align: 'center' });

    const cleanJabatan = sanitizePdfText(party.jabatan);
    if (cleanJabatan) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_SLATE_700);
      const jabLines = doc.splitTextToSize(cleanJabatan, sigColMaxW).slice(0, 2) as string[];
      jabLines.forEach((line, lIdx) => {
        doc.text(line, centerX, sigY + 10.9 + lIdx * 3.0, { align: 'center' });
      });
    }

    const cleanNama = sanitizePdfText(party.nama);
    const nameY = sigY + 24.4;
    if (cleanNama) {
      const displayNama = truncateTextToWidth(doc, cleanNama, sigColMaxW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(...COLOR_SLATE_900);
      doc.text(displayNama, centerX, nameY, { align: 'center' });

      const namaWidth = doc.getTextWidth(displayNama);
      doc.setDrawColor(...COLOR_SLATE_900);
      doc.setLineWidth(0.25);
      doc.line(centerX - namaWidth / 2, nameY + 0.8, centerX + namaWidth / 2, nameY + 0.8);
      doc.setLineWidth(0.2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...COLOR_SLATE_400);
      doc.text('( ........................................ )', centerX, nameY, {
        align: 'center',
      });
    }
  };

  renderSingleSheetSignatureCol(leftCenterX, 'Mengesahkan,', '', sigConfig.mengesahkan);
  renderSingleSheetSignatureCol(
    rightCenterX,
    'Menyetujui,',
    sigConfig.tempatTanggal,
    sigConfig.menyetujui
  );

  // 7. Single-Page Footer
  doc.setDrawColor(...COLOR_SLATE_200);
  doc.line(marginX, footerLineY, pageWidth - marginX, footerLineY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(...COLOR_SLATE_500);
  doc.text(
    'SIMPRA BPBPK NTB TA. 2027-2030 · Infografis Peringkat Skor Readiness Criteria (RC) (Mode 1 Kertas)',
    marginX,
    footerLineY + 4.2
  );
  doc.text('Halaman 1 dari 1', pageWidth - marginX, footerLineY + 4.2, { align: 'right' });

  const slugDate = new Date().toISOString().slice(0, 10);
  const fileName = `infografis-skor-rc-1-kertas-${context.sortOrder}-${slugDate}.pdf`;
  return { doc, fileName };
}

function buildRcInfographicPdfDoc(
  rankedItems: PdfRankedProposalItem[],
  summaryStats: PdfSummaryStats,
  _sectorAverages: PdfSectorAverage[],
  _regionalAverages: PdfRegionalAverage[],
  context: PdfExportContext
): { doc: jsPDF; fileName: string } {
  if (context.layoutMode === 'single-sheet') {
    return buildRcInfographicSingleSheetPdfDoc(rankedItems, summaryStats, context);
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 273
  const footerLineY = pageHeight - 11;
  const maxContentY = footerLineY - 4;

  const printTimestamp = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const puLogoDataUrl = context.logoDataUrl ?? getCachedPuLogoDataUrl();

  const drawTopInstitutionalBanner = (isContinuation: boolean) => {
    const bannerHeight = isContinuation ? 13 : 24;
    doc.setFillColor(...COLOR_SLATE_900);
    doc.rect(marginX, 10, contentWidth, bannerHeight, 'F');
    doc.setFillColor(...COLOR_BLUE_700);
    doc.rect(marginX, 10, 2.5, bannerHeight, 'F');

    let hasLogoRendered = false;
    if (puLogoDataUrl && puLogoDataUrl.startsWith('data:image/')) {
      try {
        if (isContinuation) {
          doc.setDrawColor(232, 150, 17);
          doc.setLineWidth(0.3);
          doc.rect(marginX + 4.3, 11.3, 10.4, 10.4, 'S');
          doc.addImage(puLogoDataUrl, 'PNG', marginX + 4.5, 11.5, 10, 10, undefined, 'FAST');
        } else {
          doc.setDrawColor(232, 150, 17);
          doc.setLineWidth(0.35);
          doc.rect(marginX + 4.3, 12.8, 18.4, 18.4, 'S');
          doc.addImage(puLogoDataUrl, 'PNG', marginX + 4.5, 13, 18, 18, undefined, 'FAST');
        }
        hasLogoRendered = true;
      } catch {
        hasLogoRendered = false;
      } finally {
        doc.setLineWidth(0.2);
      }
    }

    const leftTextX = hasLogoRendered
      ? isContinuation
        ? marginX + 17.5
        : marginX + 26.5
      : marginX + 6;

    doc.setTextColor(...COLOR_WHITE);
    if (isContinuation) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(
        'INFOGRAFIS PERINGKAT SKOR READINESS CRITERIA (RC) - LANJUTAN',
        leftTextX,
        18
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        sanitizePdfText(
          `SIMPRA BPBPK NTB · ${context.yearFilterLabel} · ${context.sectorFilterLabel || 'Semua Sektor Teknis'} · Dicetak: ${printTimestamp}`
        ),
        pageWidth - marginX - 4,
        18,
        { align: 'right' }
      );
      return 10 + bannerHeight + 4;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(147, 197, 253);
    doc.text(
      'KEMENTERIAN PEKERJAAN UMUM · SIMPRA BPBPK NUSA TENGGARA BARAT',
      leftTextX,
      15.2
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_WHITE);
    doc.text(
      'INFOGRAFIS PERINGKAT SKOR READINESS CRITERIA (RC)',
      leftTextX,
      21.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(253, 230, 138);
    doc.text(
      'Usulan Program Infrastruktur Cipta Karya - BPBPK Nusa Tenggara Barat',
      leftTextX,
      27.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(
      sanitizePdfText(`Tahun Anggaran: ${context.yearFilterLabel}`),
      pageWidth - marginX - 4,
      16,
      { align: 'right' }
    );
    doc.text(
      sanitizePdfText(`Dicetak: ${printTimestamp}`),
      pageWidth - marginX - 4,
      21.5,
      { align: 'right' }
    );
    doc.text(
      sanitizePdfText(`Cakupan Paket: ${rankedItems.length} dari ${summaryStats.totalCount} Usulan`),
      pageWidth - marginX - 4,
      27,
      { align: 'right' }
    );

    // Filter Context Strip
    const stripY = 10 + bannerHeight + 2;
    doc.setFillColor(...COLOR_SLATE_100);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(marginX, stripY, contentWidth, 7.5, 1.5, 1.5, 'FD');

    const sortText =
      context.sortOrder === 'desc' ? 'Tertinggi ke Terendah' : 'Terendah ke Tertinggi';
    const metaParts = [
      `Sektor Teknis: ${context.sectorFilterLabel || 'Semua Sektor Teknis'}`,
      `Urutan: ${sortText}`,
      `Kesiapan: ${context.tierFilterLabel}`,
      `Status Usulan: ${context.statusFilterLabel}`,
    ];
    if (context.searchQuery.trim()) {
      metaParts.push(`Pencarian: "${context.searchQuery.trim()}"`);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_700);
    doc.text(
      truncateTextToWidth(doc, metaParts.join('   |   '), contentWidth - 8),
      marginX + 4,
      stripY + 5
    );

    return stripY + 11;
  };

  let cursorY = drawTopInstitutionalBanner(false);

  // 3-Column KPI Summary Row
  const kpiGap = 4;
  const kpiWidth = (contentWidth - kpiGap * 2) / 3;
  const kpiHeight = 29;

  const drawKpiCardFrame = (colIdx: number, title: string) => {
    const x = marginX + colIdx * (kpiWidth + kpiGap);
    doc.setFillColor(...COLOR_WHITE);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(x, cursorY, kpiWidth, kpiHeight, 1.8, 1.8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(sanitizePdfText(title), x + 3.5, cursorY + 5);
    return x;
  };

  // KPI 1: Highest
  const kpi1X = drawKpiCardFrame(0, 'Skor RC Tertinggi');
  if (summaryStats.highest) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...COLOR_EMERALD_700);
    doc.text(`${summaryStats.highest.rcPercentage}%`, kpi1X + 3.5, cursorY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      sanitizePdfText(summaryStats.highest.proposal.kodeUsulan),
      kpi1X + kpiWidth - 3.5,
      cursorY + 13,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(
      truncateTextToWidth(doc, summaryStats.highest.proposal.namaProgram, kpiWidth - 7),
      kpi1X + 3.5,
      cursorY + 19.2
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      truncateTextToWidth(
        doc,
        `${summaryStats.highest.proposal.kabupatenKota} · ${SEKTOR_SHORT_LABELS[summaryStats.highest.proposal.sektor]}`,
        kpiWidth - 7
      ),
      kpi1X + 3.5,
      cursorY + 24.2
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada paket usulan', kpi1X + 3.5, cursorY + 15);
  }

  // KPI 2: Lowest
  const kpi2X = drawKpiCardFrame(1, 'Skor RC Terendah');
  if (summaryStats.lowest) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...COLOR_AMBER_700);
    doc.text(`${summaryStats.lowest.rcPercentage}%`, kpi2X + 3.5, cursorY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      sanitizePdfText(summaryStats.lowest.proposal.kodeUsulan),
      kpi2X + kpiWidth - 3.5,
      cursorY + 13,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(
      truncateTextToWidth(doc, summaryStats.lowest.proposal.namaProgram, kpiWidth - 7),
      kpi2X + 3.5,
      cursorY + 19.2
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      truncateTextToWidth(
        doc,
        `${summaryStats.lowest.proposal.kabupatenKota} · ${SEKTOR_SHORT_LABELS[summaryStats.lowest.proposal.sektor]}`,
        kpiWidth - 7
      ),
      kpi2X + 3.5,
      cursorY + 24.2
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada paket usulan', kpi2X + 3.5, cursorY + 15);
  }

  // KPI 3: Infographic Counts by Readiness Tier (Siap, Proses, Kurang)
  const kpi3X = drawKpiCardFrame(2, 'Jumlah Usulan per Kesiapan');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLOR_SLATE_500);
  doc.text(`${summaryStats.totalCount} Paket`, kpi3X + kpiWidth - 3.5, cursorY + 5, {
    align: 'right',
  });

  const totalDist = Math.max(1, summaryStats.totalCount);
  const highShare =
    summaryStats.totalCount > 0
      ? Math.round((summaryStats.highCount / totalDist) * 100)
      : 0;
  const mediumShare =
    summaryStats.totalCount > 0
      ? Math.round((summaryStats.mediumCount / totalDist) * 100)
      : 0;
  const lowShare =
    summaryStats.totalCount > 0 ? Math.max(0, 100 - highShare - mediumShare) : 0;

  const kpi3BarW = kpiWidth - 7;
  const kpi3Rows: Array<{
    label: string;
    count: number;
    share: number;
    textColor: RgbTuple;
    barColor: RgbTuple;
    y: number;
  }> = [
    {
      label: 'Usulan yang Siap (>=80%)',
      count: summaryStats.highCount,
      share: highShare,
      textColor: COLOR_EMERALD_700,
      barColor: COLOR_EMERALD_600,
      y: cursorY + 10.2,
    },
    {
      label: 'Jumlah yang Proses (50-79%)',
      count: summaryStats.mediumCount,
      share: mediumShare,
      textColor: COLOR_BLUE_700,
      barColor: COLOR_BLUE_600,
      y: cursorY + 16.7,
    },
    {
      label: 'Jumlah yang Kurang (<50%)',
      count: summaryStats.lowCount,
      share: lowShare,
      textColor: COLOR_AMBER_700,
      barColor: COLOR_AMBER_500,
      y: cursorY + 23.2,
    },
  ];

  kpi3Rows.forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLOR_SLATE_700);
    doc.text(r.label, kpi3X + 3.5, r.y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...r.textColor);
    doc.text(`${r.count} Paket (${r.share}%)`, kpi3X + kpiWidth - 3.5, r.y, {
      align: 'right',
    });

    const trackY = r.y + 1.2;
    doc.setFillColor(...COLOR_SLATE_100);
    doc.roundedRect(kpi3X + 3.5, trackY, kpi3BarW, 1.7, 0.7, 0.7, 'F');

    if (r.count > 0) {
      const fillW = Math.max(2, (kpi3BarW * Math.max(4, r.share)) / 100);
      doc.setFillColor(...r.barColor);
      doc.roundedRect(kpi3X + 3.5, trackY, fillW, 1.7, 0.7, 0.7, 'F');
    }
  });

  cursorY += kpiHeight + 5;

  // Section 1 Header: Ranked Proposals Bar Chart
  const drawRankingSectionHeader = (y: number) => {
    doc.setFillColor(...COLOR_SLATE_100);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(marginX, y, contentWidth, 9, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_SLATE_900);
    const sortTitle =
      context.sortOrder === 'desc' ? 'Tertinggi - Terendah' : 'Terendah - Tertinggi';
    doc.text(
      `Grafik Peringkat Skor RC per Paket Usulan (${sortTitle})`,
      marginX + 3.5,
      y + 5.8
    );

    // Legend on right
    const legendItems: Array<{ label: string; color: RgbTuple }> = [
      { label: 'Siap (>=80%)', color: COLOR_EMERALD_600 },
      { label: 'Proses (50-79%)', color: COLOR_BLUE_600 },
      { label: 'Kurang (<50%)', color: COLOR_AMBER_500 },
    ];
    let lx = pageWidth - marginX - 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_700);
    doc.text('| Garis Ambang = 80%', lx, y + 5.8, { align: 'right' });
    lx -= doc.getTextWidth('| Garis Ambang = 80%') + 5;

    for (let i = legendItems.length - 1; i >= 0; i -= 1) {
      const leg = legendItems[i];
      const lw = doc.getTextWidth(leg.label);
      doc.setTextColor(...COLOR_SLATE_700);
      doc.text(leg.label, lx, y + 5.8, { align: 'right' });
      doc.setFillColor(...leg.color);
      doc.circle(lx - lw - 2.5, y + 4.8, 1.3, 'F');
      lx -= lw + 7;
    }

    return y + 11.5;
  };

  cursorY = drawRankingSectionHeader(cursorY);

  if (rankedItems.length === 0) {
    doc.setFillColor(...COLOR_WHITE);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(marginX, cursorY, contentWidth, 18, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      'Tidak ada paket usulan yang cocok dengan filter status, kesiapan, atau pencarian saat ini.',
      pageWidth / 2,
      cursorY + 10.5,
      { align: 'center' }
    );
    cursorY += 22;
  } else {
    const rowHeight = 16.5;
    rankedItems.forEach((item, idx) => {
      if (cursorY + rowHeight > maxContentY) {
        doc.addPage();
        cursorY = drawTopInstitutionalBanner(true);
        cursorY = drawRankingSectionHeader(cursorY);
      }

      const p = item.proposal;
      const tierMeta = getTierColors(item.rcPercentage);
      const rankNum = `#${String(idx + 1).padStart(2, '0')}`;

      // Row card container
      doc.setFillColor(...COLOR_WHITE);
      doc.setDrawColor(...COLOR_SLATE_200);
      doc.roundedRect(marginX, cursorY, contentWidth, rowHeight - 1.5, 1.3, 1.3, 'FD');

      // Rank badge
      const isTopThree = idx < 3 && context.sortOrder === 'desc';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...(isTopThree ? COLOR_BLUE_700 : COLOR_SLATE_400));
      doc.text(rankNum, marginX + 4, cursorY + 6);

      // Program Name & Subline
      const textStartX = marginX + 15;
      const rightBlockWidth = 42;
      const maxTitleWidth = contentWidth - 15 - rightBlockWidth - 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(...COLOR_SLATE_900);
      doc.text(truncateTextToWidth(doc, p.namaProgram, maxTitleWidth), textStartX, cursorY + 5.5);

      const subLine = `${p.kodeUsulan}  ·  ${SEKTOR_SHORT_LABELS[p.sektor]}  ·  ${p.kabupatenKota}  ·  ${formatRpMiliar(item.totalPagu)}  ·  ${item.statusDisplay}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...COLOR_SLATE_500);
      doc.text(truncateTextToWidth(doc, subLine, maxTitleWidth), textStartX, cursorY + 9.4);

      // Right Score & Tier
      const rightX = pageWidth - marginX - 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...tierMeta.text);
      doc.text(`${item.rcPercentage}%`, rightX, cursorY + 5.8, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...COLOR_SLATE_500);
      const criteriaNote = item.isManualScore
        ? `${tierMeta.label} · Manual`
        : `${tierMeta.label} · ${item.rcCompleted}/${item.rcTotal} RC`;
      doc.text(sanitizePdfText(criteriaNote), rightX, cursorY + 9.4, { align: 'right' });

      // Progress Bar Track + Fill + 80% Benchmark
      const barX = textStartX;
      const barY = cursorY + 11.2;
      const barW = contentWidth - 19;
      const barH = 2.4;

      doc.setFillColor(...COLOR_SLATE_100);
      doc.roundedRect(barX, barY, barW, barH, 0.9, 0.9, 'F');

      const fillPct = Math.max(1.5, Math.min(100, item.rcPercentage));
      const fillW = (barW * fillPct) / 100;
      doc.setFillColor(...tierMeta.bar);
      doc.roundedRect(barX, barY, fillW, barH, 0.9, 0.9, 'F');

      // 80% vertical threshold marker
      const thresholdX = barX + barW * 0.8;
      doc.setDrawColor(...COLOR_SLATE_700);
      doc.setLineWidth(0.35);
      doc.line(thresholdX, barY - 0.5, thresholdX, barY + barH + 0.5);
      doc.setLineWidth(0.2);

      cursorY += rowHeight;
    });
  }

  // Signature Block directly below Grafik Peringkat Skor RC per Paket Usulan
  const sigBoxHeight = 41;
  if (cursorY + sigBoxHeight + 2 > maxContentY) {
    doc.addPage();
    cursorY = drawTopInstitutionalBanner(true);
  } else {
    cursorY += 4;
  }

  doc.setFillColor(...COLOR_WHITE);
  doc.setDrawColor(...COLOR_SLATE_200);
  doc.roundedRect(marginX, cursorY, contentWidth, sigBoxHeight, 1.5, 1.5, 'FD');

  const leftCenterX = marginX + contentWidth * 0.25;
  const rightCenterX = marginX + contentWidth * 0.75;
  const sigColMaxW = contentWidth * 0.42;

  const sigConfig: PdfSignatoriesConfig = context.signatories ?? {
    tempatTanggal: '',
    mengesahkan: { jabatan: '', nama: '' },
    menyetujui: { jabatan: '', nama: '' },
  };

  const renderSignatureColumn = (
    centerX: number,
    headingLabel: string,
    topMeta: string,
    party: PdfSignatoryParty
  ) => {
    const cleanTop = sanitizePdfText(topMeta);
    if (cleanTop) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE_700);
      doc.text(truncateTextToWidth(doc, cleanTop, sigColMaxW), centerX, cursorY + 6.2, {
        align: 'center',
      });
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(headingLabel, centerX, cursorY + 10.8, { align: 'center' });

    const cleanJabatan = sanitizePdfText(party.jabatan);
    if (cleanJabatan) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(...COLOR_SLATE_700);
      const jabLines = doc.splitTextToSize(cleanJabatan, sigColMaxW).slice(0, 2) as string[];
      jabLines.forEach((line, lIdx) => {
        doc.text(line, centerX, cursorY + 15 + lIdx * 3.6, { align: 'center' });
      });
    }

    const cleanNama = sanitizePdfText(party.nama);
    const nameY = cursorY + 35.5;
    if (cleanNama) {
      const displayNama = truncateTextToWidth(doc, cleanNama, sigColMaxW);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_SLATE_900);
      doc.text(displayNama, centerX, nameY, { align: 'center' });

      const namaWidth = doc.getTextWidth(displayNama);
      doc.setDrawColor(...COLOR_SLATE_900);
      doc.setLineWidth(0.25);
      doc.line(centerX - namaWidth / 2, nameY + 0.9, centerX + namaWidth / 2, nameY + 0.9);
      doc.setLineWidth(0.2);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLOR_SLATE_400);
      doc.text('( ........................................ )', centerX, nameY, {
        align: 'center',
      });
    }
  };

  renderSignatureColumn(leftCenterX, 'Mengesahkan,', '', sigConfig.mengesahkan);
  renderSignatureColumn(
    rightCenterX,
    'Menyetujui,',
    sigConfig.tempatTanggal,
    sigConfig.menyetujui
  );

  cursorY += sigBoxHeight + 3;

  // Add running footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let pIdx = 1; pIdx <= totalPages; pIdx += 1) {
    doc.setPage(pIdx);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.line(marginX, footerLineY, pageWidth - marginX, footerLineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      'SIMPRA BPBPK NTB TA. 2027-2030 · Infografis Peringkat Skor Readiness Criteria (RC)',
      marginX,
      footerLineY + 4.5
    );
    doc.text(
      `Halaman ${pIdx} dari ${totalPages}`,
      pageWidth - marginX,
      footerLineY + 4.5,
      { align: 'right' }
    );
  }

  const slugDate = new Date().toISOString().slice(0, 10);
  const fileName = `infografis-skor-rc-${context.sortOrder}-${slugDate}.pdf`;
  return { doc, fileName };
}

export function createRcInfographicPdfPreview(
  rankedItems: PdfRankedProposalItem[],
  summaryStats: PdfSummaryStats,
  sectorAverages: PdfSectorAverage[],
  regionalAverages: PdfRegionalAverage[],
  context: PdfExportContext
): RcPdfPreviewPayload {
  const { doc, fileName } = buildRcInfographicPdfDoc(
    rankedItems,
    summaryStats,
    sectorAverages,
    regionalAverages,
    context
  );
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  return {
    blobUrl,
    fileName,
    pageCount: doc.getNumberOfPages(),
  };
}

export function exportRcInfographicPdf(
  rankedItems: PdfRankedProposalItem[],
  summaryStats: PdfSummaryStats,
  sectorAverages: PdfSectorAverage[],
  regionalAverages: PdfRegionalAverage[],
  context: PdfExportContext
): string {
  const { doc, fileName } = buildRcInfographicPdfDoc(
    rankedItems,
    summaryStats,
    sectorAverages,
    regionalAverages,
    context
  );
  doc.save(fileName);
  return fileName;
}
