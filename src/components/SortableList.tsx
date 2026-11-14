'use client';

import React, { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

/**
 * Where a dragged row lands: how many other rows' midpoints sit above the dragged row's midpoint.
 * mids = page-Y midpoints of all rows (in list order) measured when the drag started.
 */
export function computeDropIndex(mids: number[], fromIndex: number, draggedMid: number): number {
  let index = 0;
  for (let i = 0; i < mids.length; i++) {
    if (i !== fromIndex && mids[i] < draggedMid) index++;
  }
  return index;
}

interface SortableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onMove: (fromIndex: number, toIndex: number) => void;
}

interface DragState {
  index: number;
  startY: number; // page Y at pointer down
  dy: number;
  mids: number[];
  heights: number[];
}

/** Touch-friendly drag-to-reorder list: press the grip, drag, release. */
export function SortableList<T>({ items, getKey, renderItem, onMove }: SortableListProps<T>) {
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);

  const target = drag ? computeDropIndex(drag.mids, drag.index, drag.mids[drag.index] + drag.dy) : -1;
  const gap = 8; // matches space-y-2

  const handleDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rects = rowRefs.current.slice(0, items.length).map(el => el?.getBoundingClientRect());
    setDrag({
      index,
      startY: e.clientY + window.scrollY,
      dy: 0,
      mids: rects.map(r => (r ? r.top + window.scrollY + r.height / 2 : 0)),
      heights: rects.map(r => r?.height || 0)
    });
    try { navigator.vibrate?.(10); } catch { /* ignore */ }
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!drag) return;
    // nudge the page when dragging near the screen edges
    if (e.clientY < 90) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - 110) window.scrollBy(0, 12);
    setDrag({ ...drag, dy: e.clientY + window.scrollY - drag.startY });
  };

  const handleUp = () => {
    if (!drag) return;
    if (target !== drag.index) onMove(drag.index, target);
    setDrag(null);
  };

  // rows between the old and new slot slide out of the way
  const shiftFor = (i: number) => {
    if (!drag || i === drag.index) return 0;
    const h = drag.heights[drag.index] + gap;
    if (drag.index < target && i > drag.index && i <= target) return -h;
    if (drag.index > target && i < drag.index && i >= target) return h;
    return 0;
  };

  return (
    <ul className="space-y-2 select-none">
      {items.map((item, i) => {
        const isDragging = drag?.index === i;
        return (
          <li
            key={getKey(item)}
            ref={el => {
              rowRefs.current[i] = el;
            }}
            className={`relative flex items-center gap-2 rounded-2xl bg-white ring-1 ring-slate-200/70 pl-1 pr-3 py-2 ${
              isDragging ? 'z-10 shadow-lg ring-emerald-400 scale-[1.02]' : drag ? 'transition-transform duration-150' : ''
            }`}
            style={{ transform: `translateY(${isDragging ? drag.dy : shiftFor(i)}px)` }}
          >
            <button
              type="button"
              aria-label="ลากเพื่อย้ายตำแหน่ง"
              onPointerDown={e => handleDown(e, i)}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerCancel={() => setDrag(null)}
              className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">{renderItem(item, i)}</div>
          </li>
        );
      })}
    </ul>
  );
}
