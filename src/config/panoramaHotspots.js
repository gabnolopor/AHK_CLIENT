import * as THREE from 'three';

/**
 * Hotspots del tour 360°.
 *
 * yaw:   giro horizontal en grados (0 ≈ centro de la imagen; positivo ≈ derecha)
 * pitch: inclinación vertical en grados (positivo = arriba, negativo = abajo)
 *
 * Colocar posiciones (requiere reactivar ?edit=1 en PanoramaRoom.jsx):
 * 1. Abre /panorama?edit=1
 * 2. Arrastra cada punto sobre el objeto en la escena
 * 3. Pulsa "Copiar config" y pega el resultado aquí (o pásamelo)
 * 4. En uso normal (/panorama) los puntos quedan fijos, sin arrastre
 */
export const HOTSPOT_RADIUS = 490;
export const PANORAMA_HOTSPOTS = [
  { id: 'music', label: 'Music', path: '/music', yaw: -149, pitch: -23.6 },
  { id: 'music-2', label: 'Music', path: '/music', yaw: -25.4, pitch: 12.6 },
  { id: 'photos', label: 'Photos', path: '/photoroom', yaw: 72.8, pitch: -25 },
  { id: 'photos-2', label: 'Photos', path: '/photoroom', yaw: -20.4, pitch: -3.9 },
  { id: 'photos-3', label: 'Photos', path: '/photoroom', yaw: 85.4, pitch: 34 },
  { id: 'photos-4', label: 'Photos', path: '/photoroom', yaw: 120.8, pitch: -25.5 },
  { id: 'art', label: 'Art', path: '/artroom', yaw: 62.1, pitch: -13.2 },
  { id: 'art-2', label: 'Art', path: '/artroom', yaw: 113.6, pitch: -6.3 },
  { id: 'art-3', label: 'Art', path: '/artroom', yaw: 64.4, pitch: 26.1 },
  { id: 'art-4', label: 'Art', path: '/artroom', yaw: 112.3, pitch: 19.9 },
  { id: 'writing', label: 'Writing', action: 'writing', yaw: -26.1, pitch: -33 },
  { id: 'writing-2', label: 'Writing', action: 'writing', yaw: -137, pitch: -33.1 },
  { id: 'writing-3', label: 'Writing', action: 'writing', yaw: -110.4, pitch: -1.8 },
  { id: 'writing-4', label: 'Writing', action: 'writing', yaw: 48.6, pitch: -24.4 },
  { id: 'writing-5', label: 'Writing', action: 'writing', yaw: -26, pitch: -22.5 },
  { id: 'writing-6', label: 'Writing', action: 'writing', yaw: 159.3, pitch: -40.8 },
  { id: 'writing-7', label: 'Writing', action: 'writing', yaw: 134.6, pitch: -31.8 },
  { id: 'digital', label: 'Digital', path: '/digitalart', yaw: 99.6, pitch: -14.3 },
  { id: 'design', label: 'Design', path: '/design', yaw: 132, pitch: -0.2 },
  { id: 'bio', label: 'Bio', path: '/biography', yaw: 68.1, pitch: -32.6 },
  { id: 'credits', label: 'Credits', path: '/credits', yaw: -179.6, pitch: -29.4 },
  { id: 'menu', label: 'Menu', action: 'menu', yaw: 87, pitch: 15 },
  { id: 'home-2', label: 'Home', action: 'menu', yaw: -71.6, pitch: -13.1 },
  { id: 'home-3', label: 'Home', action: 'menu', yaw: -49.2, pitch: 34.5 },
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
      if (h.action === 'menu') {
        return `  { id: '${h.id}', label: '${h.label}', action: 'menu', yaw: ${h.yaw}, pitch: ${h.pitch} },`;
      }
      if (h.action === 'writing') {
        return `  { id: '${h.id}', label: '${h.label}', action: 'writing', yaw: ${h.yaw}, pitch: ${h.pitch} },`;
      }
      return `  { id: '${h.id}', label: '${h.label}', path: '${h.path}', yaw: ${h.yaw}, pitch: ${h.pitch} },`;
    })
    .join('\n');
}
