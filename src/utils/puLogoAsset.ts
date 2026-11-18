export const PU_LOGO_SRC =
  '/assets/aistudio/Kementerian_Pekerjaan_Umum__PU__Logo_-_Colored_-_2048x2048_-_zonalogo.com_b5e7bb80.png';

export const PU_WORDMARK_SRC =
  '/assets/aistudio/Kementerian_Pekerjaan_Umum__PU__Logo_-_Colored_-_262x64_-_zonalogo.com_26294b0e.png';

export const PU_BATIK_SRC =
  '/assets/aistudio/WhatsApp-Image-2019-11-27-at-8.49.19-AM.jpeg__1__eda5fd50.webp';

export interface PuBatikPdfAssets {
  bannerDataUrl: string | null;
  stripDataUrl: string | null;
  watermarkDataUrl: string | null;
}

let cachedLogoDataUrl: string | null = null;
let inFlightLogoPromise: Promise<string | null> | null = null;

let cachedWordmarkDataUrl: string | null = null;
let inFlightWordmarkPromise: Promise<string | null> | null = null;

let cachedBatikAssets: PuBatikPdfAssets | null = null;
let inFlightBatikPromise: Promise<PuBatikPdfAssets> | null = null;

export function getCachedPuLogoDataUrl(): string | null {
  return cachedLogoDataUrl;
}

export function getCachedPuWordmarkDataUrl(): string | null {
  return cachedWordmarkDataUrl;
}

export function getCachedPuBatikAssets(): PuBatikPdfAssets | null {
  return cachedBatikAssets;
}

export async function loadPuLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  if (inFlightLogoPromise) return inFlightLogoPromise;

  inFlightLogoPromise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');
        cachedLogoDataUrl = dataUrl;
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = PU_LOGO_SRC;
  }).finally(() => {
    inFlightLogoPromise = null;
  });

  return inFlightLogoPromise;
}

export async function loadPuWordmarkDataUrl(): Promise<string | null> {
  if (cachedWordmarkDataUrl) return cachedWordmarkDataUrl;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  if (inFlightWordmarkPromise) return inFlightWordmarkPromise;

  inFlightWordmarkPromise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const targetW = 524;
        const ratio =
          img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 64 / 262;
        const targetH = Math.max(1, Math.round(targetW * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const dataUrl = canvas.toDataURL('image/png');
        cachedWordmarkDataUrl = dataUrl;
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = PU_WORDMARK_SRC;
  }).finally(() => {
    inFlightWordmarkPromise = null;
  });

  return inFlightWordmarkPromise;
}

export async function loadPuBatikAssets(): Promise<PuBatikPdfAssets> {
  if (cachedBatikAssets) return cachedBatikAssets;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { bannerDataUrl: null, stripDataUrl: null, watermarkDataUrl: null };
  }
  if (inFlightBatikPromise) return inFlightBatikPromise;

  inFlightBatikPromise = new Promise<PuBatikPdfAssets>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || 900;
        const naturalH = img.naturalHeight || 960;
        const aspect = naturalH / naturalW;

        // 1. Deep Navy Gradient + Batik PU Banner (for dark institutional PDF headers)
        const bannerW = 1120;
        const bannerH = 140;
        const bannerCanvas = document.createElement('canvas');
        bannerCanvas.width = bannerW;
        bannerCanvas.height = bannerH;
        const bCtx = bannerCanvas.getContext('2d');
        let bannerDataUrl: string | null = null;
        if (bCtx) {
          bCtx.fillStyle = '#061459';
          bCtx.fillRect(0, 0, bannerW, bannerH);
          const tileW = 280;
          const tileH = Math.max(bannerH, Math.round(tileW * aspect));
          const yOffset = -Math.round((tileH - bannerH) * 0.14);
          for (let x = 0; x < bannerW; x += tileW) {
            bCtx.drawImage(img, x, yOffset, tileW, tileH);
          }
          const grad = bCtx.createLinearGradient(0, 0, bannerW, 0);
          grad.addColorStop(0, 'rgba(6, 20, 89, 0.88)');
          grad.addColorStop(0.55, 'rgba(8, 28, 108, 0.72)');
          grad.addColorStop(1, 'rgba(6, 20, 89, 0.84)');
          bCtx.fillStyle = grad;
          bCtx.fillRect(0, 0, bannerW, bannerH);
          bannerDataUrl = bannerCanvas.toDataURL('image/jpeg', 0.9);
        }

        // 2. Vivid Ornamental Batik PU Ribbon Strip (for top/bottom page borders)
        const stripW = 1120;
        const stripH = 40;
        const stripCanvas = document.createElement('canvas');
        stripCanvas.width = stripW;
        stripCanvas.height = stripH;
        const sCtx = stripCanvas.getContext('2d');
        let stripDataUrl: string | null = null;
        if (sCtx) {
          sCtx.fillStyle = '#061459';
          sCtx.fillRect(0, 0, stripW, stripH);
          const sTileW = 224;
          const sTileH = Math.max(stripH, Math.round(sTileW * aspect));
          const sYOffset = -Math.round((sTileH - stripH) * 0.18);
          for (let x = 0; x < stripW; x += sTileW) {
            sCtx.drawImage(img, x, sYOffset, sTileW, sTileH);
          }
          sCtx.fillStyle = 'rgba(6, 20, 89, 0.14)';
          sCtx.fillRect(0, 0, stripW, stripH);
          stripDataUrl = stripCanvas.toDataURL('image/jpeg', 0.9);
        }

        // 3. Soft White-Washed Batik PU Paper Watermark (A4 Landscape 297:210)
        const wmW = 1188;
        const wmH = 840;
        const wmCanvas = document.createElement('canvas');
        wmCanvas.width = wmW;
        wmCanvas.height = wmH;
        const wCtx = wmCanvas.getContext('2d');
        let watermarkDataUrl: string | null = null;
        if (wCtx) {
          wCtx.fillStyle = '#ffffff';
          wCtx.fillRect(0, 0, wmW, wmH);
          wCtx.save();
          wCtx.globalAlpha = 0.055;
          const wTileW = 240;
          const wTileH = Math.max(200, Math.round(wTileW * aspect));
          for (let y = 0; y < wmH; y += wTileH) {
            for (let x = 0; x < wmW; x += wTileW) {
              wCtx.drawImage(img, x, y, wTileW, wTileH);
            }
          }
          wCtx.restore();
          watermarkDataUrl = wmCanvas.toDataURL('image/jpeg', 0.84);
        }

        const assets: PuBatikPdfAssets = {
          bannerDataUrl,
          stripDataUrl,
          watermarkDataUrl,
        };
        cachedBatikAssets = assets;
        resolve(assets);
      } catch {
        resolve({ bannerDataUrl: null, stripDataUrl: null, watermarkDataUrl: null });
      }
    };
    img.onerror = () => {
      resolve({ bannerDataUrl: null, stripDataUrl: null, watermarkDataUrl: null });
    };
    img.src = PU_BATIK_SRC;
  }).finally(() => {
    inFlightBatikPromise = null;
  });

  return inFlightBatikPromise;
}
