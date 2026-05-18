import { useState, useCallback } from 'react';
import { dirtyKey } from '../utils/dirtyCellTracking';

/** Tracks which (rowId, field) pairs were edited in the current edit session. */
export function useDirtyCells() {
  const [dirtyCells, setDirtyCells] = useState(() => new Set());
  const hasUnappliedChanges = dirtyCells.size > 0;

  const markCellDirty = useCallback((rowId, field) => {
    setDirtyCells((prev) => {
      const k = dirtyKey(rowId, field);
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }, []);

  const resetDirtyCells = useCallback(() => setDirtyCells(new Set()), []);

  return { dirtyCells, hasUnappliedChanges, markCellDirty, resetDirtyCells };
}
