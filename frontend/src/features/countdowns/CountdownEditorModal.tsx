import React, { useEffect, useState } from 'react';
import type {
  CountdownMilestone,
  MilestoneColor,
  MilestoneIcon,
} from '@z-vision/shared';
import { Modal } from '../../shared/components/Modal';
import { ClockIcon, FlagIcon, TargetIcon } from '../../shared/components/Icons';

interface CountdownEditorModalProps {
  open: boolean;
  initial: CountdownMilestone | null;
  onClose: () => void;
  onSave: (item: CountdownMilestone) => Promise<void>;
}

const COLOR_OPTIONS: { value: MilestoneColor; label: string; swatch: string }[] = [
  { value: 'white', label: 'Neutral', swatch: 'bg-zinc-400' },
  { value: 'light-blue', label: 'Sky', swatch: 'bg-sky-400' },
  { value: 'blue', label: 'Blue', swatch: 'bg-blue-500' },
  { value: 'dark-blue', label: 'Deep Blue', swatch: 'bg-blue-800' },
  { value: 'green', label: 'Emerald', swatch: 'bg-emerald-500' },
];

const ICON_OPTIONS: { value: MilestoneIcon; label: string; icon: React.ReactNode }[] = [
  { value: 'clock', label: 'Clock', icon: <ClockIcon className="w-4 h-4" /> },
  { value: 'zap', label: 'Flag', icon: <FlagIcon className="w-4 h-4" /> },
  { value: 'target', label: 'Target', icon: <TargetIcon className="w-4 h-4" /> },
];

const defaultCountdownDate = () => `${new Date().getFullYear() + 1}-12-31`;

const extractDateInputValue = (iso: string): string => {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultCountdownDate();
  return d.toISOString().slice(0, 10);
};

export const CountdownEditorModal: React.FC<CountdownEditorModalProps> = ({
  open,
  initial,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [dateStr, setDateStr] = useState(defaultCountdownDate);
  const [icon, setIcon] = useState<MilestoneIcon>('clock');
  const [color, setColor] = useState<MilestoneColor>('white');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setDateStr(extractDateInputValue(initial.endDate));
      setIcon(initial.icon);
      setColor(initial.color);
    } else {
      setName('');
      setDateStr(defaultCountdownDate());
      setIcon('clock');
      setColor('white');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dateStr) return;
    setSaving(true);
    try {
      const id =
        initial?.id || `cd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await onSave({
        id,
        name: name.trim(),
        endDate: `${dateStr}T23:59:59`,
        icon,
        color,
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
      title={initial ? 'Edit Countdown' : 'New Countdown'}
      subtitle="Displayed as a live countdown card on your dashboard."
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
            form="countdown-editor-form"
            disabled={saving || !name.trim() || !dateStr}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add countdown'}
          </button>
        </>
      }
    >
      <form
        id="countdown-editor-form"
        onSubmit={(e) => void handleSubmit(e)}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cd-name">
            Title
          </label>
          <input
            id="cd-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Launch"
            className="field-input px-3 py-2"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="cd-date">
            Target Date
          </label>
          <input
            id="cd-date"
            type="date"
            required
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="field-input px-3 py-2 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">Icon</span>
          <div className="grid grid-cols-3 gap-2">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIcon(opt.value)}
                className={`h-9 px-3 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium cursor-pointer transition-colors ${
                  icon === opt.value
                    ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)]'
                    : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Accent Color
          </span>
          <div className="grid grid-cols-5 gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 text-[11px] cursor-pointer transition-colors ${
                  color === opt.value
                    ? 'bg-[var(--bg-card)] border-[var(--accent)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded-full ${opt.swatch}`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CountdownEditorModal;
