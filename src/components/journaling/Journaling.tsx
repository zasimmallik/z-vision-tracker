import React, { useState } from 'react';
import { useVisionData } from '../../context/VisionDataContext';
import { EditIcon, TrashIcon } from '../shared/Icons';

const Journaling: React.FC = () => {
  const { journal: entries, addJournalEntry, updateJournalEntry, deleteJournalEntry } =
    useVisionData();
  const [newEntry, setNewEntry] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const handleAddEntry = async () => {
    const trimmed = newEntry.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await addJournalEntry(trimmed);
      setNewEntry('');
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (id: string, currentContent: string) => {
    setEditingId(id);
    setEditDraft(currentContent);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateJournalEntry(id, trimmed);
      setEditingId(null);
      setEditDraft('');
    } finally {
      setSavingEdit(false);
    }
  };

  const formatDateLabel = (createdAt: number): string => {
    const date = new Date(createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatTimeLabel = (createdAt: number): string => {
    return new Date(createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAddEntry();
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a note"
          className="field-input p-3 resize-none"
          rows={3}
        />
        <div className="flex items-center justify-end sm:justify-between gap-2">
          <span className="hidden sm:inline text-xs text-[var(--text-muted)]">
            Press <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-hairline)] bg-[var(--bg-raised)] font-mono text-[11px] text-[var(--text-secondary)]">Enter</kbd> to save
          </span>
          <button
            type="button"
            onClick={() => void handleAddEntry()}
            disabled={!newEntry.trim() || submitting}
            className="btn-primary w-full sm:w-auto"
          >
            {submitting ? 'Saving…' : 'Add entry'}
          </button>
        </div>
      </div>

      <div className="space-y-3 scrollbar-hide lg:max-h-[24rem] lg:overflow-y-auto">
        {entries.length === 0 ? (
          <div className="surface-raised py-8 px-4 text-center space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">No entries yet</p>
            <p className="text-xs text-[var(--text-muted)]">
              Record daily reflections and progress notes
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const isEditing = editingId === entry.id;

            return (
              <div
                key={entry.id}
                className="group surface-raised p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                    <span className="text-[var(--text-secondary)] font-medium">
                      {formatDateLabel(entry.createdAt)}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">{formatTimeLabel(entry.createdAt)}</span>
                    {entry.updatedAt && (
                      <span className="text-[11px] text-[var(--text-muted)]">(edited)</span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                      <button
                        type="button"
                        onClick={() => startEditing(entry.id, entry.content)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                        aria-label="Edit entry"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteJournalEntry(entry.id)}
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--semantic-negative)] hover:bg-[var(--semantic-negative-soft)] cursor-pointer transition-colors"
                        aria-label="Delete entry"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="field-input p-2.5 resize-y text-sm"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                        className="h-8 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(entry.id)}
                        disabled={!editDraft.trim() || savingEdit}
                        className="btn-primary h-8 px-3 text-xs"
                      >
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Journaling;
