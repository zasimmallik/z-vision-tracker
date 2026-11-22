import React, { useEffect, useState } from 'react';
import type { CalorieFoodPreset, CalorieLogEntry, MealType } from '@z-vision/shared';
import { Modal } from '../../shared/components/Modal';

interface CalorieEntryModalProps {
  open: boolean;
  initial: CalorieLogEntry | null;
  onClose: () => void;
  onSave: (entry: CalorieLogEntry, savePreset?: CalorieFoodPreset) => Promise<void>;
}

export const CalorieEntryModal: React.FC<CalorieEntryModalProps> = ({
  open,
  initial,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [meal, setMeal] = useState<MealType>('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setMeal(initial.meal);
      setCalories(String(initial.calories));
      setProtein(initial.protein !== undefined ? String(initial.protein) : '');
      setCarbs(initial.carbs !== undefined ? String(initial.carbs) : '');
      setFat(initial.fat !== undefined ? String(initial.fat) : '');
      setSaveAsPreset(false);
    } else {
      setName('');
      setMeal('lunch');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setSaveAsPreset(false);
    }
  }, [open, initial]);

  const parseOptionalNum = (val: string): number | undefined => {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kcal = Number(calories);
    if (!name.trim() || !Number.isFinite(kcal) || kcal < 0) return;

    setSaving(true);
    try {
      const id =
        initial?.id || `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const entry: CalorieLogEntry = {
        id,
        name: name.trim(),
        meal,
        calories: Math.round(kcal),
        protein: parseOptionalNum(protein),
        carbs: parseOptionalNum(carbs),
        fat: parseOptionalNum(fat),
        createdAt: initial?.createdAt ?? Date.now(),
      };

      const preset: CalorieFoodPreset | undefined =
        !initial && saveAsPreset
          ? {
              id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              name: entry.name,
              calories: entry.calories,
              protein: entry.protein,
              carbs: entry.carbs,
              fat: entry.fat,
              defaultMeal: entry.meal,
            }
          : undefined;

      await onSave(entry, preset);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Food Entry' : 'Log Food'}
      subtitle="Track calories and optional macronutrients."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="calorie-entry-form"
            disabled={saving || !name.trim() || !calories.trim()}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : initial ? 'Save entry' : 'Add entry'}
          </button>
        </>
      }
    >
      <form id="calorie-entry-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cal-name">
            Food / Meal Name
          </label>
          <input
            id="cal-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grilled Salmon & Rice"
            className="field-input px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cal-meal">
              Meal
            </label>
            <select
              id="cal-meal"
              value={meal}
              onChange={(e) => setMeal(e.target.value as MealType)}
              className="field-input px-3 py-2"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cal-kcal">
              Calories (kcal)
            </label>
            <input
              id="cal-kcal"
              type="number"
              required
              min={0}
              max={10000}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="450"
              className="field-input px-3 py-2 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cal-p">
              Protein (g)
            </label>
            <input
              id="cal-p"
              type="number"
              min={0}
              max={1000}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="0"
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cal-c">
              Carbs (g)
            </label>
            <input
              id="cal-c"
              type="number"
              min={0}
              max={1500}
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="0"
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cal-f">
              Fat (g)
            </label>
            <input
              id="cal-f"
              type="number"
              min={0}
              max={500}
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="0"
              className="field-input px-3 py-2 font-mono"
            />
          </div>
        </div>

        {!initial && (
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsPreset}
              onChange={(e) => setSaveAsPreset(e.target.checked)}
            />
            <span>Save to quick-add presets for 1-click logging</span>
          </label>
        )}
      </form>
    </Modal>
  );
};
