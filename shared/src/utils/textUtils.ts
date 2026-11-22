export const stripDecorativeSymbols = (text: string): string => {
  return text
    .replace(/[✦✧✶✯✩🌟🌙🌌•]/gu, '')
    .replace(/^\s*\[(.*)\]\s*$/, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*$/, '')
    .trim();
};

export const formatStatusLabel = (
  status: 'completed' | 'in-progress' | 'upcoming'
): string => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-progress':
      return 'In progress';
    case 'upcoming':
      return 'Upcoming';
  }
};
