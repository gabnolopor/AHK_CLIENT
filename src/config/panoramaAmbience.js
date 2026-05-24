/** Panoramas equirectangulares por franja horaria (hora local del dispositivo). */
export const PANORAMA_AMBIENCES = {
  day: '/day.jpg',
  dusk: '/dusk.jpg',
  night: '/night.jpg',
};

export const PANORAMA_CROSSFADE_MS = 2200;

/**
 * day:   06:00 – 17:59
 * dusk:  18:00 – 20:59
 * night: 21:00 – 05:59
 */
export function getPanoramaAmbience(date = new Date(), override = null) {
  if (override && PANORAMA_AMBIENCES[override]) return override;
  const hour = date.getHours();
  if (hour >= 6 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

export function getAmbienceImage(ambience) {
  return PANORAMA_AMBIENCES[ambience];
}

/** Milisegundos hasta el próximo cambio de franja (6:00, 18:00 o 21:00). */
export function getMsUntilNextAmbienceChange(date = new Date()) {
  const next = new Date(date);
  const hour = date.getHours();

  if (hour < 6) {
    next.setHours(6, 0, 0, 0);
  } else if (hour < 18) {
    next.setHours(18, 0, 0, 0);
  } else if (hour < 21) {
    next.setHours(21, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }

  return Math.max(0, next.getTime() - date.getTime());
}

export function parsePanoramaTimeOverride(value) {
  if (!value) return null;
  const key = value.toLowerCase();
  return PANORAMA_AMBIENCES[key] ? key : null;
}
