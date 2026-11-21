import type {
  PrayerCalculationMethodKey,
  PrayerMadhabKey,
} from '../types/vision';

export interface CitySearchResult {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const PRAYER_CALC_METHOD_OPTIONS: {
  value: PrayerCalculationMethodKey;
  label: string;
  shortLabel: string;
  aladhanId: string;
}[] = [
  {
    value: 'Karachi',
    label: 'University of Islamic Sciences, Karachi',
    shortLabel: 'Karachi',
    aladhanId: '1',
  },
  {
    value: 'MuslimWorldLeague',
    label: 'Muslim World League (MWL)',
    shortLabel: 'MWL',
    aladhanId: '3',
  },
  {
    value: 'NorthAmerica',
    label: 'ISNA (North America)',
    shortLabel: 'ISNA',
    aladhanId: '2',
  },
  {
    value: 'UmmAlQura',
    label: 'Umm Al-Qura University, Makkah',
    shortLabel: 'Umm Al-Qura',
    aladhanId: '4',
  },
  {
    value: 'Egyptian',
    label: 'Egyptian General Authority of Survey',
    shortLabel: 'Egyptian',
    aladhanId: '5',
  },
  {
    value: 'Turkey',
    label: 'Diyanet İşleri Başkanlığı, Turkey',
    shortLabel: 'Diyanet',
    aladhanId: '13',
  },
  {
    value: 'Singapore',
    label: 'MUIS / MABIMS (Singapore, MY, ID)',
    shortLabel: 'MUIS',
    aladhanId: '11',
  },
  {
    value: 'Dubai',
    label: 'Dubai (IACAD)',
    shortLabel: 'Dubai',
    aladhanId: '16',
  },
  {
    value: 'Qatar',
    label: 'Qatar',
    shortLabel: 'Qatar',
    aladhanId: '10',
  },
  {
    value: 'Kuwait',
    label: 'Kuwait',
    shortLabel: 'Kuwait',
    aladhanId: '9',
  },
  {
    value: 'MoonsightingCommittee',
    label: 'Moonsighting Committee Worldwide',
    shortLabel: 'Moonsighting',
    aladhanId: '15',
  },
  {
    value: 'Tehran',
    label: 'Institute of Geophysics, Tehran',
    shortLabel: 'Tehran',
    aladhanId: '7',
  },
];

export const recommendPrayerParamsForCountry = (
  countryCode?: string
): { calculationMethod: PrayerCalculationMethodKey; madhab: PrayerMadhabKey } => {
  const code = (countryCode || '').toUpperCase();
  if (['BD', 'PK', 'IN', 'AF'].includes(code)) {
    return { calculationMethod: 'Karachi', madhab: 'Hanafi' };
  }
  if (['US', 'CA'].includes(code)) {
    return { calculationMethod: 'NorthAmerica', madhab: 'Shafi' };
  }
  if (code === 'SA') {
    return { calculationMethod: 'UmmAlQura', madhab: 'Shafi' };
  }
  if (code === 'AE') {
    return { calculationMethod: 'Dubai', madhab: 'Shafi' };
  }
  if (code === 'QA') {
    return { calculationMethod: 'Qatar', madhab: 'Shafi' };
  }
  if (code === 'KW') {
    return { calculationMethod: 'Kuwait', madhab: 'Shafi' };
  }
  if (code === 'TR') {
    return { calculationMethod: 'Turkey', madhab: 'Hanafi' };
  }
  if (['EG', 'SD', 'LY', 'LB', 'SY', 'IQ', 'PS', 'JO'].includes(code)) {
    return { calculationMethod: 'Egyptian', madhab: 'Shafi' };
  }
  if (['SG', 'MY', 'ID', 'BN'].includes(code)) {
    return { calculationMethod: 'Singapore', madhab: 'Shafi' };
  }
  if (code === 'IR') {
    return { calculationMethod: 'Tehran', madhab: 'Shafi' };
  }
  return { calculationMethod: 'MuslimWorldLeague', madhab: 'Shafi' };
};

export const searchGlobalCities = async (
  query: string,
  signal?: AbortSignal
): Promise<CitySearchResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', trimmed);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`City search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      admin1?: string;
      country?: string;
      country_code?: string;
      latitude: number;
      longitude: number;
      timezone?: string;
    }>;
  };

  if (!Array.isArray(data.results)) return [];

  return data.results
    .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map((item) => ({
      id: item.id,
      name: item.name,
      admin1: item.admin1,
      country: item.country || item.country_code || '',
      countryCode: item.country_code,
      latitude: Number(item.latitude.toFixed(4)),
      longitude: Number(item.longitude.toFixed(4)),
      timezone: item.timezone || 'UTC',
    }));
};

export const reverseGeocodeCoords = async (
  lat: number,
  lng: number
): Promise<{ cityName: string; countryCode?: string }> => {
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('localityLanguage', 'en');

    const res = await fetch(url.toString());
    if (!res.ok) return { cityName: 'Current Location' };

    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    };

    const city = data.city || data.locality || data.principalSubdivision;
    const country = data.countryCode || data.countryName;
    if (city && country) {
      return { cityName: `${city}, ${country}`, countryCode: data.countryCode };
    }
    if (city) {
      return { cityName: city, countryCode: data.countryCode };
    }
    return { cityName: 'Current Location', countryCode: data.countryCode };
  } catch {
    return { cityName: 'Current Location' };
  }
};

export const formatQiblaBearing = (degrees: number): string => {
  const normalized = ((degrees % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal = dirs[Math.round(normalized / 45) % 8];
  return `${Math.round(normalized)}° ${cardinal}`;
};
