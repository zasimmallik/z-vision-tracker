/**
 * Strips decorative stars, moons, sparkles, and leading bullet glyphs from
 * display labels while keeping underlying JSON data intact.
 */
export const stripDecorativeSymbols = (text: string): string => {
  return text
    .replace(/[✦✧✶✯✩🌟🌙🌌•]/gu, '')
    .replace(/^\s*\[(.*)\]\s*$/, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*$/, '')
    .trim();
};

/**
 * Formats milestone status values into clean sentence case.
 */
export const formatStatusLabel = (status: 'completed' | 'in-progress' | 'upcoming'): string => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In progress';
    case 'upcoming':
      return 'Upcoming';
  }
};
