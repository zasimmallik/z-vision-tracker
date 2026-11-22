import React, { useEffect, useState } from 'react';
import type { FitnessMetric, FitnessMetricDirection } from '@z-vision/shared';
import { Modal } from '../../shared/components/Modal';

interface FitnessDatesModalProps {
  open: boolean;
  birthDate: string;
  targetDate: string;
  onClose: () => void;
  onSave: (birthDate: string, targetDate: string) => Promise<void>;
}

const defaultTargetDate = () => `${new Date().getFullYear() + 1}-12-31`;

const toDateInput = (iso?: string, fallback = defaultTargetDate()): string => {
  if (!iso) return fallback;
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString().slice(0, 10);
};

export const FitnessDatesModal: React.FC<FitnessDatesModalProps> = ({
  open,
  birthDate,
  targetDate,
  onClose,
  onSave,
}) => {
  const [birth, setBirth] = useState('');
  const [target, setTarget] = useState(defaultTargetDate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBirth(toDateInput(birthDate, ''));
    setTarget(toDateInput(targetDate, defaultTargetDate()));
  }, [open, birthDate, targetDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await onSave(birth, `${target}T23:59:59`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Fitness Timeline"
      subtitle="Used for the countdown and automatic Age metric calculation."
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
            form="fitness-dates-form"
            disabled={saving || !target}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : 'Save dates'}
          </button>
        </>
      }
    >
      <form id="fitness-dates-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fit-target">
            Target Date
          </label>
          <input
            id="fit-target"
            type="date"
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="field-input px-3 py-2 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fit-birth">
            Birth Date (optional, for Age card)
          </label>
          <input
            id="fit-birth"
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
            className="field-input px-3 py-2 font-mono"
          />
        </div>
      </form>
    </Modal>
  );
};

interface FitnessMetricModalProps {
  open: boolean;
  initial: FitnessMetric | null;
  nextId: number;
  onClose: () => void;
  onSave: (metric: FitnessMetric) => Promise<void>;
}

const inferDirection = (metric: FitnessMetric | null): FitnessMetricDirection => {
  if (!metric) return 'increase';
  if (metric.direction) return metric.direction;
  if (metric.label === 'Height') return 'static';
  if (['Body Fat', 'Waist'].includes(metric.label)) return 'decrease';
  return 'increase';
};

const parseScalarOrString = (raw: string): string | number => {
  const trimmed = raw.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
};

export const FitnessMetricModal: React.FC<FitnessMetricModalProps> = ({
  open,
  initial,
  nextId,
  onClose,
  onSave,
}) => {
  const [label, setLabel] = useState('');
  const [current, setCurrent] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [direction, setDirection] = useState<FitnessMetricDirection>('increase');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setLabel(initial.label);
      setCurrent(String(initial.current));
      setTarget(String(initial.target));
      setUnit(initial.unit ?? '');
      setDirection(inferDirection(initial));
    } else {
      setLabel('');
      setCurrent('');
      setTarget('');
      setUnit('');
      setDirection('increase');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      const metric: FitnessMetric = {
        id: initial?.id ?? nextId,
        label: label.trim(),
        current: parseScalarOrString(current),
        target: parseScalarOrString(target),
        direction,
        ...(unit.trim() ? { unit: unit.trim() } : {}),
      };
      await onSave(metric);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.label}` : 'Add Fitness Metric'}
      subtitle={
        label.trim() === 'Age'
          ? 'Note: When Birth Date is set, Age values are calculated automatically.'
          : 'Supports numbers (e.g. 63), measurements (e.g. 63kg, 18.7%), or target ranges (e.g. 70–75kg).'
      }
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
            form="fitness-metric-form"
            disabled={saving || !label.trim()}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : initial ? 'Save metric' : 'Add metric'}
          </button>
        </>
      }
    >
      <form id="fitness-metric-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fm-label">
              Metric Name
            </label>
            <input
              id="fm-label"
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Weight, Chest, Push-ups"
              className="field-input px-3 py-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fm-unit">
              Unit (optional)
            </label>
            <input
              id="fm-unit"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. kg, cm, reps"
              className="field-input px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fm-curr">
              Current Value
            </label>
            <input
              id="fm-curr"
              type="text"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="e.g. 63kg"
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fm-target">
              Target Value
            </label>
            <input
              id="fm-target"
              type="text"
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. 70–75kg"
              className="field-input px-3 py-2 font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="fm-dir">
            Goal Direction
          </label>
          <select
            id="fm-dir"
            value={direction}
            onChange={(e) => setDirection(e.target.value as FitnessMetricDirection)}
            className="field-input px-3 py-2"
          >
            <option value="increase">Increase toward target (e.g., Weight, Muscle, Reps)</option>
            <option value="decrease">Reduce toward target (e.g., Body Fat, Waist)</option>
            <option value="static">Reference only (no progress bar, e.g., Height)</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};
