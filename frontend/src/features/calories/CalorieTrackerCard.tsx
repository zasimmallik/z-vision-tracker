import React, { useEffect, useMemo, useState } from 'react';
import {
  shiftYmdString,
  summarizeCalorieLog,
  toLocalYmd,
  type CalorieFoodPreset,
  type CalorieLogEntry,
  type MealType,
} from '@z-vision/shared';
import { useVisionData } from '../../app/providers/VisionDataContext';
import { useMidnightKey } from '../../shared/hooks/useMidnightKey';
import { ConfirmDialog } from '../../shared/components/Modal';
import { CalorieEntryModal } from './CalorieEntryModal';
import { CalorieGoalsModal } from './CalorieGoalsModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  FlameIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
} from '../../shared/components/Icons';

const MEAL_LABELS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

const formatDateChip = (ymd: string, todayYmd: string): string => {
  if (ymd === todayYmd) return 'Today';
  if (ymd === shiftYmdString(todayYmd, -1)) return 'Yesterday';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const CalorieTrackerCard: React.FC = () => {
  const {
    caloriesConfig,
    calorieLogs,
    updateCaloriesConfig,
    loadCalorieLogForDate,
    saveCalorieLogForDate,
  } = useVisionData();

  const todayYmd = useMidnightKey();
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalYmd());

  const [entryModalState, setEntryModalState] = useState<{
    open: boolean;
    editing: CalorieLogEntry | null;
  }>({ open: false, editing: null });
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<CalorieLogEntry | null>(null);

  useEffect(() => {
    void loadCalorieLogForDate(selectedDate);
  }, [selectedDate, loadCalorieLogForDate]);

  const activeLog = calorieLogs[selectedDate] ?? { date: selectedDate, entries: [] };

  const summary = useMemo(
    () => summarizeCalorieLog(activeLog.entries, caloriesConfig.goals),
    [activeLog.entries, caloriesConfig.goals]
  );

  const handleSaveEntry = async (
    saved: CalorieLogEntry,
    newPreset?: CalorieFoodPreset
  ) => {
    const exists = activeLog.entries.some((e) => e.id === saved.id);
    const nextEntries = exists
      ? activeLog.entries.map((e) => (e.id === saved.id ? saved : e))
      : [saved, ...activeLog.entries];

    await saveCalorieLogForDate({ date: selectedDate, entries: nextEntries });

    if (newPreset) {
      await updateCaloriesConfig({
        ...caloriesConfig,
        presets: [...caloriesConfig.presets, newPreset],
      });
    }
  };

  const handleQuickAddPreset = async (preset: CalorieFoodPreset) => {
    const entry: CalorieLogEntry = {
      id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: preset.name,
      meal: preset.defaultMeal ?? 'snack',
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      createdAt: Date.now(),
    };
    await saveCalorieLogForDate({
      date: selectedDate,
      entries: [entry, ...activeLog.entries],
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return;
    await saveCalorieLogForDate({
      date: selectedDate,
      entries: activeLog.entries.filter((e) => e.id !== deletingEntry.id),
    });
    setDeletingEntry(null);
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-heading">
          <FlameIcon />
          <span>Calorie tracker</span>
        </h2>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setGoalsModalOpen(true)}
            className="btn-icon w-8 h-8"
            aria-label="Calorie goals and presets"
            title="Goals & presets"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEntryModalState({ open: true, editing: null })}
            className="btn-primary h-8 px-2.5 text-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Log food</span>
          </button>
        </div>
      </div>

      {/* Date Switcher */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => shiftYmdString(d, -1))}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2 font-mono">
          <span className="font-medium text-[var(--text-primary)]">
            {formatDateChip(selectedDate, todayYmd)}
          </span>
          {selectedDate !== todayYmd && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayYmd)}
              className="text-[11px] font-sans text-[var(--accent)] hover:underline cursor-pointer"
            >
              Jump to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => shiftYmdString(d, 1))}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Next day"
        >
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Calorie & Macro Summary */}
      <div className="surface-raised p-3.5 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-mono tabular-nums">
            <span className="text-xl font-medium text-[var(--text-primary)]">
              {summary.totalCalories}
            </span>
            <span className="text-xs text-[var(--text-muted)] ml-1">
              / {caloriesConfig.goals.dailyCalories} kcal
            </span>
          </div>
          <span
            className={`text-xs font-mono tabular-nums font-medium ${
              summary.isOverTarget
                ? 'text-[var(--semantic-negative)]'
                : 'text-[var(--accent)]'
            }`}
          >
            {summary.isOverTarget
              ? `${Math.abs(summary.remainingCalories)} over`
              : `${summary.remainingCalories} left`}
          </span>
        </div>

        <div className="horizon-track">
          <div
            className={`h-full rounded-full transition-transform duration-300 origin-left ${
              summary.isOverTarget ? 'bg-[var(--semantic-negative)]' : 'bg-[var(--accent)]'
            }`}
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, summary.caloriePercent / 100))})` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {[
            {
              label: 'Protein',
              val: summary.totalProtein,
              goal: caloriesConfig.goals.proteinGrams,
              pct: summary.proteinPercent,
            },
            {
              label: 'Carbs',
              val: summary.totalCarbs,
              goal: caloriesConfig.goals.carbsGrams,
              pct: summary.carbsPercent,
            },
            {
              label: 'Fat',
              val: summary.totalFat,
              goal: caloriesConfig.goals.fatGrams,
              pct: summary.fatPercent,
            },
          ].map((macro) => (
            <div key={macro.label} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">{macro.label}</span>
                <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                  {macro.val}/{macro.goal}g
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--track-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-600 dark:bg-sky-400 origin-left transition-transform duration-300"
                  style={{ transform: `scaleX(${Math.max(0, Math.min(1, macro.pct / 100))})` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick-Add Presets */}
      {caloriesConfig.presets.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-[var(--text-muted)] block">
            Quick add
          </span>
          <div className="flex flex-wrap gap-1.5">
            {caloriesConfig.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => void handleQuickAddPreset(preset)}
                className="px-2.5 py-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-raised)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors inline-flex items-center gap-1"
              >
                <PlusIcon className="w-3 h-3 text-[var(--accent)]" />
                <span>{preset.name}</span>
                <span className="font-mono text-[var(--text-muted)]">{preset.calories}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Meal-Grouped Entries */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-hide">
        {activeLog.entries.length === 0 ? (
          <div className="surface-raised py-6 px-4 text-center space-y-1">
            <p className="text-xs font-medium text-[var(--text-primary)]">
              No meals logged for {formatDateChip(selectedDate, todayYmd).toLowerCase()}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Tap a quick-add preset above or click Log food.
            </p>
          </div>
        ) : (
          MEAL_LABELS.map(({ key, label }) => {
            const mealEntries = summary.byMeal[key];
            if (mealEntries.length === 0) return null;
            const mealTotal = mealEntries.reduce((sum, e) => sum + e.calories, 0);

            return (
              <div
                key={key}
                className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)]/40 overflow-hidden"
              >
                <div className="px-3 py-1.5 border-b border-[var(--border-hairline)] bg-[var(--bg-raised)] flex items-center justify-between text-[11px]">
                  <span className="font-medium text-[var(--text-secondary)]">{label}</span>
                  <span className="font-mono tabular-nums text-[var(--text-muted)]">
                    {mealTotal} kcal
                  </span>
                </div>
                <div className="divide-y divide-[var(--border-hairline)]">
                  {mealEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-[var(--text-primary)] font-medium truncate">
                          {entry.name}
                        </div>
                        {(entry.protein || entry.carbs || entry.fat) && (
                          <div className="text-[10px] font-mono text-[var(--text-muted)]">
                            {entry.protein ? `${entry.protein}g P` : ''}
                            {entry.carbs ? ` · ${entry.carbs}g C` : ''}
                            {entry.fat ? ` · ${entry.fat}g F` : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                          {entry.calories} kcal
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEntryModalState({ open: true, editing: entry })
                          }
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          aria-label={`Edit ${entry.name}`}
                        >
                          <EditIcon className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEntry(entry)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--semantic-negative)] cursor-pointer"
                          aria-label={`Delete ${entry.name}`}
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CalorieEntryModal
        open={entryModalState.open}
        initial={entryModalState.editing}
        onClose={() => setEntryModalState({ open: false, editing: null })}
        onSave={handleSaveEntry}
      />

      <CalorieGoalsModal
        open={goalsModalOpen}
        config={caloriesConfig}
        onClose={() => setGoalsModalOpen(false)}
        onSave={updateCaloriesConfig}
      />

      <ConfirmDialog
        open={deletingEntry !== null}
        title="Remove Food Entry"
        description={`Remove "${deletingEntry?.name ?? ''}" (${deletingEntry?.calories ?? 0} kcal) from this day?`}
        onCancel={() => setDeletingEntry(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default CalorieTrackerCard;
