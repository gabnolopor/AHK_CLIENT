import * as THREE from 'three';

/**
 * Hotspots del tour 360°.
 *
 * yaw:   giro horizontal en grados (0 ≈ centro de la imagen; positivo ≈ derecha)
 * pitch: inclinación vertical en grados (positivo = arriba, negativo = abajo)
 *
 */
export const HOTSPOT_RADIUS = 490;
export const DEFAULT_HOTSPOT_HIT = { w: 88, h: 88 };

/** Ángulo inicial del tour (photos-5). */
export const PANORAMA_INITIAL_VIEW = { yaw: 87, pitch: 0.2 };

/** Tamaño del área clicable (px). En móvil sin medidas custom → solo el punto (14×14). */
export function getHotspotHitSize(hotspot, { compactMobile = false } = {}) {
  if (hotspot.hitW != null || hotspot.hitH != null) {
    return {
      w: hotspot.hitW ?? DEFAULT_HOTSPOT_HIT.w,
      h: hotspot.hitH ?? DEFAULT_HOTSPOT_HIT.h,
    };
  }
  if (compactMobile) return { w: 14, h: 14 };
  return { ...DEFAULT_HOTSPOT_HIT };
}

export function applyHotspotDimensions(element, hotspot, options = {}) {
  const { w, h } = getHotspotHitSize(hotspot, options);
  element.style.width = `${w}px`;
  element.style.height = `${h}px`;
  element.style.minWidth = `${w}px`;
  element.style.minHeight = `${h}px`;
  element.style.padding = '0';
}

function formatHotspotSize(h) {
  if (h.hitW == null && h.hitH == null) return '';
  const w = h.hitW ?? DEFAULT_HOTSPOT_HIT.w;
  const ht = h.hitH ?? DEFAULT_HOTSPOT_HIT.h;
  return `, hitW: ${w}, hitH: ${ht}`;
}

export const PANORAMA_HOTSPOTS = [
  { id: 'music', label: 'Music', path: '/music', yaw: -155.2, pitch: -19, hitW: 193, hitH: 139 },
  { id: 'music-2', label: 'Music', path: '/music', yaw: -24.3, pitch: 18.1, hitW: 154, hitH: 106 },
  { id: 'photos', label: 'Photos', path: '/photoroom', yaw: 73.3, pitch: -21.8, hitW: 88, hitH: 54 },
  { id: 'photos-2', label: 'Photos', path: '/photoroom', yaw: -21.3, pitch: -0.2, hitW: 97, hitH: 96 },
  { id: 'photos-3', label: 'Photos', path: '/photoroom', yaw: 85.4, pitch: 41.1, hitW: 106, hitH: 125 },
  { id: 'photos-4', label: 'Photos', path: '/photoroom', yaw: 120.6, pitch: -20.9, hitW: 61, hitH: 70 },
  { id: 'photos-5', label: 'Photos', path: '/photoroom', yaw: 87, pitch: 0.2, hitW: 251, hitH: 51 },
  { id: 'art', label: 'Art', path: '/artroom', yaw: 61.8, pitch: -7.8, hitW: 63, hitH: 89 },
  { id: 'art-2', label: 'Art', path: '/artroom', yaw: 114.3, pitch: 3.4, hitW: 122, hitH: 136 },
  { id: 'art-3', label: 'Art', path: '/artroom', yaw: 63.6, pitch: 33, hitW: 84, hitH: 115 },
  { id: 'art-4', label: 'Art', path: '/artroom', yaw: 111.3, pitch: 28.6, hitW: 156, hitH: 172 },
  { id: 'art-5', label: 'Art', path: '/artroom', yaw: 90.3, pitch: 20.1, hitW: 97, hitH: 131 },
  { id: 'design-2', label: 'Design', path: '/design', yaw: 66.2, pitch: 15.6, hitW: 98, hitH: 125 },
  { id: 'writing', label: 'Writing', action: 'writing', yaw: -25, pitch: -29.5, hitW: 128, hitH: 82 },
  { id: 'writing-2', label: 'Writing', action: 'writing', yaw: -137.2, pitch: -31.3, hitW: 105, hitH: 63 },
  { id: 'writing-3', label: 'Writing', action: 'writing', yaw: -109.7, pitch: 2.4, hitW: 225, hitH: 353 },
  { id: 'writing-4', label: 'Writing', action: 'writing', yaw: 48.5, pitch: -22.6, hitW: 96, hitH: 72 },
  { id: 'writing-5', label: 'Writing', action: 'writing', yaw: -25.3, pitch: -15, hitW: 123, hitH: 84 },
  { id: 'writing-6', label: 'ZigZagShop', path: '/zigzagshop', yaw: 159.3, pitch: -37.5, hitW: 154, hitH: 64 },
  { id: 'writing-7', label: 'Writing', action: 'writing', yaw: 135.4, pitch: -28.5, hitW: 103, hitH: 63 },
  { id: 'digital', label: 'Digital', path: '/digitalart', yaw: 99.3, pitch: -12.6, hitW: 196, hitH: 126 },
  { id: 'design', label: 'Design', path: '/design', yaw: 132.7, pitch: -2.8, hitW: 98, hitH: 225 },
  { id: 'bio', label: 'Bio', path: '/biography', yaw: 68.2, pitch: -28.6, hitW: 110, hitH: 63 },
  { id: 'credits', label: 'Credits', path: '/credits', yaw: 179.8, pitch: -27.8, hitW: 105, hitH: 62 },
  { id: 'menu', label: 'Menu', action: 'menu', yaw: 31.7, pitch: 23.2, hitW: 236, hitH: 347 },
  { id: 'home-2', label: 'Home', action: 'menu', yaw: -72.8, pitch: -3.2, hitW: 175, hitH: 394 },
  { id: 'home-3', label: 'Home', action: 'menu', yaw: -48.9, pitch: 38 },
];

/** Convierte yaw/pitch (grados) a posición 3D sobre la esfera del panorama. */
export function hotspotToVector3(yawDeg, pitchDeg, radius = HOTSPOT_RADIUS) {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);
  const x = radius * Math.cos(pitch) * Math.sin(yaw);
  const y = radius * Math.sin(pitch);
  const z = radius * Math.cos(pitch) * Math.cos(yaw);
  return new THREE.Vector3(x, y, z);
}

/** Dirección de la cámara → yaw/pitch (útil en modo debug). */
export function vector3ToHotspotAngles(vector) {
  const v = vector.clone().normalize();
  const pitch = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(v.y, -1, 1)));
  const yaw = THREE.MathUtils.radToDeg(Math.atan2(v.x, v.z));
  return {
    yaw: Math.round(yaw * 10) / 10,
    pitch: Math.round(pitch * 10) / 10,
  };
}

/** Texto listo para pegar en PANORAMA_HOTSPOTS. */
export function formatHotspotsForConfig(hotspots) {
  return hotspots
    .map((h) => {
      const size = formatHotspotSize(h);
      if (h.action === 'menu') {
        return `  { id: '${h.id}', label: '${h.label}', action: 'menu', yaw: ${h.yaw}, pitch: ${h.pitch}${size} },`;
      }
      if (h.action === 'writing') {
        return `  { id: '${h.id}', label: '${h.label}', action: 'writing', yaw: ${h.yaw}, pitch: ${h.pitch}${size} },`;
      }
      return `  { id: '${h.id}', label: '${h.label}', path: '${h.path}', yaw: ${h.yaw}, pitch: ${h.pitch}${size} },`;
    })
    .join('\n');
}
