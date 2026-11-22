import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
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
  } = useSortable({ id, disabled: !isEditMode });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={stretchHeight ? 'relative h-full flex flex-col' : 'relative'}
    >
      {isEditMode && (
        <div className="mb-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)] flex items-center justify-between gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[var(--accent)] cursor-grab active:cursor-grabbing touch-none min-w-0"
            aria-label={`Drag ${label} card`}
          >
            <GripVerticalIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
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
                className="p-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
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
                className="px-1.5 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-card)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer inline-flex items-center gap-1"
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
  );
};
