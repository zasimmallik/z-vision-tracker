import React, { useEffect, useState } from 'react';
import { Modal } from '../shared/Modal';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '../shared/Icons';
import type { Milestone, MilestoneStatus, Mission, VisionData } from '../../types/vision';

const defaultVisionDate = () => `${new Date().getFullYear() + 5}-12-31`;

const extractDateInput = (iso: string): string => {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? defaultVisionDate() : d.toISOString().slice(0, 10);
};

interface VisionHeaderModalProps {
  open: boolean;
  vision: VisionData;
  onClose: () => void;
  onSave: (next: VisionData) => Promise<void>;
}

export const VisionHeaderModal: React.FC<VisionHeaderModalProps> = ({
  open,
  vision,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [visionPeriod, setVisionPeriod] = useState('');
  const [endDateStr, setEndDateStr] = useState(defaultVisionDate);
  const [businesses, setBusinesses] = useState<string[]>([]);
  const [newBusiness, setNewBusiness] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(vision.title);
    setSubtitle(vision.subtitle);
    setVisionPeriod(vision.visionPeriod);
    setEndDateStr(extractDateInput(vision.endDate));
    setBusinesses(vision.businesses);
    setNewBusiness('');
  }, [open, vision]);

  const handleAddBusiness = () => {
    const trimmed = newBusiness.trim();
    if (!trimmed) return;
    setBusinesses((prev) => [...prev, trimmed]);
    setNewBusiness('');
  };

  const handleMoveBusiness = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= businesses.length) return;
    const copy = [...businesses];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setBusinesses(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...vision,
        title: title.trim(),
        subtitle: subtitle.trim(),
        visionPeriod: visionPeriod.trim(),
        endDate: `${endDateStr}T23:59:59`,
        businesses: businesses.map((b) => b.trim()).filter(Boolean),
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
      title="Edit Vision & Business Pillars"
      maxWidthClass="max-w-xl"
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
            form="vision-header-form"
            disabled={saving || !title.trim()}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : 'Save Vision'}
          </button>
        </>
      }
    >
      <form id="vision-header-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="vh-title">
            Vision Title
          </label>
          <input
            id="vh-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field-input px-3 py-2"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="vh-sub">
            Subtitle
          </label>
          <input
            id="vh-sub"
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="field-input px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="vh-period">
              Horizon Label
            </label>
            <input
              id="vh-period"
              type="text"
              value={visionPeriod}
              onChange={(e) => setVisionPeriod(e.target.value)}
              className="field-input px-3 py-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="vh-end">
              Horizon End Date
            </label>
            <input
              id="vh-end"
              type="date"
              required
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Business Pillars ({businesses.length})
          </span>
          <div className="space-y-2">
            {businesses.map((biz, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={biz}
                  onChange={(e) => {
                    const next = [...businesses];
                    next[idx] = e.target.value;
                    setBusinesses(next);
                  }}
                  className="field-input px-3 py-1.5 text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleMoveBusiness(idx, -1)}
                  disabled={idx === 0}
                  className="btn-icon w-8 h-8 disabled:opacity-30"
                  aria-label="Move pillar up"
                >
                  <ArrowUpIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBusiness(idx, 1)}
                  disabled={idx === businesses.length - 1}
                  className="btn-icon w-8 h-8 disabled:opacity-30"
                  aria-label="Move pillar down"
                >
                  <ArrowDownIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBusinesses((prev) => prev.filter((_, i) => i !== idx))}
                  className="btn-icon w-8 h-8 hover:text-[var(--semantic-negative)]"
                  aria-label="Remove pillar"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newBusiness}
              onChange={(e) => setNewBusiness(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddBusiness();
                }
              }}
              placeholder="Add new business pillar…"
              className="field-input px-3 py-1.5 text-sm flex-1"
            />
            <button
              type="button"
              onClick={handleAddBusiness}
              disabled={!newBusiness.trim()}
              className="h-9 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

interface MissionEditorModalProps {
  open: boolean;
  initial: Mission | null;
  nextId: number;
  onClose: () => void;
  onSave: (mission: Mission) => Promise<void>;
}

export const MissionEditorModal: React.FC<MissionEditorModalProps> = ({
  open,
  initial,
  nextId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [years, setYears] = useState('0');
  const [months, setMonths] = useState('6');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setPeriod(initial.period);
      setYears(String(initial.duration.years ?? 0));
      setMonths(String(initial.duration.months ?? 0));
    } else {
      setTitle('');
      setPeriod('');
      setYears('0');
      setMonths('6');
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const y = Math.max(0, parseInt(years, 10) || 0);
      const m = Math.max(0, parseInt(months, 10) || 0);
      await onSave({
        id: initial?.id ?? nextId,
        title: title.trim(),
        period: period.trim(),
        duration: {
          ...(initial?.duration ?? {}),
          years: y > 0 ? y : undefined,
          months: m,
        },
        milestones: initial?.milestones ?? [],
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
      title={initial ? 'Edit Mission' : 'New Mission'}
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
            form="mission-editor-form"
            disabled={saving || !title.trim()}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : initial ? 'Save Mission' : 'Add Mission'}
          </button>
        </>
      }
    >
      <form id="mission-editor-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ms-title">
            Mission Title
          </label>
          <input
            id="ms-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Phase 1: Foundation"
            className="field-input px-3 py-2"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ms-period">
            Period Description
          </label>
          <input
            id="ms-period"
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="e.g. Between January 1, 2028 and December 31, 2028"
            className="field-input px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ms-years">
              Duration (Years)
            </label>
            <input
              id="ms-years"
              type="number"
              min={0}
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ms-months">
              Duration (Months)
            </label>
            <input
              id="ms-months"
              type="number"
              min={0}
              max={11}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="field-input px-3 py-2 font-mono"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

interface MilestoneEditorModalProps {
  open: boolean;
  initial: Milestone | null;
  nextId: number;
  onClose: () => void;
  onSave: (milestone: Milestone) => Promise<void>;
}

export const MilestoneEditorModal: React.FC<MilestoneEditorModalProps> = ({
  open,
  initial,
  nextId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('upcoming');
  const [points, setPoints] = useState<string[]>([]);
  const [newPoint, setNewPoint] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDeadline(initial.deadline);
      setStatus(initial.status);
      setPoints(initial.points ?? []);
      setDetails(initial.details ?? '');
    } else {
      setTitle('');
      setDeadline('');
      setStatus('upcoming');
      setPoints([]);
      setDetails('');
    }
    setNewPoint('');
  }, [open, initial]);

  const handleAddPoint = () => {
    const trimmed = newPoint.trim();
    if (!trimmed) return;
    setPoints((prev) => [...prev, trimmed]);
    setNewPoint('');
  };

  const handleMovePoint = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= points.length) return;
    const copy = [...points];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setPoints(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const cleanedPoints = points.map((p) => p.trim()).filter(Boolean);
      const nextMilestone: Milestone = {
        id: initial?.id ?? nextId,
        title: title.trim(),
        deadline: deadline.trim(),
        status,
        ...(cleanedPoints.length > 0 ? { points: cleanedPoints } : {}),
        ...(details.trim() ? { details: details.trim() } : {}),
      };
      await onSave(nextMilestone);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit Milestone #${String(initial.id).padStart(2, '0')}` : 'New Milestone'}
      maxWidthClass="max-w-xl"
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
            form="milestone-editor-form"
            disabled={saving || !title.trim()}
            className="btn-primary h-9 text-xs"
          >
            {saving ? 'Saving…' : initial ? 'Save Milestone' : 'Add Milestone'}
          </button>
        </>
      }
    >
      <form id="milestone-editor-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ml-title">
            Milestone Title
          </label>
          <textarea
            id="ml-title"
            required
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe this milestone…"
            className="field-input px-3 py-2 resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ml-deadline">
              Deadline Label
            </label>
            <input
              id="ml-deadline"
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g. By June 30, 2027"
              className="field-input px-3 py-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ml-status">
              Status
            </label>
            <select
              id="ml-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              className="field-input px-3 py-2"
            >
              <option value="upcoming">Upcoming</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            Key Objectives ({points.length})
          </span>
          <div className="space-y-2">
            {points.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <textarea
                  rows={2}
                  value={pt}
                  onChange={(e) => {
                    const next = [...points];
                    next[idx] = e.target.value;
                    setPoints(next);
                  }}
                  className="field-input px-3 py-1.5 text-sm flex-1 resize-y"
                />
                <div className="flex flex-col gap-1 shrink-0">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleMovePoint(idx, -1)}
                      disabled={idx === 0}
                      className="btn-icon w-7 h-7 disabled:opacity-30"
                      aria-label="Move objective up"
                    >
                      <ArrowUpIcon className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePoint(idx, 1)}
                      disabled={idx === points.length - 1}
                      className="btn-icon w-7 h-7 disabled:opacity-30"
                      aria-label="Move objective down"
                    >
                      <ArrowDownIcon className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoints((prev) => prev.filter((_, i) => i !== idx))}
                      className="btn-icon w-7 h-7 hover:text-[var(--semantic-negative)]"
                      aria-label="Remove objective"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="text"
              value={newPoint}
              onChange={(e) => setNewPoint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPoint();
                }
              }}
              placeholder="Add objective point…"
              className="field-input px-3 py-2 text-sm flex-1"
            />
            <button
              type="button"
              onClick={handleAddPoint}
              disabled={!newPoint.trim()}
              className="h-9 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {points.length === 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="ml-details">
              Details (optional fallback if no objectives)
            </label>
            <textarea
              id="ml-details"
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional notes…"
              className="field-input px-3 py-2 resize-y"
            />
          </div>
        )}
      </form>
    </Modal>
  );
};
