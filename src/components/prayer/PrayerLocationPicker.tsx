import React, { useEffect, useState } from 'react';
import { PRAYER_CITY_PRESETS, detectBrowserTimezone } from '../../data/defaults';
import {
  PRAYER_CALC_METHOD_OPTIONS,
  recommendPrayerParamsForCountry,
  reverseGeocodeCoords,
  searchGlobalCities,
  type CitySearchResult,
} from '../../utils/prayerGeo';
import {
  AlertCircleIcon,
  ChevronDownIcon,
  MapPinIcon,
  SearchIcon,
} from '../shared/Icons';
import type {
  PrayerCalculationMethodKey,
  PrayerMadhabKey,
  PrayerSettings,
} from '../../types/vision';

interface PrayerLocationPickerProps {
  value: PrayerSettings;
  onChange: (next: PrayerSettings) => void;
  compact?: boolean;
}

export const PrayerLocationPicker: React.FC<PrayerLocationPickerProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setSearchError(null);

    const timer = window.setTimeout(async () => {
      try {
        const list = await searchGlobalCities(trimmed, controller.signal);
        setResults(list);
        if (list.length === 0) {
          setSearchError(`No cities found matching "${trimmed}".`);
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setSearchError('Could not reach city search service. Try GPS or presets.');
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSelectCity = (city: CitySearchResult) => {
    const recommended = recommendPrayerParamsForCountry(city.countryCode);
    const displayLabel = city.countryCode
      ? `${city.name}, ${city.countryCode}`
      : city.country
        ? `${city.name}, ${city.country}`
        : city.name;

    onChange({
      cityName: displayLabel,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
      calculationMethod: recommended.calculationMethod,
      madhab: recommended.madhab,
    });
    setQuery('');
    setResults([]);
    setSearchError(null);
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        const tz = detectBrowserTimezone();
        const geo = await reverseGeocodeCoords(lat, lng);
        const recommended = recommendPrayerParamsForCountry(geo.countryCode);

        onChange({
          cityName: geo.cityName,
          latitude: lat,
          longitude: lng,
          timezone: tz,
          calculationMethod: recommended.calculationMethod,
          madhab: recommended.madhab,
        });
        setLocating(false);
      },
      (err) => {
        setSearchError(err.message || 'Unable to detect GPS location.');
        setLocating(false);
      },
      { timeout: 10_000 }
    );
  };

  const presetsToDisplay = compact
    ? PRAYER_CITY_PRESETS.slice(0, 6)
    : PRAYER_CITY_PRESETS;

  return (
    <div className="space-y-3.5">
      {/* Worldwide City Search + GPS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="prayer-city-search"
            className="text-xs font-medium text-[var(--text-secondary)]"
          >
            Search any city worldwide
          </label>
          <button
            type="button"
            onClick={handleUseGps}
            disabled={locating}
            className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <MapPinIcon className="w-3.5 h-3.5" />
            <span>{locating ? 'Locating…' : 'Use GPS location'}</span>
          </button>
        </div>

        <div className="relative">
          <div className="relative flex items-center">
            <SearchIcon className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 pointer-events-none" />
            <input
              id="prayer-city-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a city (e.g. Tokyo, Toronto, Cairo, Sylhet…)"
              className="field-input pl-8 pr-3 py-2 text-sm"
            />
          </div>

          {(searching || results.length > 0) && (
            <div className="mt-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-[var(--border-hairline)]">
              {searching && results.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-[var(--text-muted)]">
                  Searching cities…
                </div>
              ) : (
                results.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="w-full px-3 py-2.5 text-left hover:bg-[var(--bg-raised)] cursor-pointer flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {city.name}
                        {city.admin1 ? `, ${city.admin1}` : ''}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {city.country}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                      {city.timezone}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {searchError && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--semantic-warning)]">
            <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Selected Location Summary */}
      <div className="surface-raised px-3 py-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
          <span className="font-medium text-[var(--text-primary)] truncate">
            {value.cityName}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
          {value.timezone}
        </span>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presetsToDisplay.map((preset) => (
          <button
            key={preset.cityName}
            type="button"
            onClick={() => onChange(preset)}
            className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer transition-colors ${
              value.cityName === preset.cityName
                ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)] font-medium'
                : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {preset.cityName}
          </button>
        ))}
      </div>

      {/* Method & Madhab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-[var(--text-secondary)]"
            htmlFor="prayer-method-select"
          >
            Calculation Method
          </label>
          <select
            id="prayer-method-select"
            value={value.calculationMethod}
            onChange={(e) =>
              onChange({
                ...value,
                calculationMethod: e.target.value as PrayerCalculationMethodKey,
              })
            }
            className="field-input px-3 py-2 text-xs sm:text-sm"
          >
            {PRAYER_CALC_METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            className="text-xs font-medium text-[var(--text-secondary)]"
            htmlFor="prayer-madhab-select"
          >
            Asr Madhab
          </label>
          <select
            id="prayer-madhab-select"
            value={value.madhab}
            onChange={(e) =>
              onChange({
                ...value,
                madhab: e.target.value as PrayerMadhabKey,
              })
            }
            className="field-input px-3 py-2 text-xs sm:text-sm"
          >
            <option value="Hanafi">Hanafi</option>
            <option value="Shafi">Shafi / Standard (Maliki, Hanbali)</option>
          </select>
        </div>
      </div>

      {/* Collapsible Advanced Coordinates & Timezone */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1"
        >
          <ChevronDownIcon
            className={`w-3.5 h-3.5 transition-transform ${
              showAdvanced ? 'rotate-180' : ''
            }`}
          />
          <span>Advanced coordinates &amp; timezone</span>
        </button>

        {showAdvanced && (
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label
                className="text-[11px] font-medium text-[var(--text-secondary)]"
                htmlFor="adv-city-name"
              >
                Display Name
              </label>
              <input
                id="adv-city-name"
                type="text"
                value={value.cityName}
                onChange={(e) => onChange({ ...value, cityName: e.target.value })}
                className="field-input px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-[11px] font-medium text-[var(--text-secondary)]"
                htmlFor="adv-lat"
              >
                Latitude
              </label>
              <input
                id="adv-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={value.latitude}
                onChange={(e) =>
                  onChange({ ...value, latitude: parseFloat(e.target.value) || 0 })
                }
                className="field-input px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-[11px] font-medium text-[var(--text-secondary)]"
                htmlFor="adv-lng"
              >
                Longitude
              </label>
              <input
                id="adv-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={value.longitude}
                onChange={(e) =>
                  onChange({ ...value, longitude: parseFloat(e.target.value) || 0 })
                }
                className="field-input px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label
                className="text-[11px] font-medium text-[var(--text-secondary)]"
                htmlFor="adv-tz"
              >
                IANA Timezone
              </label>
              <input
                id="adv-tz"
                type="text"
                value={value.timezone}
                onChange={(e) => onChange({ ...value, timezone: e.target.value })}
                placeholder="UTC"
                className="field-input px-2.5 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
