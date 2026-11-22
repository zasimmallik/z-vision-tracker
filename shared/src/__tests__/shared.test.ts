import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_WIDGETS_NEW_USER,
  calculateTimeRemaining,
  generateRamadanSchedule,
  getDefaultPrayerSettings,
  reconcileLayout,
  summarizeCalorieLog,
  validateBackupPayload,
} from '../index.js';

describe('@z-vision/shared', () => {
  it('validates and migrates v1 backup payload safely', () => {
    const raw = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      vision: {
        title: '5 Year Plan',
        subtitle: 'Focus',
        visionPeriod: '2026-2031',
        endDate: '2031-12-31T23:59:59',
        businesses: ['Craft'],
        missions: [],
      },
      countdowns: [
        {
          id: 'c1',
          name: 'Launch',
          endDate: '2027-01-01T23:59:59',
          icon: 'target',
          color: 'green',
        },
      ],
      fitness: {
        targetDate: '2027-12-31T23:59:59',
        metrics: [],
      },
      settings: {
        appTitle: 'My Vision',
        appLogoText: 'MV',
        prayer: {
          cityName: 'London',
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London',
          calculationMethod: 'MuslimWorldLeague',
          madhab: 'Shafi',
        },
      },
      journal: [
        { id: 'j1', content: 'Day 1 note', createdAt: 1700000000000 },
      ],
    };

    const parsed = validateBackupPayload(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.vision.title).toBe('5 Year Plan');
    expect(parsed.settings.widgets?.ramadan).toBe(false);
    expect(parsed.settings.layout?.primary.length).toBeGreaterThan(0);
  });

  it('rejects backup payloads violating bounds', () => {
    expect(() =>
      validateBackupPayload({
        vision: {
          title: 'x'.repeat(301),
          subtitle: '',
          visionPeriod: '',
          endDate: '2031-12-31',
          businesses: [],
          missions: [],
        },
        countdowns: [],
        fitness: { targetDate: '2027-12-31', metrics: [] },
      })
    ).toThrow(/vision/i);
  });

  it('reconciles layout without duplicates and removes disabled widgets', () => {
    const widgets = {
      ...DEFAULT_WIDGETS_NEW_USER,
      ramadan: true,
      calories: false,
    };
    const customLayout = {
      primary: ['missions', 'clock', 'clock', 'calories'] as typeof DEFAULT_DASHBOARD_LAYOUT.primary,
      secondary: ['fitness'] as typeof DEFAULT_DASHBOARD_LAYOUT.secondary,
    };
    const reconciled = reconcileLayout(customLayout, widgets);
    const combined = [...reconciled.primary, ...reconciled.secondary];
    expect(new Set(combined).size).toBe(combined.length);
    expect(combined).not.toContain('calories');
    expect(combined).toContain('ramadan');
    expect(reconciled.primary[0]).toBe('missions');
  });

  it('generates 30-day Ramadan schedule and respects hijriOffset', () => {
    const prayer = getDefaultPrayerSettings('Asia/Dhaka');
    expect(prayer.cityName).toBe('Dhaka');
    expect(prayer.timezone).toBe('Asia/Dhaka');

    const base = generateRamadanSchedule(1447, 0, prayer);
    const shifted = generateRamadanSchedule(1447, 1, prayer);

    expect(base).toHaveLength(30);
    expect(base[0].dayNumber).toBe(1);
    expect(base[29].dayNumber).toBe(30);
    expect(base[0].sehriEnd).toMatch(/^\d{2}:\d{2}$/);
    expect(base[0].iftar).toMatch(/^\d{2}:\d{2}$/);
    expect(base[0].fastingDurationMinutes).toBeGreaterThan(600);
    expect(shifted[0].gregorianYmd).toBe(base[1].gregorianYmd);
  });

  it('summarizes calorie logs and macro goals accurately', () => {
    const summary = summarizeCalorieLog(
      [
        {
          id: '1',
          name: 'Eggs',
          meal: 'breakfast',
          calories: 200,
          protein: 16,
          carbs: 2,
          fat: 14,
          createdAt: 1,
        },
        {
          id: '2',
          name: 'Chicken Bowl',
          meal: 'lunch',
          calories: 650,
          protein: 50,
          carbs: 60,
          fat: 18,
          createdAt: 2,
        },
      ],
      { dailyCalories: 2000, proteinGrams: 150, carbsGrams: 200, fatGrams: 65 }
    );

    expect(summary.totalCalories).toBe(850);
    expect(summary.remainingCalories).toBe(1150);
    expect(summary.isOverTarget).toBe(false);
    expect(summary.totalProtein).toBe(66);
    expect(summary.byMeal.breakfast).toHaveLength(1);
    expect(summary.byMeal.lunch).toHaveLength(1);
  });

  it('calculates remaining time cleanly', () => {
    const ref = new Date('2026-01-01T00:00:00Z');
    const rem = calculateTimeRemaining('2027-02-02T00:00:00Z', ref);
    expect(rem.isExpired).toBe(false);
    expect(rem.years).toBe(1);
    expect(rem.months).toBe(1);
  });
});
