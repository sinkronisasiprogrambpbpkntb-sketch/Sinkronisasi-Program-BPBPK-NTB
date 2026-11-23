import { jsPDF } from 'jspdf';
import { GuideSection, TECHNICAL_GUIDE_SECTIONS } from '../data/technicalGuideContent';
import {
  getCachedPuBatikAssets,
  getCachedPuWordmarkDataUrl,
  PuBatikPdfAssets,
} from './puLogoAsset';

type RgbTuple = [number, number, number];

const PU_NAVY: RgbTuple = [6, 20, 89];
const PU_GOLD: RgbTuple = [232, 150, 17];
const PU_TINT: RgbTuple = [238, 242, 250];
const PU_BORDER: RgbTuple = [199, 211, 232];
const STEEL_SUBTITLE: RgbTuple = [71, 102, 145];
const SLATE_500: RgbTuple = [100, 116, 139];
const SLATE_700: RgbTuple = [51, 65, 85];
const SLATE_900: RgbTuple = [15, 23, 42];
const EMERALD_700: RgbTuple = [4, 120, 87];
const WHITE: RgbTuple = [255, 255, 255];

function sanitizePdfText(value: string): string {
  return value
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadSingleImageAsJpegDataUrl(url: string): Promise<string | null> {
  if (typeof window === 'undefined' || !url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const targetW = 960;
        const targetH = 540;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function loadGuideImageDataUrls(
  sections: GuideSection[]
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    sections.map(async (sec) => {
      const dataUrl = await loadSingleImageAsJpegDataUrl(sec.imageUrl);
      return [sec.id, dataUrl] as const;
    })
  );
  const result: Record<string, string> = {};
  entries.forEach(([id, dataUrl]) => {
    if (dataUrl) result[id] = dataUrl;
  });
  return result;
}

function drawBatikPageChrome(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  batikAssets: PuBatikPdfAssets | null
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
      doc.setFillColor(246, 248, 253);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  } else {
    doc.setFillColor(246, 248, 253);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
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

export function exportTechnicalGuidePdf(options?: {
  wordmarkDataUrl?: string | null;
  batikAssets?: PuBatikPdfAssets | null;
  sectionImages?: Record<string, string>;
}): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186
  const maxContentY = pageHeight - 14;
  const batikAssets = options?.batikAssets ?? getCachedPuBatikAssets();
  const wordmarkDataUrl = options?.wordmarkDataUrl ?? getCachedPuWordmarkDataUrl();
  const sectionImages = options?.sectionImages ?? {};

  const drawTopHeader = (isFirstPage: boolean) => {
    drawBatikPageChrome(doc, pageWidth, pageHeight, batikAssets);
    const headerY = 6;
    const headerH = isFirstPage ? 19 : 14;

    doc.setFillColor(...WHITE);
    doc.setDrawColor(...PU_BORDER);
    doc.setLineWidth(0.28);
    doc.roundedRect(marginX, headerY, contentWidth, headerH, 2, 2, 'FD');

    doc.setFillColor(...PU_NAVY);
    doc.rect(marginX + 1.8, headerY + 1.8, 2.0, headerH - 3.6, 'F');
    doc.setFillColor(...PU_GOLD);
    doc.rect(marginX + 3.8, headerY + 1.8, 2.0, headerH - 3.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 11.5 : 9.5);
    doc.setTextColor(...PU_NAVY);
    doc.text(
      'PETUNJUK TEKNIS PENGGUNAAN WEB APP',
      marginX + 8.5,
      headerY + (isFirstPage ? 7.2 : 6.0)
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 8.2 : 7.3);
    doc.setTextColor(...STEEL_SUBTITLE);
    doc.text(
      'SIMPRA BPBPK Nusa Tenggara Barat TA. 2027-2030 | Sinkronisasi Program Cipta Karya',
      marginX + 8.5,
      headerY + (isFirstPage ? 12.2 : 10.4)
    );

    if (isFirstPage) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.9);
      doc.setTextColor(...SLATE_500);
      doc.text(
        'Panduan Operasional Bergambar: Matriks Usulan, Verifikasi RC, Spasial GIS, Profil Usulan & Ekspor PDF',
        marginX + 8.5,
        headerY + 16.4
      );
    }

    if (wordmarkDataUrl && wordmarkDataUrl.startsWith('data:image/')) {
      try {
        const logoH = isFirstPage ? 10.5 : 8.5;
        const logoW = logoH * (262 / 64);
        doc.addImage(
          wordmarkDataUrl,
          'PNG',
          pageWidth - marginX - logoW - 3,
          headerY + (headerH - logoH) / 2,
          logoW,
          logoH,
          undefined,
          'FAST'
        );
      } catch {
        // Ignore logo draw error
      }
    }

    return headerY + headerH + 4.5;
  };

  let cursorY = drawTopHeader(true);

  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > maxContentY) {
      doc.addPage();
      cursorY = drawTopHeader(false);
    }
  };

  TECHNICAL_GUIDE_SECTIONS.forEach((section) => {
    const summaryLines = doc.splitTextToSize(
      sanitizePdfText(section.summary),
      contentWidth - 8
    ) as string[];
    const sectionHeaderH = 8.2;
    const summaryH = summaryLines.length * 3.6 + 5;

    ensureSpace(sectionHeaderH + summaryH + 16);

    // Section Banner
    doc.setFillColor(...PU_NAVY);
    doc.setDrawColor(...PU_BORDER);
    doc.roundedRect(marginX, cursorY, contentWidth, sectionHeaderH, 1.5, 1.5, 'FD');
    doc.setFillColor(...PU_GOLD);
    doc.rect(marginX + 1, cursorY + sectionHeaderH - 0.8, contentWidth - 2, 0.8, 'F');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...PU_GOLD);
    doc.text(`BAB ${section.number}`, marginX + 3.5, cursorY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...WHITE);
    doc.text(sanitizePdfText(section.title), marginX + 19, cursorY + 5.2);

    cursorY += sectionHeaderH + 1.5;

    // Summary Box
    doc.setFillColor(...PU_TINT);
    doc.setDrawColor(...PU_BORDER);
    doc.roundedRect(marginX, cursorY, contentWidth, summaryH, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...SLATE_700);
    summaryLines.forEach((line, idx) => {
      doc.text(line, marginX + 4, cursorY + 4.2 + idx * 3.6);
    });
    cursorY += summaryH + 2.5;

    // Chapter Illustration Figure (if preloaded)
    const imgDataUrl = sectionImages[section.id];
    if (imgDataUrl && imgDataUrl.startsWith('data:image/')) {
      const figW = 144; // centered 16:9 figure inside 186mm content area
      const figH = figW * (9 / 16); // 81mm
      const figX = marginX + (contentWidth - figW) / 2;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.9);
      const capLines = doc.splitTextToSize(
        sanitizePdfText(section.imageCaption),
        contentWidth - 8
      ) as string[];
      const figFrameH = figH + 3.5 + capLines.length * 3.2 + 2.5;

      ensureSpace(figFrameH + 2.5);

      doc.setFillColor(...WHITE);
      doc.setDrawColor(...PU_BORDER);
      doc.roundedRect(marginX, cursorY, contentWidth, figFrameH, 1.4, 1.4, 'FD');

      try {
        doc.addImage(imgDataUrl, 'JPEG', figX, cursorY + 2.0, figW, figH, undefined, 'FAST');
        doc.setDrawColor(...PU_BORDER);
        doc.setLineWidth(0.2);
        doc.rect(figX, cursorY + 2.0, figW, figH);
      } catch {
        // Ignore image draw failure
      }

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.9);
      doc.setTextColor(...SLATE_500);
      capLines.forEach((line, idx) => {
        doc.text(line, pageWidth / 2, cursorY + 2.0 + figH + 4.0 + idx * 3.2, {
          align: 'center',
        });
      });

      cursorY += figFrameH + 2.6;
    }

    // Numbered Steps
    section.steps.forEach((step, sIdx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.7);
      const titleText = sanitizePdfText(`${sIdx + 1}. ${step.title}`);
      const titleLines = doc.splitTextToSize(titleText, contentWidth - 8) as string[];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const detailLines = doc.splitTextToSize(
        sanitizePdfText(step.detail),
        contentWidth - 11
      ) as string[];

      const boxH = titleLines.length * 3.6 + detailLines.length * 3.4 + 4.8;
      ensureSpace(boxH + 2.0);

      doc.setFillColor(...WHITE);
      doc.setDrawColor(...PU_BORDER);
      doc.roundedRect(marginX, cursorY, contentWidth, boxH, 1.2, 1.2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.7);
      doc.setTextColor(...PU_NAVY);
      titleLines.forEach((line, i) => {
        doc.text(line, marginX + 3.5, cursorY + 4.2 + i * 3.6);
      });

      const detailStartY = cursorY + 4.2 + titleLines.length * 3.6 + 0.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...SLATE_900);
      detailLines.forEach((line, i) => {
        doc.text(line, marginX + 6.5, detailStartY + i * 3.4);
      });

      cursorY += boxH + 1.8;
    });

    // Tips Box
    if (section.tips && section.tips.length > 0) {
      section.tips.forEach((tip) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.0);
        const tipLines = doc.splitTextToSize(
          sanitizePdfText(`Tips: ${tip}`),
          contentWidth - 8
        ) as string[];
        const tipH = tipLines.length * 3.3 + 3.6;
        ensureSpace(tipH + 2.0);

        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(marginX, cursorY, contentWidth, tipH, 1.0, 1.0, 'FD');
        doc.setTextColor(...EMERALD_700);
        tipLines.forEach((line, i) => {
          doc.text(line, marginX + 3.5, cursorY + 3.6 + i * 3.3);
        });
        cursorY += tipH + 2.0;
      });
    }

    cursorY += 3.5;
  });

  const totalPages = doc.getNumberOfPages();
  const footerY = pageHeight - 5.2;
  const printDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...PU_BORDER);
    doc.setLineWidth(0.2);
    doc.line(marginX, footerY - 2.8, pageWidth - marginX, footerY - 2.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...SLATE_500);
    doc.text(
      sanitizePdfText('SIMPRA BPBPK NTB TA. 2027-2030 | Petunjuk Teknis Penggunaan Web App'),
      marginX,
      footerY
    );
    doc.text(
      sanitizePdfText(`Dicetak: ${printDate} | Halaman ${p} dari ${totalPages}`),
      pageWidth - marginX,
      footerY,
      { align: 'right' }
    );
  }

  const fileName = 'Petunjuk-Teknis-SIMPRA-BPBPK-NTB-2027-2030.pdf';
  doc.save(fileName);
  return fileName;
}
