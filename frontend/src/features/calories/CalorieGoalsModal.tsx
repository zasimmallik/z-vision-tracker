import React, { useEffect, useState } from 'react';
import type { CalorieConfig, CalorieFoodPreset } from '@z-vision/shared';
import { Modal } from '../../shared/components/Modal';
import { TrashIcon } from '../../shared/components/Icons';

interface CalorieGoalsModalProps {
  open: boolean;
  config: CalorieConfig;
  onClose: () => void;
  onSave: (next: CalorieConfig) => Promise<void>;
}

export const CalorieGoalsModal: React.FC<CalorieGoalsModalProps> = ({
  open,
  config,
  onClose,
  onSave,
}) => {
  const [dailyCalories, setDailyCalories] = useState('2200');
  const [proteinGrams, setProteinGrams] = useState('150');
  const [carbsGrams, setCarbsGrams] = useState('220');
  const [fatGrams, setFatGrams] = useState('70');
  const [presets, setPresets] = useState<CalorieFoodPreset[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDailyCalories(String(config.goals.dailyCalories));
    setProteinGrams(String(config.goals.proteinGrams));
    setCarbsGrams(String(config.goals.carbsGrams));
    setFatGrams(String(config.goals.fatGrams));
    setPresets(config.presets);
  }, [open, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        goals: {
          dailyCalories: Math.max(500, Math.min(15000, Number(dailyCalories) || 2200)),
          proteinGrams: Math.max(0, Number(proteinGrams) || 0),
          carbsGrams: Math.max(0, Number(carbsGrams) || 0),
          fatGrams: Math.max(0, Number(fatGrams) || 0),
        },
        presets,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calorie Goals & Presets"
      subtitle="Adjust daily targets and manage quick-add foods."
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
            form="calorie-goals-form"
            disabled={saving}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : 'Save targets'}
          </button>
        </>
      }
    >
      <form id="calorie-goals-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cg-kcal">
              Daily Calories (kcal)
            </label>
            <input
              id="cg-kcal"
              type="number"
              min={500}
              max={15000}
              required
              value={dailyCalories}
              onChange={(e) => setDailyCalories(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cg-p">
              Protein Target (g)
            </label>
            <input
              id="cg-p"
              type="number"
              min={0}
              max={1000}
              value={proteinGrams}
              onChange={(e) => setProteinGrams(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cg-c">
              Carbs Target (g)
            </label>
            <input
              id="cg-c"
              type="number"
              min={0}
              max={1500}
              value={carbsGrams}
              onChange={(e) => setCarbsGrams(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cg-f">
              Fat Target (g)
            </label>
            <input
              id="cg-f"
              type="number"
              min={0}
              max={500}
              value={fatGrams}
              onChange={(e) => setFatGrams(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Quick-Add Presets ({presets.length})
          </span>
          {presets.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              No saved presets. Check “Save to quick-add presets” when logging food.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="surface-raised px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--text-primary)] truncate block">
                      {p.name}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {p.calories} kcal
                      {p.protein ? ` · ${p.protein}g P` : ''}
                      {p.carbs ? ` · ${p.carbs}g C` : ''}
                      {p.fat ? ` · ${p.fat}g F` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPresets((prev) => prev.filter((item) => item.id !== p.id))
                    }
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--semantic-negative)] cursor-pointer"
                    aria-label={`Remove ${p.name} preset`}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
