import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNumberPop, useTextSwap } from './motion';

/**
 * 04-text-states-swap.md. Swaps a status string in place: the old line
 * exits up through a blur, the new one rises in from below.
 */
export function TextSwap({ text, className }: { text: string; className?: string }) {
  const { ref, shown } = useTextSwap(text);
  return (
    <span
      ref={ref as React.RefObject<HTMLSpanElement>}
      className={`t-text-swap ${className ?? ''}`}
      title={text}
    >
      {shown}
    </span>
  );
}

/**
 * 02-number-pop-in.md. Each character re-enters from below with blur when
 * the value changes; the last two characters ride in on the stagger.
 */
export function PopNumber({ value, className }: { value: string; className?: string }) {
  const { key, className: groupClass } = useNumberPop(value);
  const chars = value.split('');
  return (
    <span key={key} className={`${groupClass} tnum ${className ?? ''}`}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="t-digit"
          data-stagger={i === chars.length - 2 ? '1' : i === chars.length - 1 ? '2' : undefined}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** 21-accordion.md. Header button plus a grid-rows panel; no JS measuring. */
export function Accordion({
  open,
  onToggle,
  label,
  right,
  children,
  id,
}: {
  open: boolean;
  onToggle: () => void;
  label: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="t-acc flex min-w-0 flex-col" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="t-acc-head flex min-w-0 items-center gap-2 text-left text-[13px] text-[#a8a49c] hover:text-[#faf9f5]"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className="t-acc-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="min-w-0 truncate">{label}</span>
        {right ? <span className="ml-auto min-w-0 shrink-0 truncate normal-case">{right}</span> : null}
      </button>
      <div className="t-acc-panel" id={id}>
        <div className="t-acc-panel-inner">
          <div className="pt-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 10-success-check.md. The dasharray is measured from the real path with
 * getTotalLength() on mount, so the stroke draws exactly once.
 */
export function SuccessCheck({ show, size = 20 }: { show: boolean; size?: number }) {
  const wrapper = useRef<HTMLSpanElement | null>(null);
  const [state, setState] = useState<'in' | 'out'>('out');

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const path = el.querySelector('path');
    if (path) {
      const len = Math.ceil(path.getTotalLength());
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    }
    if (show) {
      el.setAttribute('data-state', 'out');
      void el.offsetWidth;
      setState('in');
    } else {
      setState('out');
    }
  }, [show]);

  return (
    <span ref={wrapper} className="t-success-check shrink-0" data-state={state} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <path
          d="M4 10 L8 14 L16 6"
          stroke="#34d399"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** 22-toast.md. A row that rises into place the first time it mounts. */
export function RiseIn({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return <Tag className={`t-toast ${open ? 'is-open' : ''} ${className ?? ''}`}>{children}</Tag>;
}
