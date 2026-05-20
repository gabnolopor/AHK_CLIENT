/** Categorías de Writing (mismas que ShelfBg en /writing). */
export const WRITING_CATEGORIES_DESKTOP = [
  'Scripts',
  'Poems',
  'Lyrics',
  'Philosophy',
  'Treatments',
];

export const WRITING_CATEGORIES_MOBILE = [
  'Scripts',
  'Philosophy',
  'Poems & Lyrics',
  'Treatments',
];

export function getWritingCategories(isMobile) {
  return isMobile ? WRITING_CATEGORIES_MOBILE : WRITING_CATEGORIES_DESKTOP;
}
