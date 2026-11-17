export const PU_LOGO_SRC =
  '/assets/aistudio/Kementerian_Pekerjaan_Umum__PU__Logo_-_Colored_-_2048x2048_-_zonalogo.com_b5e7bb80.png';

export const PU_WORDMARK_SRC =
  '/assets/aistudio/Kementerian_Pekerjaan_Umum__PU__Logo_-_Colored_-_262x64_-_zonalogo.com_26294b0e.png';

let cachedLogoDataUrl: string | null = null;
let inFlightLogoPromise: Promise<string | null> | null = null;

let cachedWordmarkDataUrl: string | null = null;
let inFlightWordmarkPromise: Promise<string | null> | null = null;

export function getCachedPuLogoDataUrl(): string | null {
  return cachedLogoDataUrl;
}

export function getCachedPuWordmarkDataUrl(): string | null {
  return cachedWordmarkDataUrl;
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
