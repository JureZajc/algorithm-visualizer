"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface OverflowAxes {
  x: boolean;
  y: boolean;
}

const NO_OVERFLOW: OverflowAxes = { x: false, y: false };

/** Matches the global focus ring on buttons and inputs, plus a soft halo for large surfaces. */
export const surfaceFocusClassName =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-indigo-500/25 focus-visible:ring-4 focus-visible:ring-indigo-100";

function overflowArrows({ x, y }: OverflowAxes) {
  if (x && y) return "↔ ↕";
  return x ? "↔" : "↕";
}

/**
 * A scroller for visualizations that can outgrow their panel. While the content overflows,
 * it shows a "Scroll to explore" hint and becomes a labelled tab stop, so the keyboard can
 * scroll it. Set `focusable` to false when the content has its own tab stop that scrolls
 * into view on focus, such as an editable grid.
 */
export function OverflowFrame({
  caption,
  children,
  className,
  focusable = true,
  label,
}: {
  /** Short text shown above the frame, beside the hint, such as an item count. */
  caption?: ReactNode;
  children: ReactNode;
  /** Classes for the scrolling element: size caps, border, background, padding. */
  className?: string;
  focusable?: boolean;
  /** Accessible name of the frame while it is a tab stop. */
  label: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflow, setOverflow] = useState<OverflowAxes>(NO_OVERFLOW);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;

    function measure() {
      if (!frame) return;
      // One pixel of slack absorbs subpixel rounding.
      const x = frame.scrollWidth > frame.clientWidth + 1;
      const y = frame.scrollHeight > frame.clientHeight + 1;
      setOverflow((current) => (current.x === x && current.y === y ? current : { x, y }));
    }

    // The frame resizes with the page; its children resize as steps change the content.
    const resizeObserver = new ResizeObserver(measure);
    function observe() {
      if (!frame) return;
      resizeObserver.disconnect();
      resizeObserver.observe(frame);
      for (const child of Array.from(frame.children)) resizeObserver.observe(child);
    }
    const mutationObserver = new MutationObserver(() => {
      observe();
      measure();
    });

    observe();
    mutationObserver.observe(frame, { childList: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const isOverflowing = overflow.x || overflow.y;
  const isTabStop = isOverflowing && focusable;

  return (
    <div className="min-w-0">
      {caption || isOverflowing ? (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600">
          {caption ? <span>{caption}</span> : null}
          {isOverflowing ? (
            <span className="ml-auto inline-flex items-center gap-1.5" id={hintId}>
              <span aria-hidden="true">{overflowArrows(overflow)}</span>
              Scroll to explore
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        aria-describedby={isTabStop ? hintId : undefined}
        aria-label={isTabStop ? label : undefined}
        className={`overflow-auto ${isTabStop ? surfaceFocusClassName : ""} ${className ?? ""}`}
        ref={frameRef}
        role={isTabStop ? "group" : undefined}
        tabIndex={isTabStop ? 0 : undefined}
      >
        {children}
      </div>
    </div>
  );
}
