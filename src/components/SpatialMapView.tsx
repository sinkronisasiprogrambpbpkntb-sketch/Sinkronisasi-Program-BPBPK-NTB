import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import L from 'leaflet';
import {
  Compass,
  Crosshair,
  Download,
  Edit3,
  Layers,
  LocateFixed,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  buildSpatialGeoJsonLayers,
  formatActiveYears,
  formatRpMiliar,
  getPaguForYearFilter,
  SEKTOR_SHORT_LABELS,
} from '../data/initialProposals';
import { PlaceSuggestionItem, useModernPlaceAutocomplete } from '../hooks/useSpatialResolver';
import {
  LatLngPoint,
  MapStyleType,
  ResolvedPlaceInfo,
  SektorCiptaKarya,
  SpatialLayerVisibility,
  UsulanProgram,
} from '../types/ciptaKarya';

function getMarkerThemeClasses(sektor: SektorCiptaKarya, isSelected: boolean): string {
  const ring = isSelected ? 'ring-4 ring-slate-900/30 scale-110' : 'hover:scale-105';
  switch (sektor) {
    case SektorCiptaKarya.AIR_MINUM:
      return `bg-blue-700 border-white text-white ${ring}`;
    case SektorCiptaKarya.SANITASI:
      return `bg-teal-700 border-white text-white ${ring}`;
    case SektorCiptaKarya.KAWASAN_STRATEGIS:
      return `bg-amber-600 border-white text-white ${ring}`;
    case SektorCiptaKarya.BINA_PENATAAN_BANGUNAN:
      return `bg-slate-800 border-white text-white ${ring}`;
  }
}

function getSektorCode(sektor: SektorCiptaKarya): string {
  switch (sektor) {
    case SektorCiptaKarya.AIR_MINUM:
      return 'AM';
    case SektorCiptaKarya.SANITASI:
      return 'SAN';
    case SektorCiptaKarya.KAWASAN_STRATEGIS:
      return 'PKS';
    case SektorCiptaKarya.BINA_PENATAAN_BANGUNAN:
      return 'BPB';
  }
}

function createBasemapLayerGroup(style: MapStyleType): L.LayerGroup {
  if (style === 'hybrid') {
    const imagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      }
    );
    const labels = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }
    );
    return L.layerGroup([imagery, labels]);
  }

  if (style === 'terrain') {
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
    });
    return L.layerGroup([topo]);
  }

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  });
  return L.layerGroup([osm]);
}

interface MapSearchOverlayProps {
  onJumpToPlace: (
    pos: LatLngPoint,
    bounds: [[number, number], [number, number]] | null
  ) => void;
}

const MapSearchOverlay: React.FC<MapSearchOverlayProps> = ({ onJumpToPlace }) => {
  const [query, setQuery] = useState('');
  const { suggestions, isLoading, selectSuggestion, clearSuggestions } =
    useModernPlaceAutocomplete(query);

  const handleChoose = async (item: PlaceSuggestionItem) => {
    const res = await selectSuggestion(item);
    setQuery(item.displayName || item.label);
    clearSuggestions();
    onJumpToPlace(res.position, res.bounds);
  };

  return (
    <div className="relative w-full sm:w-72">
      <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2.5 h-9 shadow-xs focus-within:border-blue-700">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari wilayah / kecamatan di peta..."
          className="w-full text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          aria-label="Cari lokasi pada peta interaktif"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              clearSuggestions();
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            aria-label="Bersihkan pencarian peta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {(suggestions.length > 0 || isLoading) && (
        <div className="absolute left-0 right-0 top-10 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
          {isLoading && suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">Mencari lokasi...</div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                onClick={() => void handleChoose(item)}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors cursor-pointer"
              >
                <div className="font-medium text-slate-900">{item.displayName}</div>
                <div className="text-[11px] text-slate-500 truncate">{item.label}</div>
              </button>
            ))
          )}
          <div className="px-3 py-1 bg-slate-50 text-[10px] text-slate-400 text-right">
            OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
};

export interface SpatialMapViewProps {
  proposals: UsulanProgram[];
  resolvedPlaces: Record<string, ResolvedPlaceInfo>;
  isResolving: boolean;
  resolverError: string | null;
  selectedProposalId: string | null;
  focusTrigger: number;
  yearFilter: 'ALL' | '2027' | '2028' | '2029' | '2030';
  canEdit: boolean;
  canManageProposal?: (proposal: UsulanProgram) => boolean;
  heightClassName?: string;
  pickingModeForTitle: string | null;
  onCancelPickingMode: () => void;
  onPickCoordinate: (pos: LatLngPoint) => void;
  onSelectProposal: (id: string) => void;
  onInspectDetail: (id: string) => void;
  onEditProposal: (proposal: UsulanProgram) => void;
  onDeleteProposal: (proposal: UsulanProgram) => void;
  onExportGeoJson: () => void;
}

export const SpatialMapView: React.FC<SpatialMapViewProps> = ({
  proposals,
  resolvedPlaces,
  isResolving,
  resolverError,
  selectedProposalId,
  focusTrigger,
  yearFilter,
  canEdit,
  canManageProposal,
  heightClassName = 'h-[520px]',
  pickingModeForTitle,
  onCancelPickingMode,
  onPickCoordinate,
  onSelectProposal,
  onInspectDetail,
  onEditProposal,
  onDeleteProposal,
  onExportGeoJson,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapGroupRef = useRef<L.LayerGroup | null>(null);
  const geoJsonGroupRef = useRef<L.LayerGroup | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const hasAutoFittedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mapStyle, setMapStyle] = useState<MapStyleType>('roadmap');
  const [fitAllTrigger, setFitAllTrigger] = useState(0);
  const [infoPopupOpen, setInfoPopupOpen] = useState<boolean>(false);
  const [layerVisibility, setLayerVisibility] = useState<SpatialLayerVisibility>({
    markers: true,
    servicePolygons: true,
    corridorLines: true,
    customGeoJson: true,
  });
  const [customGeoJson, setCustomGeoJson] = useState<Record<string, unknown> | null>(null);
  const [customGeoJsonName, setCustomGeoJsonName] = useState<string | null>(null);
  const [geoJsonAlert, setGeoJsonAlert] = useState<string | null>(null);

  // Latest callbacks via refs so Leaflet event listeners never go stale
  const pickingModeRef = useRef(pickingModeForTitle);
  pickingModeRef.current = pickingModeForTitle;
  const onPickCoordRef = useRef(onPickCoordinate);
  onPickCoordRef.current = onPickCoordinate;
  const onSelectRef = useRef(onSelectProposal);
  onSelectRef.current = onSelectProposal;

  // Initialize Leaflet Map (Zero API Key Required)
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || mapInstanceRef.current) return;

    const map = L.map(el, {
      center: [-8.62, 117.35],
      zoom: 8,
      zoomControl: true,
    });

    const baseGroup = createBasemapLayerGroup('roadmap').addTo(map);
    const geoGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);

    map.on('click', (ev: L.LeafletMouseEvent) => {
      if (pickingModeRef.current) {
        onPickCoordRef.current({
          lat: Number(ev.latlng.lat.toFixed(6)),
          lng: Number(ev.latlng.lng.toFixed(6)),
        });
      }
    });

    mapInstanceRef.current = map;
    basemapGroupRef.current = baseGroup;
    geoJsonGroupRef.current = geoGroup;
    markersGroupRef.current = markerGroup;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      basemapGroupRef.current = null;
      geoJsonGroupRef.current = null;
      markersGroupRef.current = null;
    };
  }, []);

  // Switch basemap tiles dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (basemapGroupRef.current) {
      map.removeLayer(basemapGroupRef.current);
    }
    const nextBase = createBasemapLayerGroup(mapStyle).addTo(map);
    basemapGroupRef.current = nextBase;
  }, [mapStyle]);

  const activePositions = useMemo(() => {
    const list: Array<{ id: string; position: LatLngPoint }> = [];
    for (const p of proposals) {
      const pos = p.manualPosition ?? resolvedPlaces[p.locationQuery]?.position;
      if (pos) list.push({ id: p.id, position: pos });
    }
    return list;
  }, [proposals, resolvedPlaces]);

  // Fit bounds automatically on initial data hydration or manual Reset Cakupan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || activePositions.length === 0) return;
    if (hasAutoFittedRef.current && fitAllTrigger === 0) return;

    const bounds = L.latLngBounds(
      activePositions.map((item) => [item.position.lat, item.position.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 12 });

    if (activePositions.length >= 2) {
      hasAutoFittedRef.current = true;
    }
  }, [activePositions, fitAllTrigger]);

  // Focus & zoom when a proposal is explicitly focused from table/detail panel
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedProposalId || focusTrigger === 0) return;
    const target = proposals.find((p) => p.id === selectedProposalId);
    if (!target) return;
    const pos = target.manualPosition ?? resolvedPlaces[target.locationQuery]?.position;
    if (!pos) return;

    const nextZoom = Math.max(map.getZoom(), 11);
    map.setView([pos.lat, pos.lng], nextZoom, { animate: true });
    setInfoPopupOpen(true);
  }, [selectedProposalId, focusTrigger, proposals, resolvedPlaces]);

  // Render GeoJSON polygons, regional corridors, and imported GeoJSON
  useEffect(() => {
    const geoGroup = geoJsonGroupRef.current;
    if (!geoGroup) return;
    geoGroup.clearLayers();

    if (layerVisibility.servicePolygons || layerVisibility.corridorLines) {
      const generated = buildSpatialGeoJsonLayers(proposals, resolvedPlaces, {
        includePolygons: layerVisibility.servicePolygons,
        includeCorridors: layerVisibility.corridorLines,
      });

      if (generated.features.length > 0) {
        const layer = L.geoJSON(generated as unknown as GeoJsonObject, {
          style: (feature) => {
            const props = (feature?.properties ?? {}) as Record<string, unknown>;
            const kind = props.featureKind as string | undefined;
            const proposalId = props.proposalId as string | undefined;
            const isSelected = Boolean(proposalId && proposalId === selectedProposalId);

            if (kind === 'service_polygon') {
              const strokeColor = (props.strokeColor as string) || '#1d4ed8';
              const fillColor = (props.fillColor as string) || '#2563eb';
              return {
                color: strokeColor,
                opacity: isSelected ? 0.95 : 0.65,
                weight: isSelected ? 2.5 : 1.5,
                fillColor,
                fillOpacity: isSelected ? 0.24 : 0.12,
              };
            }

            if (kind === 'corridor_line') {
              return {
                color: '#0f172a',
                opacity: 0.78,
                weight: 3,
                dashArray: '6 4',
              };
            }

            return {
              color: '#1d4ed8',
              weight: 2,
            };
          },
          onEachFeature: (feature, featLayer) => {
            const proposalId = (feature.properties as Record<string, unknown> | undefined)
              ?.proposalId as string | undefined;
            if (proposalId) {
              featLayer.on('click', (e) => {
                if (pickingModeRef.current) return;
                L.DomEvent.stopPropagation(e);
                onSelectRef.current(proposalId);
                setInfoPopupOpen(true);
              });
            }
          },
        });
        geoGroup.addLayer(layer);
      }
    }

    if (layerVisibility.customGeoJson && customGeoJson) {
      try {
        const extLayer = L.geoJSON(customGeoJson as unknown as GeoJsonObject, {
          style: {
            color: '#7c2d12',
            opacity: 0.85,
            weight: 2,
            fillColor: '#ea580c',
            fillOpacity: 0.18,
          },
        });
        geoGroup.addLayer(extLayer);
      } catch (err) {
        console.error('Gagal memuat GeoJSON eksternal ke peta:', err);
      }
    }
  }, [proposals, resolvedPlaces, layerVisibility, customGeoJson, selectedProposalId]);

  // Render Proposal Sector Badges (AM / SAN / PKS / BPB)
  useEffect(() => {
    const markerGroup = markersGroupRef.current;
    if (!markerGroup) return;
    markerGroup.clearLayers();

    if (!layerVisibility.markers) return;

    for (const p of proposals) {
      const resolved = resolvedPlaces[p.locationQuery];
      const pos = p.manualPosition ?? resolved?.position;
      if (!pos) continue;

      const isSelected = selectedProposalId === p.id;
      const code = getSektorCode(p.sektor);
      const themeClasses = getMarkerThemeClasses(p.sektor, isSelected);

      const icon = L.divIcon({
        className: 'simpra-marker-icon',
        iconSize: [40, 32],
        iconAnchor: [20, 16],
        html: `<div class="flex items-center justify-center min-w-[36px] h-8 px-2 rounded-md border-2 shadow-md font-mono text-[11px] font-semibold tracking-tight transition-transform duration-150 cursor-pointer ${themeClasses}">${code}</div>`,
      });

      const marker = L.marker([pos.lat, pos.lng], {
        icon,
        title: p.namaProgram,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on('click', (e) => {
        if (pickingModeRef.current) {
          onPickCoordRef.current({
            lat: Number(e.latlng.lat.toFixed(6)),
            lng: Number(e.latlng.lng.toFixed(6)),
          });
          return;
        }
        onSelectRef.current(p.id);
        setInfoPopupOpen(true);
      });

      markerGroup.addLayer(marker);
    }
  }, [proposals, resolvedPlaces, layerVisibility.markers, selectedProposalId]);

  const handleJumpToPlace = useCallback(
    (pos: LatLngPoint, bounds: [[number, number], [number, number]] | null) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      if (bounds) {
        map.fitBounds(bounds, { maxZoom: 14 });
      } else {
        map.setView([pos.lat, pos.lng], 13, { animate: true });
      }
    },
    []
  );

  const handleImportGeoJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
          setGeoJsonAlert('Format berkas tidak valid. Pastikan menggunakan standar RFC 7946 GeoJSON.');
          return;
        }
        setCustomGeoJson(parsed);
        setCustomGeoJsonName(file.name);
        setGeoJsonAlert(null);
        setLayerVisibility((prev) => ({ ...prev, customGeoJson: true }));
      } catch {
        setGeoJsonAlert('Gagal membaca berkas GeoJSON. Periksa struktur JSON Anda.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const resolvedCount = useMemo(() => {
    return proposals.filter(
      (p) => Boolean(p.manualPosition) || Boolean(resolvedPlaces[p.locationQuery]?.position)
    ).length;
  }, [proposals, resolvedPlaces]);

  const selectedProposalObj = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId) ?? null,
    [proposals, selectedProposalId]
  );

  const selectedProposalPos = selectedProposalObj
    ? selectedProposalObj.manualPosition ??
      resolvedPlaces[selectedProposalObj.locationQuery]?.position
    : undefined;

  const selectedProposalAddr = selectedProposalObj
    ? selectedProposalObj.manualAddressLabel ??
      resolvedPlaces[selectedProposalObj.locationQuery]?.formattedAddress ??
      selectedProposalObj.kecamatanKawasan
    : '';

  const canManageSelected = Boolean(
    selectedProposalObj &&
      canEdit &&
      (canManageProposal ? canManageProposal(selectedProposalObj) : true)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      {/* Spatial Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <MapSearchOverlay onJumpToPlace={handleJumpToPlace} />

          {/* Basemap Switcher */}
          <div
            className="inline-flex items-center p-0.5 bg-slate-200/75 rounded-lg"
            role="group"
            aria-label="Jenis Peta Dasar"
          >
            {(
              [
                { id: 'roadmap', label: 'Peta Jalan' },
                { id: 'hybrid', label: 'Satelit' },
                { id: 'terrain', label: 'Topografi' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMapStyle(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  mapStyle === item.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spatial Layer Controls & GeoJSON I/O */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setLayerVisibility((prev) => ({
                ...prev,
                servicePolygons: !prev.servicePolygons,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              layerVisibility.servicePolygons
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zona Layanan</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setLayerVisibility((prev) => ({
                ...prev,
                corridorLines: !prev.corridorLines,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              layerVisibility.corridorLines
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Koridor Jaringan</span>
          </button>

          <button
            type="button"
            onClick={() => setFitAllTrigger((c) => c + 1)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Tampilkan seluruh sebaran spasial"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>Reset Cakupan</span>
          </button>

          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                onChange={handleImportGeoJsonFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor GeoJSON</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onExportGeoJson}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor GeoJSON</span>
          </button>
        </div>
      </div>

      {/* Interactive Coordinate Picking Mode Banner */}
      {pickingModeForTitle && (
        <div className="px-4 py-2.5 bg-blue-700 text-white text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 shrink-0" />
            <span>
              Mode Penentuan Titik Spasial Aktif: Klik lokasi tepat pada peta untuk usulan{' '}
              <strong className="font-semibold">{pickingModeForTitle}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelPickingMode}
            className="px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded text-white font-medium cursor-pointer whitespace-nowrap shrink-0"
          >
            Batalkan
          </button>
        </div>
      )}

      {/* Alerts for GeoJSON import or Spatial Notice */}
      {(resolverError || geoJsonAlert || customGeoJsonName) && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <div>
            {geoJsonAlert && <span>{geoJsonAlert} </span>}
            {resolverError && <span>{resolverError} </span>}
            {customGeoJsonName && !geoJsonAlert && (
              <span className="text-slate-700">
                Layer eksternal aktif: <strong className="font-medium">{customGeoJsonName}</strong>
              </span>
            )}
          </div>
          {customGeoJsonName && (
            <button
              type="button"
              onClick={() => {
                setCustomGeoJson(null);
                setCustomGeoJsonName(null);
              }}
              className="text-xs underline text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              Hapus Layer Eksternal
            </button>
          )}
        </div>
      )}

      {/* Map Canvas Container with Isolated Stacking Context */}
      <div
        className={`relative isolate w-full ${heightClassName} bg-slate-100 ${
          pickingModeForTitle ? 'cursor-crosshair' : ''
        }`}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Selected Proposal Interactive Map Card */}
        {infoPopupOpen && selectedProposalObj && selectedProposalPos && !pickingModeForTitle && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-[1000] bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 text-slate-900">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="text-[11px] text-slate-500">
                <span className="font-mono font-medium text-slate-700">
                  {selectedProposalObj.kodeUsulan}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{SEKTOR_SHORT_LABELS[selectedProposalObj.sektor]}</span>
                <span aria-hidden="true"> · </span>
                <span>{formatActiveYears(selectedProposalObj.pagu)}</span>
              </div>
              <button
                type="button"
                onClick={() => setInfoPopupOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer shrink-0"
                aria-label="Tutup informasi titik"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="text-sm font-semibold text-slate-900 leading-snug mb-2">
              {selectedProposalObj.namaProgram}
            </h4>

            <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-200 text-xs mb-2">
              <div>
                <div className="text-slate-500">Alokasi Pagu</div>
                <div className="font-mono font-semibold tabular-nums text-slate-900">
                  {formatRpMiliar(getPaguForYearFilter(selectedProposalObj, yearFilter))}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Target Fisik / Output</div>
                <div className="font-semibold text-slate-900 leading-snug">
                  {selectedProposalObj.templateDetails?.outputTambahan?.trim() ||
                    (selectedProposalObj.volumeTarget > 0
                      ? `${selectedProposalObj.volumeTarget} ${selectedProposalObj.satuanTarget}`
                      : '—')}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 mb-2">
              <div className="font-mono tabular-nums text-slate-700">
                {selectedProposalPos.lat.toFixed(5)}, {selectedProposalPos.lng.toFixed(5)}
              </div>
              {selectedProposalAddr && (
                <div className="mt-0.5 text-slate-600">{selectedProposalAddr}</div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onInspectDetail(selectedProposalObj.id)}
                className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Pratinjau
              </button>
              {canManageSelected && (
                <>
                  <button
                    type="button"
                    onClick={() => onEditProposal(selectedProposalObj)}
                    className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteProposal(selectedProposalObj)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Hapus usulan"
                    aria-label={`Hapus ${selectedProposalObj.namaProgram}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spatial Legend & Attribution Footer */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-xs bg-blue-700" aria-hidden="true" />
            <span>AM · Air Minum</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-xs bg-teal-700" aria-hidden="true" />
            <span>SAN · Sanitasi & Persampahan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-xs bg-amber-600" aria-hidden="true" />
            <span>PKS · Pengembangan Kawasan Strategis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-xs bg-slate-800" aria-hidden="true" />
            <span>BPB · Bina Penataan Bangunan</span>
          </div>
        </div>

        <div className="font-mono text-[11px] tabular-nums text-slate-500">
          {isResolving
            ? 'Menyinkronkan titik geospasial...'
            : `${resolvedCount}/${proposals.length} titik terpetakan · OpenStreetMap`}
        </div>
      </div>
    </div>
  );
};
