import { jsPDF } from 'jspdf';
import { formatRpMiliar, SEKTOR_SHORT_LABELS } from '../data/initialProposals';
import { SektorCiptaKarya, UsulanProgram } from '../types/ciptaKarya';

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

export interface PdfExportContext {
  yearFilterLabel: string;
  sortOrder: 'desc' | 'asc';
  tierFilterLabel: string;
  statusFilterLabel: string;
  searchQuery: string;
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

export function exportRcInfographicPdf(
  rankedItems: PdfRankedProposalItem[],
  summaryStats: PdfSummaryStats,
  sectorAverages: PdfSectorAverage[],
  regionalAverages: PdfRegionalAverage[],
  context: PdfExportContext
): string {
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

  const drawTopInstitutionalBanner = (isContinuation: boolean) => {
    const bannerHeight = isContinuation ? 13 : 21;
    doc.setFillColor(...COLOR_SLATE_900);
    doc.rect(marginX, 10, contentWidth, bannerHeight, 'F');
    doc.setFillColor(...COLOR_BLUE_700);
    doc.rect(marginX, 10, 2.5, bannerHeight, 'F');

    doc.setTextColor(...COLOR_WHITE);
    if (isContinuation) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(
        'INFOGRAFIS PERINGKAT SKOR READINESS CRITERIA (RC) - LANJUTAN',
        marginX + 6,
        18
      );
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        sanitizePdfText(`SIMPRA BPBPK NTB · ${context.yearFilterLabel} · Dicetak: ${printTimestamp}`),
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
      marginX + 6,
      15.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_WHITE);
    doc.text(
      'INFOGRAFIS PERINGKAT SKOR READINESS CRITERIA (RC)',
      marginX + 6,
      22.5
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

  // 4-Column KPI Summary Row
  const kpiGap = 3.5;
  const kpiWidth = (contentWidth - kpiGap * 3) / 4;
  const kpiHeight = 25;

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
    doc.text(`${summaryStats.highest.rcPercentage}%`, kpi1X + 3.5, cursorY + 12.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      sanitizePdfText(summaryStats.highest.proposal.kodeUsulan),
      kpi1X + kpiWidth - 3.5,
      cursorY + 12.2,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(
      truncateTextToWidth(doc, summaryStats.highest.proposal.namaProgram, kpiWidth - 7),
      kpi1X + 3.5,
      cursorY + 17.5
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
      cursorY + 22
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada paket usulan', kpi1X + 3.5, cursorY + 14);
  }

  // KPI 2: Lowest
  const kpi2X = drawKpiCardFrame(1, 'Skor RC Terendah');
  if (summaryStats.lowest) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...COLOR_AMBER_700);
    doc.text(`${summaryStats.lowest.rcPercentage}%`, kpi2X + 3.5, cursorY + 12.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      sanitizePdfText(summaryStats.lowest.proposal.kodeUsulan),
      kpi2X + kpiWidth - 3.5,
      cursorY + 12.2,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(
      truncateTextToWidth(doc, summaryStats.lowest.proposal.namaProgram, kpiWidth - 7),
      kpi2X + 3.5,
      cursorY + 17.5
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
      cursorY + 22
    );
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada paket usulan', kpi2X + 3.5, cursorY + 14);
  }

  // KPI 3: Average
  const kpi3X = drawKpiCardFrame(2, 'Rata-Rata Skor RC');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_SLATE_900);
  doc.text(`${summaryStats.averagePct}%`, kpi3X + 3.5, cursorY + 12.5);

  const avgBarW = kpiWidth - 7;
  doc.setFillColor(...COLOR_SLATE_100);
  doc.roundedRect(kpi3X + 3.5, cursorY + 15.2, avgBarW, 2.5, 1, 1, 'F');
  if (summaryStats.averagePct > 0) {
    doc.setFillColor(...COLOR_BLUE_700);
    doc.roundedRect(
      kpi3X + 3.5,
      cursorY + 15.2,
      Math.max(2, (avgBarW * Math.min(100, summaryStats.averagePct)) / 100),
      2.5,
      1,
      1,
      'F'
    );
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_SLATE_500);
  doc.text('Ambang siap lelang optimal: >= 80%', kpi3X + 3.5, cursorY + 22);

  // KPI 4: Readiness Distribution
  const kpi4X = drawKpiCardFrame(3, 'Sebaran Tingkat Kesiapan');
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

  const distBarW = kpiWidth - 7;
  const distBarY = cursorY + 9.5;
  doc.setFillColor(...COLOR_SLATE_100);
  doc.rect(kpi4X + 3.5, distBarY, distBarW, 3.2, 'F');

  let segX = kpi4X + 3.5;
  if (summaryStats.totalCount > 0) {
    const highW = (distBarW * highShare) / 100;
    const medW = (distBarW * mediumShare) / 100;
    const lowW = Math.max(0, distBarW - highW - medW);
    if (highW > 0) {
      doc.setFillColor(...COLOR_EMERALD_600);
      doc.rect(segX, distBarY, highW, 3.2, 'F');
      segX += highW;
    }
    if (medW > 0) {
      doc.setFillColor(...COLOR_BLUE_600);
      doc.rect(segX, distBarY, medW, 3.2, 'F');
      segX += medW;
    }
    if (lowW > 0 && summaryStats.lowCount > 0) {
      doc.setFillColor(...COLOR_AMBER_500);
      doc.rect(segX, distBarY, lowW, 3.2, 'F');
    }
  }

  const colW3 = distBarW / 3;
  const distStats: Array<{ val: string; label: string; color: RgbTuple }> = [
    {
      val: `${summaryStats.highCount} (${highShare}%)`,
      label: 'Siap >=80%',
      color: COLOR_EMERALD_700,
    },
    {
      val: `${summaryStats.mediumCount} (${mediumShare}%)`,
      label: 'Proses 50-79%',
      color: COLOR_BLUE_700,
    },
    {
      val: `${summaryStats.lowCount} (${lowShare}%)`,
      label: 'Kurang <50%',
      color: COLOR_AMBER_700,
    },
  ];
  distStats.forEach((ds, idx) => {
    const dx = kpi4X + 3.5 + idx * colW3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...ds.color);
    doc.text(ds.val, dx, cursorY + 17.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(ds.label, dx, cursorY + 21.8);
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

  // Section 2: Sector & Regional Summary Panels (side-by-side)
  const sectorPanelHeight = 16 + sectorAverages.length * 10.5;
  const regPanelHeight = 16 + Math.max(1, regionalAverages.length) * 9.5;
  const summarySectionHeight = Math.max(sectorPanelHeight, regPanelHeight);

  if (cursorY + 8 > maxContentY || cursorY + Math.min(48, summarySectionHeight) > maxContentY) {
    doc.addPage();
    cursorY = drawTopInstitutionalBanner(true);
  } else {
    cursorY += 3;
  }

  const colGap = 5;
  const panelWidth = (contentWidth - colGap) / 2;
  const leftPanelX = marginX;
  const rightPanelX = marginX + panelWidth + colGap;

  // Draw Left Panel Header: Rata-Rata Skor RC per Sektor
  const drawPanelBoxHeader = (px: number, py: number, title: string, subtitle: string) => {
    doc.setFillColor(...COLOR_SLATE_100);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(px, py, panelWidth, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(sanitizePdfText(title), px + 3.5, py + 5.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(sanitizePdfText(subtitle), px + 3.5, py + 9.5);
    return py + 14;
  };

  // Since regional list can be up to 10 Kabupaten/Kota, paginate cleanly if needed
  let leftY = drawPanelBoxHeader(
    leftPanelX,
    cursorY,
    'Rata-Rata Skor RC per Sektor',
    'Perbandingan tingkat kesiapan teknis antar bidang Cipta Karya'
  );
  let rightY = drawPanelBoxHeader(
    rightPanelX,
    cursorY,
    'Peringkat Skor RC per Kabupaten/Kota',
    'Rata-rata skor kesiapan wilayah pengusul di NTB'
  );

  const sectorStartPage = doc.getCurrentPageInfo().pageNumber;

  sectorAverages.forEach((sec) => {
    if (leftY + 10 > maxContentY) {
      doc.addPage();
      leftY = drawTopInstitutionalBanner(true);
      leftY = drawPanelBoxHeader(
        leftPanelX,
        leftY,
        'Rata-Rata Skor RC per Sektor (Lanjutan)',
        'Perbandingan tingkat kesiapan teknis antar bidang Cipta Karya'
      );
    }

    const meta = getTierColors(sec.avgPct);
    const innerW = panelWidth - 7;

    doc.setFillColor(...COLOR_WHITE);
    doc.setDrawColor(...COLOR_SLATE_200);
    doc.roundedRect(leftPanelX, leftY, panelWidth, 9.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...COLOR_SLATE_900);
    doc.text(truncateTextToWidth(doc, sec.shortLabel, innerW - 22), leftPanelX + 3.5, leftY + 4);

    doc.setTextColor(...meta.text);
    doc.text(`${sec.avgPct}%`, leftPanelX + panelWidth - 3.5, leftY + 4, { align: 'right' });

    // Bar
    doc.setFillColor(...COLOR_SLATE_100);
    doc.roundedRect(leftPanelX + 3.5, leftY + 5.2, innerW, 1.6, 0.7, 0.7, 'F');
    if (sec.count > 0) {
      doc.setFillColor(...meta.bar);
      doc.roundedRect(
        leftPanelX + 3.5,
        leftY + 5.2,
        Math.max(2, (innerW * Math.max(3, sec.avgPct)) / 100),
        1.6,
        0.7,
        0.7,
        'F'
      );
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SLATE_500);
    doc.text(
      sanitizePdfText(`${sec.count} paket · ${formatRpMiliar(sec.totalPagu)}`),
      leftPanelX + 3.5,
      leftY + 8.6
    );
    if (sec.count > 0) {
      doc.text(
        sanitizePdfText(`${sec.minPct}%-${sec.maxPct}%`),
        leftPanelX + panelWidth - 3.5,
        leftY + 8.6,
        { align: 'right' }
      );
    }

    leftY += 10.5;
  });

  // Return to sectorStartPage for right column so both columns align side-by-side
  doc.setPage(sectorStartPage);
  let rightPage = sectorStartPage;

  if (regionalAverages.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE_400);
    doc.text('Belum ada data wilayah pengusul.', rightPanelX + 3.5, rightY + 6);
  } else {
    regionalAverages.forEach((reg, idx) => {
      if (rightY + 9.5 > maxContentY) {
        const nextPageNum = rightPage + 1;
        if (nextPageNum <= doc.getNumberOfPages()) {
          doc.setPage(nextPageNum);
          rightY = 27;
        } else {
          doc.addPage();
          rightY = drawTopInstitutionalBanner(true);
        }
        rightPage = doc.getCurrentPageInfo().pageNumber;
        rightY = drawPanelBoxHeader(
          rightPanelX,
          rightY,
          'Peringkat Skor RC per Kabupaten/Kota (Lanjutan)',
          'Rata-rata skor kesiapan wilayah pengusul di NTB'
        );
      }

      const meta = getTierColors(reg.avgPct);
      const innerW = panelWidth - 7;

      doc.setFillColor(...COLOR_WHITE);
      doc.setDrawColor(...COLOR_SLATE_200);
      doc.roundedRect(rightPanelX, rightY, panelWidth, 8.8, 1.2, 1.2, 'FD');

      const kabTitle = `${String(idx + 1).padStart(2, '0')}. ${reg.kabupaten}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE_900);
      doc.text(truncateTextToWidth(doc, kabTitle, innerW - 42), rightPanelX + 3.5, rightY + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      doc.setTextColor(...COLOR_SLATE_500);
      doc.text(
        sanitizePdfText(`${reg.count} paket · ${formatRpMiliar(reg.totalPagu)}`),
        rightPanelX + panelWidth - 16,
        rightY + 3.8,
        { align: 'right' }
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(...meta.text);
      doc.text(`${reg.avgPct}%`, rightPanelX + panelWidth - 3.5, rightY + 3.8, { align: 'right' });

      // Bar
      doc.setFillColor(...COLOR_SLATE_100);
      doc.roundedRect(rightPanelX + 3.5, rightY + 5.2, innerW, 1.6, 0.7, 0.7, 'F');
      doc.setFillColor(...meta.bar);
      doc.roundedRect(
        rightPanelX + 3.5,
        rightY + 5.2,
        Math.max(2, (innerW * Math.max(3, reg.avgPct)) / 100),
        1.6,
        0.7,
        0.7,
        'F'
      );

      rightY += 9.7;
    });
  }

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
  doc.save(fileName);
  return fileName;
}
