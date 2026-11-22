import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_WIDGETS_EXISTING,
  validateBackupPayload,
  type AppSettings,
  type DashboardWidgets,
  type VisionBackupPayload,
  type WeekendHighlight,
} from '@z-vision/shared';
import { useVisionData } from '../../app/providers/VisionDataContext';
import { ConfirmDialog, Modal } from '../../shared/components/Modal';
import { PrayerLocationPicker } from '../prayer/PrayerLocationPicker';
import {
  AlertCircleIcon,
  CheckIcon,
  DownloadIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  TrashIcon,
  UploadIcon,
} from '../../shared/components/Icons';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'prayer' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const {
    settings,
    updateSettings,
    resetLayout,
    fetchFullBackup,
    importBackup,
    resetDefaults,
    deleteAllAccountData,
  } = useVisionData();

  const [tab, setTab] = useState<SettingsTab>('general');
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wasOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<VisionBackupPayload | null>(null);
  const [replaceJournalOnImport, setReplaceJournalOnImport] = useState(true);
  const [resetMode, setResetMode] = useState<'blank' | 'starter'>('starter');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [clearJournalOnReset, setClearJournalOnReset] = useState(false);
  const [confirmEraseOpen, setConfirmEraseOpen] = useState(false);

  // Sync draft only when modal transitions closed -> open so background updates never wipe unsaved edits
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraft({
        ...settings,
        widgets: {
          ...DEFAULT_WIDGETS_EXISTING,
          ...(settings.widgets ?? {}),
        },
        weekendHighlight: settings.weekendHighlight ?? 'friday',
      });
      setStatusMsg(null);
      setErrorMsg(null);
      setPendingImport(null);
    }
    wasOpenRef.current = open;
  }, [open, settings]);

  const draftWidgets: DashboardWidgets = {
    ...DEFAULT_WIDGETS_EXISTING,
    ...(draft.widgets ?? {}),
  };
  const draftWeekend: WeekendHighlight = draft.weekendHighlight ?? 'friday';

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await updateSettings({
        appTitle: draft.appTitle.trim() || 'Z Vision',
        appLogoText: draft.appLogoText.trim().slice(0, 3) || 'Z',
        widgets: draftWidgets,
        weekendHighlight: draftWeekend,
        layout: draft.layout ?? settings.layout,
        prayer: {
          ...draft.prayer,
          cityName: draft.prayer.cityName.trim() || 'Custom',
          latitude: Number(draft.prayer.latitude) || 0,
          longitude: Number(draft.prayer.longitude) || 0,
          timezone: draft.prayer.timezone.trim() || 'UTC',
        },
      });
      setStatusMsg('Settings saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetCardOrder = async () => {
    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await resetLayout();
      setStatusMsg('Card layout reset to default arrangement.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reset layout.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = await fetchFullBackup();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ymd = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `z-vision-backup-${ymd}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Backup JSON downloaded.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to export backup.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setStatusMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const validated = validateBackupPayload(parsed);
      setPendingImport(validated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid backup JSON file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await importBackup(pendingImport, replaceJournalOnImport);
      setPendingImport(null);
      setStatusMsg('Backup imported and synced.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to import backup.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await resetDefaults(resetMode, clearJournalOnReset);
      setConfirmResetOpen(false);
      setStatusMsg(
        resetMode === 'blank'
          ? 'Workspace reset to blank template.'
          : 'Workspace reset to generic starter template.'
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reset dashboard.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmEraseAll = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await deleteAllAccountData();
      setConfirmEraseOpen(false);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to erase workspace.');
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Dashboard Settings"
        subtitle="Customize modules, card layout, branding, prayer location, and JSON backups."
        maxWidthClass="max-w-xl"
        footer={
          tab !== 'backup' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                form="settings-form"
                disabled={saving}
                className="btn-primary h-9 text-xs"
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Close
            </button>
          )
        }
      >
        <div className="inline-flex p-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-raised)] w-full">
          {(
            [
              { id: 'general', label: 'General & Modules' },
              { id: 'prayer', label: 'Prayer Location' },
              { id: 'backup', label: 'Backup & Data' },
            ] as { id: SettingsTab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setErrorMsg(null);
                setStatusMsg(null);
              }}
              className={`flex-1 h-8 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                tab === item.id
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-hairline)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {statusMsg && (
          <div className="px-3 py-2 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-xs text-[var(--accent)]">
            {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--semantic-negative-soft)] border border-[var(--semantic-negative-border)] text-xs text-[var(--semantic-negative)]">
            <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {tab !== 'backup' ? (
          <form
            id="settings-form"
            onSubmit={(e) => void handleSaveSettings(e)}
            className="space-y-4"
          >
            {tab === 'general' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label
                      className="text-xs font-medium text-[var(--text-secondary)]"
                      htmlFor="st-title"
                    >
                      Dashboard Name
                    </label>
                    <input
                      id="st-title"
                      type="text"
                      required
                      value={draft.appTitle}
                      onChange={(e) => setDraft({ ...draft, appTitle: e.target.value })}
                      className="field-input px-3 py-2"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-[var(--text-secondary)]"
                      htmlFor="st-logo"
                    >
                      Badge (1–3 chars)
                    </label>
                    <input
                      id="st-logo"
                      type="text"
                      maxLength={3}
                      required
                      value={draft.appLogoText}
                      onChange={(e) => setDraft({ ...draft, appLogoText: e.target.value })}
                      className="field-input px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)] block">
                    Visible Dashboard Modules
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: 'calendar', label: 'Calendar' },
                        { key: 'prayerTimes', label: 'Prayer Times' },
                        { key: 'ramadan', label: 'Ramadan Calendar' },
                        { key: 'fitness', label: 'Fitness Progress' },
                        { key: 'calories', label: 'Calorie Tracker' },
                        { key: 'journaling', label: 'Journaling' },
                      ] as { key: keyof DashboardWidgets; label: string }[]
                    ).map((mod) => {
                      const active = draftWidgets[mod.key];
                      return (
                        <button
                          key={mod.key}
                          type="button"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              widgets: { ...draftWidgets, [mod.key]: !active },
                            })
                          }
                          className={`px-3 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            active
                              ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--text-primary)]'
                              : 'bg-[var(--bg-raised)] border-[var(--border-hairline)] text-[var(--text-muted)]'
                          }`}
                        >
                          <span>{mod.label}</span>
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              active
                                ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-fg)]'
                                : 'border-[var(--border-strong)]'
                            }`}
                          >
                            {active && <CheckIcon className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {draftWidgets.calendar && (
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-[var(--text-secondary)]"
                      htmlFor="st-weekend"
                    >
                      Calendar Weekend Highlight
                    </label>
                    <select
                      id="st-weekend"
                      value={draftWeekend}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          weekendHighlight: e.target.value as WeekendHighlight,
                        })
                      }
                      className="field-input px-3 py-2"
                    >
                      <option value="friday">Friday</option>
                      <option value="sat-sun">Saturday &amp; Sunday</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                )}

                <div className="surface-raised p-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-[var(--text-primary)]">
                      Dashboard Card Order
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Drag cards inside Edit mode to reorder columns, or reset here.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleResetCardOrder()}
                    disabled={saving}
                    className="h-8 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcwIcon className="w-3.5 h-3.5" />
                    <span>Reset layout</span>
                  </button>
                </div>
              </>
            )}

            {tab === 'prayer' && (
              <PrayerLocationPicker
                value={draft.prayer}
                onChange={(nextPrayer) => setDraft({ ...draft, prayer: nextPrayer })}
              />
            )}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="surface-raised p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Export Full Backup
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Download all countdowns, missions, milestones, fitness, Ramadan, calorie logs, settings, and journal entries as JSON.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleExportBackup()}
                className="btn-primary h-9 px-3.5 text-xs"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Download JSON backup</span>
              </button>
            </div>

            <div className="surface-raised p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Import JSON Backup
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Restore data from a Z-Vision v1 or v2 backup file.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void handleFileChange(e)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer inline-flex items-center gap-2"
              >
                <UploadIcon className="w-3.5 h-3.5" />
                <span>Choose backup file…</span>
              </button>

              {pendingImport && (
                <div className="p-3 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-soft)] space-y-3">
                  <div className="text-xs text-[var(--text-primary)] space-y-1">
                    <p className="font-medium">Ready to restore backup:</p>
                    <p className="text-[var(--text-secondary)] font-mono">
                      {pendingImport.countdowns.length} countdowns ·{' '}
                      {pendingImport.vision.missions.length} missions ·{' '}
                      {pendingImport.fitness.metrics.length} fitness metrics ·{' '}
                      {pendingImport.journal.length} journal entries
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceJournalOnImport}
                      onChange={(e) => setReplaceJournalOnImport(e.target.checked)}
                    />
                    <span>Replace existing journal entries with backup entries</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleConfirmImport()}
                      disabled={saving}
                      className="btn-primary h-8 px-3 text-xs"
                    >
                      {saving ? 'Restoring…' : 'Confirm restore'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingImport(null)}
                      disabled={saving}
                      className="h-8 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="surface-raised p-4 space-y-3 border-[var(--semantic-negative-border)]">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[var(--semantic-negative)]">
                  Reset or Erase Workspace
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Reset your own account to a blank or generic example template, or erase everything and re-run setup.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResetMode('blank')}
                  className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${
                    resetMode === 'blank'
                      ? 'bg-[var(--bg-card)] border-[var(--accent)] text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
                  }`}
                >
                  Blank Workspace
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode('starter')}
                  className={`px-2.5 py-1 rounded text-xs border cursor-pointer ${
                    resetMode === 'starter'
                      ? 'bg-[var(--bg-card)] border-[var(--accent)] text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-hairline)] text-[var(--text-muted)]'
                  }`}
                >
                  Generic Example Template
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearJournalOnReset}
                  onChange={(e) => setClearJournalOnReset(e.target.checked)}
                />
                <span>Also delete all cloud journal &amp; calorie logs when resetting</span>
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="h-9 px-3.5 rounded-lg border border-[var(--semantic-negative-border)] bg-[var(--semantic-negative-soft)] text-xs font-medium text-[var(--semantic-negative)] hover:opacity-90 cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                  <span>Reset workspace…</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmEraseOpen(true)}
                  className="h-9 px-3.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--semantic-negative)] hover:border-[var(--semantic-negative-border)] cursor-pointer inline-flex items-center gap-2"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Erase &amp; restart setup…</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmResetOpen}
        title={
          resetMode === 'blank'
            ? 'Reset to Blank Workspace?'
            : 'Reset to Generic Example Template?'
        }
        description={
          clearJournalOnReset
            ? 'This will overwrite your countdowns, vision roadmap, and fitness metrics, AND permanently delete all your journal entries and calorie logs.'
            : 'This will overwrite your countdowns, vision roadmap, and fitness metrics. Your journal entries and module preferences will be kept.'
        }
        confirmLabel="Reset now"
        busy={saving}
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={handleConfirmReset}
      />

      <ConfirmDialog
        open={confirmEraseOpen}
        title="Erase All Workspace Data?"
        description="This permanently deletes all dashboard documents, calorie logs, and journal entries for this workspace and returns you to the initial onboarding setup."
        confirmLabel="Erase everything"
        busy={saving}
        onCancel={() => setConfirmEraseOpen(false)}
        onConfirm={handleConfirmEraseAll}
      />
    </>
  );
};

export default SettingsModal;
