import { useCallback, useEffect, useRef, useState } from 'react';
import { LatLngPoint, ResolvedPlaceInfo, UsulanProgram } from '../types/ciptaKarya';

const CACHE_STORAGE_KEY = 'simpra_ntb_osm_places_cache_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CachedPlaceEntry {
  info: ResolvedPlaceInfo;
  cachedAtMs: number;
}

type PlaceCacheMap = Record<string, CachedPlaceEntry>;

interface GazetteerEntry {
  id: string;
  keywords: string[];
  displayName: string;
  formattedAddress: string;
  position: LatLngPoint;
  bounds?: [[number, number], [number, number]];
}

// Referensi koordinat wilayah Kabupaten/Kota & Kecamatan strategis Provinsi Nusa Tenggara Barat
const NTB_GAZETTEER: GazetteerEntry[] = [
  {
    id: 'ntb-mataram',
    keywords: ['kota mataram', 'mataram raya', 'mataram', 'ampenan', 'cakranegara', 'sekarbela', 'selaparang', 'sandubaya'],
    displayName: 'Kota Mataram',
    formattedAddress: 'Kota Mataram, Nusa Tenggara Barat',
    position: { lat: -8.5833, lng: 116.1167 },
  },
  {
    id: 'ntb-gerung',
    keywords: ['gerung', 'lembar', 'pelabuhan lembar'],
    displayName: 'Kec. Gerung & Lembar',
    formattedAddress: 'Gerung, Kabupaten Lombok Barat, Nusa Tenggara Barat',
    position: { lat: -8.6869, lng: 116.1228 },
  },
  {
    id: 'ntb-labuapi',
    keywords: ['labuapi', 'kebon kongok', 'gunungsari', 'kediri', 'narmada', 'lingsar', 'senggigi', 'batulayar', 'sekotong', 'kuripan', 'lombok barat'],
    displayName: 'Kec. Labuapi, Lombok Barat',
    formattedAddress: 'Labuapi, Kabupaten Lombok Barat, Nusa Tenggara Barat',
    position: { lat: -8.6364, lng: 116.1122 },
  },
  {
    id: 'ntb-batujai',
    keywords: ['batujai', 'praya barat', 'bandara zainuddin abdul madjid', 'bil'],
    displayName: 'Kawasan Batujai, Praya Barat',
    formattedAddress: 'Batujai, Kec. Praya Barat, Kabupaten Lombok Tengah, Nusa Tenggara Barat',
    position: { lat: -8.7425, lng: 116.2456 },
  },
  {
    id: 'ntb-mandalika',
    keywords: ['mandalika', 'kuta mandalika', 'pujut'],
    displayName: 'Kawasan Mandalika & Pujut',
    formattedAddress: 'Pujut, Kabupaten Lombok Tengah, Nusa Tenggara Barat',
    position: { lat: -8.8953, lng: 116.2825 },
  },
  {
    id: 'ntb-praya',
    keywords: ['praya', 'kopang', 'jonggat', 'janapria', 'praya tengah', 'praya timur', 'batukliang', 'lombok tengah'],
    displayName: 'Kec. Praya, Lombok Tengah',
    formattedAddress: 'Praya, Kabupaten Lombok Tengah, Nusa Tenggara Barat',
    position: { lat: -8.7053, lng: 116.2704 },
  },
  {
    id: 'ntb-selong',
    keywords: ['selong', 'tanjung luar', 'keruak', 'labuhan haji', 'masbagik', 'aikmel', 'praya timur', 'pringgabaya', 'sembalun', 'jerowaru', 'sakre', 'lombok timur'],
    displayName: 'Kec. Selong & Tanjung Luar',
    formattedAddress: 'Selong, Kabupaten Lombok Timur, Nusa Tenggara Barat',
    position: { lat: -8.6508, lng: 116.5364 },
  },
  {
    id: 'ntb-tanjung',
    keywords: ['tanjung', 'pemenang', 'gangga', 'bayan', 'kayangan', 'lombok utara'],
    displayName: 'Kec. Tanjung & Pemenang',
    formattedAddress: 'Tanjung, Kabupaten Lombok Utara, Nusa Tenggara Barat',
    position: { lat: -8.3524, lng: 116.1538 },
  },
  {
    id: 'ntb-taliwang',
    keywords: ['taliwang', 'maluk', 'poto tano', 'seteluk', 'jereweh', 'brang rea', 'sekongkang', 'sumbawa barat'],
    displayName: 'Kec. Taliwang, Sumbawa Barat',
    formattedAddress: 'Taliwang, Kabupaten Sumbawa Barat, Nusa Tenggara Barat',
    position: { lat: -8.7486, lng: 116.8528 },
  },
  {
    id: 'ntb-sumbawa',
    keywords: ['sumbawa besar', 'seketeng', 'unter iwes', 'labuhan badas', 'alas', 'empang', 'plampang', 'moyo', 'lape', 'kabupaten sumbawa', 'kab. sumbawa'],
    displayName: 'Kec. Sumbawa Besar',
    formattedAddress: 'Sumbawa Besar, Kabupaten Sumbawa, Nusa Tenggara Barat',
    position: { lat: -8.4932, lng: 117.4203 },
  },
  {
    id: 'ntb-dompu',
    keywords: ['dompu', 'woja', 'pajo', 'huu', 'kempo', 'manggelewa', 'pekate', 'kilo', 'kabupaten dompu', 'kab. dompu'],
    displayName: 'Kec. Dompu & Woja',
    formattedAddress: 'Dompu, Kabupaten Dompu, Nusa Tenggara Barat',
    position: { lat: -8.5361, lng: 118.4633 },
  },
  {
    id: 'ntb-kota-bima',
    keywords: ['kota bima', 'rasanae barat', 'rasanae timur', 'mpunda', 'asakota', 'raba', 'teluk bima'],
    displayName: 'Kota Bima',
    formattedAddress: 'Kota Bima, Nusa Tenggara Barat',
    position: { lat: -8.4606, lng: 118.7267 },
  },
  {
    id: 'ntb-woha',
    keywords: ['woha', 'belo', 'bolo', 'sape', 'wawo', 'monta', 'palibelo', 'langgudu', 'madapangga', 'donggo', 'sanggar', 'tambora', 'kabupaten bima', 'kab. bima'],
    displayName: 'Kec. Woha & Belo, Kab. Bima',
    formattedAddress: 'Woha, Kabupaten Bima, Nusa Tenggara Barat',
    position: { lat: -8.5794, lng: 118.6914 },
  },
];

function matchGazetteer(rawQuery: string): ResolvedPlaceInfo | null {
  const normalized = rawQuery.toLowerCase().trim();
  if (!normalized) return null;

  // Prefer most specific keyword match (longest matching keyword)
  let bestEntry: GazetteerEntry | null = null;
  let bestKeywordLen = 0;

  for (const entry of NTB_GAZETTEER) {
    for (const kw of entry.keywords) {
      if (normalized.includes(kw) && kw.length > bestKeywordLen) {
        bestEntry = entry;
        bestKeywordLen = kw.length;
      }
    }
  }

  if (!bestEntry) return null;

  return {
    position: bestEntry.position,
    displayName: bestEntry.displayName,
    formattedAddress: bestEntry.formattedAddress,
    source: 'gazetteer',
  };
}

const moduleResolvedCache: Record<string, ResolvedPlaceInfo> = {};
const moduleInFlightQueries = new Set<string>();
let cacheHydrated = false;

function hydrateModuleCacheFromStorage(): Record<string, ResolvedPlaceInfo> {
  if (cacheHydrated) {
    return { ...moduleResolvedCache };
  }
  cacheHydrated = true;

  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PlaceCacheMap;
    const now = Date.now();
    const validEntries: PlaceCacheMap = {};

    for (const [query, entry] of Object.entries(parsed)) {
      if (
        entry &&
        entry.info?.position &&
        typeof entry.info.position.lat === 'number' &&
        typeof entry.info.position.lng === 'number' &&
        typeof entry.cachedAtMs === 'number' &&
        now - entry.cachedAtMs < CACHE_TTL_MS
      ) {
        moduleResolvedCache[query] = entry.info;
        validEntries[query] = entry;
      }
    }

    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(validEntries));
  } catch {
    // Ignore restricted storage errors
  }

  return { ...moduleResolvedCache };
}

function persistPlaceToStorage(query: string, info: ResolvedPlaceInfo) {
  moduleResolvedCache[query] = info;
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    const parsed: PlaceCacheMap = raw ? (JSON.parse(raw) as PlaceCacheMap) : {};
    parsed[query] = {
      info,
      cachedAtMs: Date.now(),
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage quota errors
  }
}

function buildInitialResolvedMap(proposals: UsulanProgram[]): Record<string, ResolvedPlaceInfo> {
  const cached = hydrateModuleCacheFromStorage();
  const initial: Record<string, ResolvedPlaceInfo> = { ...cached };

  for (const p of proposals) {
    const q = p.locationQuery.trim();
    if (!q || initial[q]) continue;
    const matched = matchGazetteer(q) ?? matchGazetteer(`${p.kecamatanKawasan} ${p.kabupatenKota}`);
    if (matched) {
      initial[q] = matched;
      moduleResolvedCache[q] = matched;
    }
  }

  return initial;
}

interface NominatimSearchResult {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  boundingbox?: [string, string, string, string];
}

/**
 * Resolves administrative / kawasan queries without requiring any API key:
 * 1. Instant local NTB administrative gazetteer lookup (0ms, works offline & on Cloud Run).
 * 2. OpenStreetMap Nominatim fallback for custom locations outside the built-in gazetteer.
 */
export function useSpatialResolver(proposals: UsulanProgram[]) {
  const [resolvedPlaces, setResolvedPlaces] = useState<Record<string, ResolvedPlaceInfo>>(() =>
    buildInitialResolvedMap(proposals)
  );
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolverError] = useState<string | null>(null);
  const attemptedQueriesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const localHits: Record<string, ResolvedPlaceInfo> = {};
    const remoteQueries: string[] = [];

    for (const p of proposals) {
      if (p.manualPosition) continue;
      const q = p.locationQuery.trim();
      if (!q) continue;

      if (moduleResolvedCache[q]) {
        if (!resolvedPlaces[q]) {
          localHits[q] = moduleResolvedCache[q];
        }
        continue;
      }

      const gazetteerHit =
        matchGazetteer(q) ?? matchGazetteer(`${p.kecamatanKawasan} ${p.kabupatenKota}`);
      if (gazetteerHit) {
        moduleResolvedCache[q] = gazetteerHit;
        localHits[q] = gazetteerHit;
        continue;
      }

      if (!attemptedQueriesRef.current.has(q) && !moduleInFlightQueries.has(q)) {
        remoteQueries.push(q);
      }
    }

    if (Object.keys(localHits).length > 0) {
      setResolvedPlaces((prev) => ({ ...prev, ...localHits }));
    }

    const uniqueRemote = Array.from(new Set(remoteQueries));
    if (uniqueRemote.length === 0) return;

    let cancelled = false;
    setIsResolving(true);

    const resolveRemoteBatch = async () => {
      const newlyResolved: Record<string, ResolvedPlaceInfo> = {};

      for (const query of uniqueRemote) {
        attemptedQueriesRef.current.add(query);
        moduleInFlightQueries.add(query);

        try {
          const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=id&limit=1&accept-language=id&q=${encodeURIComponent(
            query
          )}`;
          const response = await fetch(url, {
            headers: { Accept: 'application/json' },
          });

          if (response.ok) {
            const results = (await response.json()) as NominatimSearchResult[];
            const first = results[0];
            if (first) {
              const lat = Number(first.lat);
              const lng = Number(first.lon);
              if (Number.isFinite(lat) && Number.isFinite(lng)) {
                const info: ResolvedPlaceInfo = {
                  position: { lat, lng },
                  displayName: first.name || query.split(',')[0] || query,
                  formattedAddress: first.display_name || query,
                  source: 'nominatim',
                };
                persistPlaceToStorage(query, info);
                newlyResolved[query] = info;
              }
            }
          }
        } catch {
          // Silently ignore network errors; manual plotting on map remains available
        } finally {
          moduleInFlightQueries.delete(query);
        }
      }

      if (!cancelled) {
        if (Object.keys(newlyResolved).length > 0) {
          setResolvedPlaces((prev) => ({ ...prev, ...newlyResolved }));
        }
        setIsResolving(false);
      }
    };

    void resolveRemoteBatch();

    return () => {
      cancelled = true;
    };
  }, [proposals, resolvedPlaces]);

  const registerResolvedPlace = useCallback((query: string, info: ResolvedPlaceInfo) => {
    attemptedQueriesRef.current.add(query);
    persistPlaceToStorage(query, info);
    setResolvedPlaces((prev) => ({ ...prev, [query]: info }));
  }, []);

  return {
    resolvedPlaces,
    isResolving,
    resolverError,
    registerResolvedPlace,
  };
}

export interface PlaceSuggestionItem {
  placeId: string;
  label: string;
  displayName: string;
  position: LatLngPoint;
  bounds: [[number, number], [number, number]] | null;
}

/**
 * Keyless Indonesian place & NTB administrative search hook combining instant
 * built-in NTB gazetteer suggestions with OpenStreetMap Nominatim search.
 */
export function useModernPlaceAutocomplete(inputValue: string) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const lower = trimmed.toLowerCase();
    const localMatches: PlaceSuggestionItem[] = NTB_GAZETTEER.filter(
      (g) =>
        g.displayName.toLowerCase().includes(lower) ||
        g.formattedAddress.toLowerCase().includes(lower) ||
        g.keywords.some((kw) => kw.includes(lower))
    )
      .slice(0, 5)
      .map((g) => ({
        placeId: g.id,
        label: g.formattedAddress,
        displayName: g.displayName,
        position: g.position,
        bounds: g.bounds ?? null,
      }));

    setSuggestions(localMatches);

    if (trimmed.length < 3) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        setAutocompleteError(null);

        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=id&limit=5&accept-language=id&q=${encodeURIComponent(
          trimmed
        )}`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!active || !res.ok) return;

        const data = (await res.json()) as NominatimSearchResult[];
        if (!active) return;

        const remoteItems: PlaceSuggestionItem[] = data
          .map((item) => {
            const lat = Number(item.lat);
            const lng = Number(item.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            let bounds: [[number, number], [number, number]] | null = null;
            if (item.boundingbox && item.boundingbox.length === 4) {
              const south = Number(item.boundingbox[0]);
              const north = Number(item.boundingbox[1]);
              const west = Number(item.boundingbox[2]);
              const east = Number(item.boundingbox[3]);
              if (
                Number.isFinite(south) &&
                Number.isFinite(north) &&
                Number.isFinite(west) &&
                Number.isFinite(east)
              ) {
                bounds = [
                  [south, west],
                  [north, east],
                ];
              }
            }

            return {
              placeId: `osm-${item.place_id}`,
              label: item.display_name,
              displayName: item.name || item.display_name.split(',')[0] || trimmed,
              position: { lat, lng },
              bounds,
            };
          })
          .filter((x): x is PlaceSuggestionItem => x !== null);

        // Merge local NTB matches + OpenStreetMap matches without duplicates
        const merged = [...localMatches];
        for (const r of remoteItems) {
          const isDup = merged.some(
            (m) =>
              Math.abs(m.position.lat - r.position.lat) < 0.01 &&
              Math.abs(m.position.lng - r.position.lng) < 0.01
          );
          if (!isDup) merged.push(r);
        }

        setSuggestions(merged.slice(0, 7));
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError' && active) {
          setSuggestions(localMatches);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, 320);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [inputValue]);

  const selectSuggestion = useCallback(
    async (
      item: PlaceSuggestionItem
    ): Promise<{
      position: LatLngPoint;
      displayName: string;
      formattedAddress: string;
      bounds: [[number, number], [number, number]] | null;
    }> => {
      setSuggestions([]);
      return {
        position: item.position,
        displayName: item.displayName,
        formattedAddress: item.label,
        bounds: item.bounds,
      };
    },
    []
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    autocompleteError,
    selectSuggestion,
    clearSuggestions,
  };
}
