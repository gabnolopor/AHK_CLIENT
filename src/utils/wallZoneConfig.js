export const WALL_ZONE_BOUNDS = {
  'entry-wall': {
    label: 'Pared frontal',
    minU: -5,
    maxU: 5,
    minY: 0.7,
    maxY: 2.3,
  },
  'left-wall': {
    label: 'Pared izquierda',
    minU: -10,
    maxU: 10,
    minY: 0.7,
    maxY: 2.3,
  },
};

export const DEFAULT_HANG_ZONES = [
  {
    id: 'entry-main',
    wallId: 'entry-wall',
    label: 'Zona principal',
    enabled: true,
    minU: -1.232,
    maxU: 0.655,
    minY: 0.7,
    maxY: 2.3,
  },
  {
    id: 'entry-zone-2',
    wallId: 'entry-wall',
    label: 'Zona 2',
    enabled: true,
    minU: 1.507,
    maxU: 3.964,
    minY: 0.702,
    maxY: 2.3,
  },
  {
    id: 'left-main',
    wallId: 'left-wall',
    label: 'Pared izquierda',
    enabled: true,
    minU: 5.8,
    maxU: 9.158,
    minY: 0.713,
    maxY: 2.3,
  },
  {
    id: 'left-zone-2',
    wallId: 'left-wall',
    label: 'Zona 2',
    enabled: true,
    minU: 1.934,
    maxU: 5.123,
    minY: 0.7,
    maxY: 2.3,
  },
  {
    id: 'left-zone-3',
    wallId: 'left-wall',
    label: 'Zona 3',
    enabled: true,
    minU: -6.08,
    maxU: -2.837,
    minY: 0.7,
    maxY: 2.3,
  },
  {
    id: 'left-zone-4',
    wallId: 'left-wall',
    label: 'Zona 4',
    enabled: true,
    minU: -2.005,
    maxU: -0.169,
    minY: 0.7,
    maxY: 2.3,
  },
];

const STORAGE_PREFIX = 'ahk-gallery-hang-zones';

export function loadHangZones(roomKey) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${roomKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveHangZones(roomKey, zones) {
  localStorage.setItem(`${STORAGE_PREFIX}:${roomKey}`, JSON.stringify(zones));
}

export function hangZonesFromSurfaces(surfaces) {
  if (!surfaces?.length) return [...DEFAULT_HANG_ZONES];

  return surfaces.map((surface) => {
    const hangY = surface.segment?.hangY ?? 1.65;
    return {
      id: `${surface.wallId}-auto`,
      wallId: surface.wallId,
      label: WALL_ZONE_BOUNDS[surface.wallId]?.label ?? surface.wallId,
      enabled: true,
      minU: surface.segment.minX,
      maxU: surface.segment.maxX,
      minY: Math.max(WALL_ZONE_BOUNDS[surface.wallId]?.minY ?? 0.7, hangY - 0.22),
      maxY: Math.min(WALL_ZONE_BOUNDS[surface.wallId]?.maxY ?? 2.3, hangY + 0.22),
    };
  });
}

export function clampZoneToBounds(zone) {
  const bounds = WALL_ZONE_BOUNDS[zone.wallId];
  if (!bounds) return zone;

  const minU = Math.min(zone.minU, zone.maxU);
  const maxU = Math.max(zone.minU, zone.maxU);
  const minY = Math.min(zone.minY, zone.maxY);
  const maxY = Math.max(zone.minY, zone.maxY);

  return {
    ...zone,
    minU: Math.max(bounds.minU, minU),
    maxU: Math.min(bounds.maxU, maxU),
    minY: Math.max(bounds.minY, minY),
    maxY: Math.min(bounds.maxY, maxY),
  };
}

export function createEmptyZone(wallId, index = 0) {
  const bounds = WALL_ZONE_BOUNDS[wallId];
  const width = (bounds.maxU - bounds.minU) * 0.35;
  const height = 0.4;
  const centerU = (bounds.minU + bounds.maxU) / 2;
  const centerY = 1.65;

  return clampZoneToBounds({
    id: `${wallId}-${Date.now()}-${index}`,
    wallId,
    label: `Zona ${index + 1}`,
    enabled: true,
    minU: centerU - width / 2,
    maxU: centerU + width / 2,
    minY: centerY - height / 2,
    maxY: centerY + height / 2,
  });
}

export function createZoneAtUV(wallId, u, y, index = 0) {
  const width = 1.15;
  const height = 0.42;

  return clampZoneToBounds({
    id: `${wallId}-${Date.now()}-${index}`,
    wallId,
    label: `Zona ${index + 1}`,
    enabled: true,
    minU: u - width / 2,
    maxU: u + width / 2,
    minY: y - height / 2,
    maxY: y + height / 2,
  });
}

export function formatZonesForExport(zones) {
  return JSON.stringify(zones, null, 2);
}
