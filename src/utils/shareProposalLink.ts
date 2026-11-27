import { WorkspaceView } from '../types/ciptaKarya';

export interface HostShareOriginInfo {
  currentOrigin: string;
  sharedOrigin: string;
  isDevHost: boolean;
}

export function getShareHostInfo(): HostShareOriginInfo {
  if (typeof window === 'undefined') {
    return { currentOrigin: '', sharedOrigin: '', isDevHost: false };
  }
  const { protocol, hostname, port, origin } = window.location;
  const isDevHost = hostname.startsWith('ais-dev-');
  const sharedHostname = isDevHost ? hostname.replace(/^ais-dev-/, 'ais-pre-') : hostname;
  const sharedOrigin = `${protocol}//${sharedHostname}${port ? `:${port}` : ''}`;
  return {
    currentOrigin: origin,
    sharedOrigin,
    isDevHost,
  };
}

export function buildProposalProfileShareUrl(
  proposalId: string,
  options?: {
    preferSharedHost?: boolean;
    mode?: 'lihat' | 'edit';
    format?: 'pdf' | 'sheet';
  }
): string {
  if (typeof window === 'undefined') return '';
  const hostInfo = getShareHostInfo();
  const preferShared = options?.preferSharedHost ?? true;
  const baseOrigin =
    hostInfo.isDevHost && preferShared ? hostInfo.sharedOrigin : hostInfo.currentOrigin;

  const url = new URL(window.location.pathname || '/', baseOrigin);
  if ((options?.mode ?? 'lihat') === 'lihat') {
    url.searchParams.set('mode', 'lihat');
  }
  url.searchParams.set('view', WorkspaceView.MATRIX);
  url.searchParams.set('profil', proposalId);
  if ((options?.format ?? 'pdf') === 'pdf') {
    url.searchParams.set('format', 'pdf');
  }
  return url.toString();
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      tempInput.style.position = 'fixed';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(tempInput);
      return copied;
    } catch {
      return false;
    }
  }
}
