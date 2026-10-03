import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Read a motion token (ms) off :root, with a fallback for SSR. */
export function tokenMs(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/**
 * 04-text-states-swap.md, as a hook. Returns a ref to put on a
 * `.t-text-swap` element plus the text it should currently render: the
 * old string stays mounted while it exits, then the new one rises in.
 */
export function useTextSwap(next: string) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(next);
  const pending = useRef(next);

  useEffect(() => {
    pending.current = next;
    const el = ref.current;
    if (!el || next === shown) return;
    const dur = tokenMs('--text-swap-dur', 150);
    el.classList.add('is-exit');
    const id = setTimeout(() => {
      setShown(pending.current);
      el.classList.remove('is-exit');
      el.classList.add('is-enter-start');
      void el.offsetHeight;
      el.classList.remove('is-enter-start');
    }, dur);
    return () => clearTimeout(id);
  }, [next, shown]);

  return { ref, shown };
}

/**
 * 02-number-pop-in.md, as a hook. Replays the digit animation whenever
 * `value` changes: the group is keyed by value so React remounts the
 * spans, and `is-animating` is added on the next frame.
 */
export function useNumberPop(value: string): { key: string; className: string } {
  const [armed, setArmed] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setArmed(false);
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return { key: value, className: `t-digit-group${armed ? ' is-animating' : ''}` };
}

/**
 * 16-tabs-sliding.md, as a hook. Measures the selected tab and writes
 * its offset/width onto the pill; the first paint and any resize snap
 * without a transition.
 */
export function useSlidingPill(selectedIndex: number) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const animate = useRef(false);

  useLayoutEffect(() => {
    const move = (withMotion: boolean) => {
      const bar = barRef.current;
      const pill = pillRef.current;
      if (!bar || !pill) return;
      const tabs = [...bar.querySelectorAll<HTMLElement>('.t-tab')];
      const tab = tabs[selectedIndex] ?? tabs[0];
      if (!tab) return;
      if (!withMotion) {
        const prev = pill.style.transition;
        pill.style.transition = 'none';
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
        void pill.offsetWidth;
        pill.style.transition = prev;
      } else {
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
      }
    };
    move(animate.current);
    animate.current = true;
    const onResize = () => move(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [selectedIndex]);

  return { barRef, pillRef };
}

/**
 * For a transient thing (a knock box, a chocolate bottle): `'in'` while it is
 * needed, `'out'` for `ms` after (so it can animate away), then `null`.
 */
export function useLingering(active: boolean, ms: number): 'in' | 'out' | null {
  const [leaving, setLeaving] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    setLeaving(!active);
  }
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setLeaving(false), ms);
    return () => clearTimeout(id);
  }, [leaving, ms]);
  return active ? 'in' : leaving ? 'out' : null;
}
