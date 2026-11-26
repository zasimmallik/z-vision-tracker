import React from 'react';
import {
  defaultAnimateLayoutChanges,
  useSortable,
  type AnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DashboardCardId } from '@z-vision/shared';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ColumnsIcon,
  GripVerticalIcon,
} from '../../shared/components/Icons';

interface SortableDashboardCardProps {
  id: DashboardCardId;
  label: string;
  isEditMode: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  stretchHeight?: boolean;
  showColumnMove?: boolean;
  columnTargetLabel?: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMoveColumn?: () => void;
  children: React.ReactNode;
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export const SortableDashboardCard: React.FC<SortableDashboardCardProps> = ({
  id,
  label,
  isEditMode,
  canMoveUp,
  canMoveDown,
  stretchHeight = false,
  showColumnMove = false,
  columnTargetLabel = 'Move column',
  onMoveUp,
  onMoveDown,
  onMoveColumn,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isEditMode,
    animateLayoutChanges,
    transition: {
      duration: 240,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-card-id={id}
      className={stretchHeight ? 'relative h-full flex flex-col' : 'relative'}
    >
      {isDragging && (
        <div
          aria-hidden="true"
          className="dnd-drop-placeholder absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        >
          <span className="px-3 py-1 rounded-full border border-[var(--accent-border)] bg-[var(--bg-card)]/80 text-[11px] font-mono font-medium text-[var(--accent)]">
            {label}
          </span>
        </div>
      )}

      <div
        className={
          stretchHeight
            ? `flex-1 flex flex-col transition-opacity duration-150 ${
                isDragging ? 'invisible pointer-events-none select-none' : ''
              }`
            : `transition-opacity duration-150 ${
                isDragging ? 'invisible pointer-events-none select-none' : ''
              }`
        }
      >
        {isEditMode && (
          <div className="mb-1.5 rounded-lg border border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)] flex items-center justify-between gap-1.5 overflow-hidden">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-mono font-medium text-[var(--accent)] cursor-grab active:cursor-grabbing touch-none min-w-0 select-none"
              aria-label={`Drag ${label} card`}
            >
              <GripVerticalIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>

            <div
              className="flex items-center gap-1 pr-2 py-1 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {onMoveUp && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={!canMoveUp}
                  className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                  aria-label={`Move ${label} up`}
                  title="Move up"
                >
                  <ArrowUpIcon className="w-3 h-3" />
                </button>
              )}
              {onMoveDown && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={!canMoveDown}
                  className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer transition-colors"
                  aria-label={`Move ${label} down`}
                  title="Move down"
                >
                  <ArrowDownIcon className="w-3 h-3" />
                </button>
              )}
              {showColumnMove && onMoveColumn && (
                <button
                  type="button"
                  onClick={onMoveColumn}
                  className="px-1.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1 transition-colors"
                  aria-label={`Move ${label} to ${columnTargetLabel}`}
                  title={`Move to ${columnTargetLabel}`}
                >
                  <ColumnsIcon className="w-3 h-3" />
                  <span className="hidden xl:inline">{columnTargetLabel}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {stretchHeight ? (
          <div className="flex-1 flex flex-col">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
