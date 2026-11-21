import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, RotateCcw } from 'lucide-react';
import { TextBoxLayoutItem } from '../types/ledger';

interface MovableResizableBoxProps {
  id?: string;
  label: string;
  layout?: TextBoxLayoutItem;
  editMode: boolean;
  readOnly?: boolean;
  onChangeLayout: (next: TextBoxLayoutItem | null) => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  children: React.ReactNode;
}

const SNAP_GRID_PX = 16;

function snapValue(val: number, free: boolean): number {
  if (free) return Math.round(val);
  return Math.round(val / SNAP_GRID_PX) * SNAP_GRID_PX;
}

export const MovableResizableBox: React.FC<MovableResizableBoxProps> = ({
  id,
  label,
  layout,
  editMode,
  readOnly = false,
  onChangeLayout,
  minWidth = 240,
  minHeight = 160,
  maxWidth = 1360,
  maxHeight = 1000,
  className = '',
  children,
}) => {
  const canManipulate = editMode && !readOnly;
  const boxRef = useRef<HTMLElement | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [activeAction, setActiveAction] = useState<'move' | 'resize' | null>(null);
  const [altBypass, setAltBypass] = useState(false);
  const [draftLayout, setDraftLayout] = useState<TextBoxLayoutItem | null>(null);

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effective = draftLayout ?? layout ?? {};
  const x = effective.x ?? 0;
  const y = effective.y ?? 0;
  const width = effective.width;
  const height = effective.height;

  const isCustomized =
    (layout?.x !== undefined && layout.x !== 0) ||
    (layout?.y !== undefined && layout.y !== 0) ||
    layout?.width !== undefined ||
    layout?.height !== undefined;

  const hasPositionOffset = x !== 0 || y !== 0;

  const handleMovePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canManipulate || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = boxRef.current?.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: layout?.x ?? 0,
      startY: layout?.y ?? 0,
      startWidth: layout?.width ?? Math.round(rect?.width ?? minWidth),
      startHeight: layout?.height ?? Math.round(rect?.height ?? minHeight),
    };
    setAltBypass(e.altKey);
    setActiveAction('move');
    setDraftLayout({ ...(layout ?? {}) });
  };

  const handleMovePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeAction !== 'move' || !dragStartRef.current) return;
    const free = e.altKey;
    setAltBypass(free);
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    const nextX = Math.max(
      -1200,
      Math.min(1200, snapValue(dragStartRef.current.startX + dx, free))
    );
    const nextY = Math.max(
      -1200,
      Math.min(1200, snapValue(dragStartRef.current.startY + dy, free))
    );
    setDraftLayout({
      ...(layout ?? {}),
      x: nextX,
      y: nextY,
    });
  };

  const handleMovePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeAction !== 'move') return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const finalLayout = draftLayout;
    setActiveAction(null);
    setAltBypass(false);
    setDraftLayout(null);
    dragStartRef.current = null;
    if (finalLayout) {
      onChangeLayout(finalLayout);
    }
  };

  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    axes: 'both' | 'x' | 'y'
  ) => {
    if (!canManipulate || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = boxRef.current?.getBoundingClientRect();
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: layout?.x ?? 0,
      startY: layout?.y ?? 0,
      startWidth: Math.round(rect?.width ?? layout?.width ?? minWidth),
      startHeight: Math.round(rect?.height ?? layout?.height ?? minHeight),
    };
    e.currentTarget.dataset.axes = axes;
    setAltBypass(e.altKey);
    setActiveAction('resize');
    setDraftLayout({ ...(layout ?? {}) });
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeAction !== 'resize' || !dragStartRef.current) return;
    const free = e.altKey;
    setAltBypass(free);
    const axes = (e.currentTarget.dataset.axes as 'both' | 'x' | 'y') ?? 'both';
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    const next: TextBoxLayoutItem = { ...(layout ?? {}) };
    if (axes === 'both' || axes === 'x') {
      next.width = Math.max(
        minWidth,
        Math.min(maxWidth, snapValue(dragStartRef.current.startWidth + dx, free))
      );
    }
    if (axes === 'both' || axes === 'y') {
      next.height = Math.max(
        minHeight,
        Math.min(maxHeight, snapValue(dragStartRef.current.startHeight + dy, free))
      );
    }
    setDraftLayout(next);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeAction !== 'resize') return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const finalLayout = draftLayout;
    setActiveAction(null);
    setAltBypass(false);
    setDraftLayout(null);
    dragStartRef.current = null;
    if (finalLayout) {
      onChangeLayout(finalLayout);
    }
  };

  const boxStyle: React.CSSProperties = {};
  if (isDesktop) {
    if (hasPositionOffset) {
      boxStyle.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    if (width !== undefined) {
      boxStyle.width = `${width}px`;
      boxStyle.maxWidth = '100%';
    }
  }
  if (height !== undefined) {
    boxStyle.height = `${height}px`;
  }

  return (
    <section
      ref={boxRef}
      id={id}
      style={boxStyle}
      className={`relative ${className} ${
        activeAction
          ? 'z-30 ring-1 ring-[#c084fc] shadow-2xl select-none'
          : hasPositionOffset && isDesktop
          ? 'z-10'
          : ''
      } ${
        canManipulate
          ? 'outline-1 outline-dashed outline-[#a855f7]/55 outline-offset-2'
          : ''
      }`}
    >
      {/* Visual Alignment Guide Hairlines (shown while dragging or resizing) */}
      {activeAction && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible z-40"
        >
          <span className="absolute -top-px -left-12 -right-12 border-t border-dashed border-[#c084fc]/60" />
          <span className="absolute -bottom-px -left-12 -right-12 border-t border-dashed border-[#c084fc]/45" />
          <span className="absolute -left-px -top-12 -bottom-12 border-l border-dashed border-[#c084fc]/60" />
          <span className="absolute -right-px -top-12 -bottom-12 border-l border-dashed border-[#c084fc]/45" />
        </div>
      )}

      {/* Edit Mode Move & Size Control Strip */}
      {canManipulate && (
        <div className="print-hide flex items-center justify-between gap-2 -mx-1 -mt-1 mb-1 px-2 py-1 rounded bg-[#171022]/90 border border-[#581c87]/70">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Drag to move ${label}`}
            title={`Drag to move ${label} (snaps to 16px grid; hold Alt for free placement)`}
            onPointerDown={handleMovePointerDown}
            onPointerMove={handleMovePointerMove}
            onPointerUp={handleMovePointerUp}
            onPointerCancel={handleMovePointerUp}
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#c084fc] cursor-grab active:cursor-grabbing touch-none select-none flex-1 min-w-0"
          >
            <GripHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {activeAction === 'move'
                ? `Moving (${x >= 0 ? `+${x}` : x}, ${y >= 0 ? `+${y}` : y})`
                : activeAction === 'resize'
                ? `Resizing (${width ?? 'auto'}×${height ?? 'auto'})`
                : 'Drag to move · Resize corner'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`hidden sm:inline font-mono text-[9px] uppercase px-1 py-0.5 rounded border ${
                activeAction && altBypass
                  ? 'border-[#4af626]/60 text-[#4af626] bg-[#4af626]/10'
                  : 'border-[#2e243b] text-[#9eb0a7] bg-[#080c0a]'
              }`}
              title="Snaps to 16px grid by default. Hold Alt while dragging to bypass."
            >
              {activeAction && altBypass ? 'FREE' : '16px'}
            </span>
            {(isCustomized || activeAction) && (
              <span className="hidden sm:inline font-mono text-[10px] text-[#9eb0a7] tabular-nums">
                {width ? `${width}w` : 'auto'} × {height ? `${height}h` : 'auto'}
              </span>
            )}
            {isCustomized && (
              <button
                type="button"
                onClick={() => onChangeLayout(null)}
                title={`Reset ${label} position and size`}
                aria-label={`Reset ${label} position and size`}
                className="px-1.5 py-0.5 rounded bg-[#080c0a] border border-[#2e243b] hover:border-[#c084fc] text-[10px] font-mono text-[#9eb0a7] hover:text-[#d4e0da] inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      )}

      {children}

      {/* Edit Mode Resize Handles (Right Edge, Bottom Edge, Bottom-Right Corner) */}
      {canManipulate && (
        <>
          {isDesktop && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize ${label} width`}
              onPointerDown={(e) => handleResizePointerDown(e, 'x')}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              className="absolute top-8 bottom-5 -right-1 w-2.5 cursor-ew-resize touch-none group"
              title="Drag to resize width"
            >
              <span className="absolute inset-y-4 right-0.5 w-0.5 rounded bg-[#581c87]/0 group-hover:bg-[#c084fc]/80 transition-colors" />
            </div>
          )}

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label={`Resize ${label} height`}
            onPointerDown={(e) => handleResizePointerDown(e, 'y')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="absolute left-5 right-6 -bottom-1 h-2.5 cursor-ns-resize touch-none group"
            title="Drag to resize height"
          >
            <span className="absolute inset-x-6 bottom-0.5 h-0.5 rounded bg-[#581c87]/0 group-hover:bg-[#c084fc]/80 transition-colors" />
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label={`Resize ${label}`}
            title="Drag corner to resize"
            onPointerDown={(e) => handleResizePointerDown(e, isDesktop ? 'both' : 'y')}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            onPointerCancel={handleResizePointerUp}
            className="absolute bottom-0.5 right-0.5 w-5 h-5 cursor-nwse-resize touch-none flex items-end justify-end p-0.5 text-[#c084fc]/85 hover:text-[#c084fc]"
          >
            <svg
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="w-3.5 h-3.5"
              aria-hidden="true"
            >
              <path d="M10.5 3.5L3.5 10.5" />
              <path d="M10.5 7.5L7.5 10.5" />
            </svg>
          </div>
        </>
      )}
    </section>
  );
};
