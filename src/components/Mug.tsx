import { useId } from 'react';
import { additionLabel, layersOf } from '../lib/recipes';
import type { Addition, CupLayer } from '../lib/types';

/**
 * The one cup, used everywhere a cup is drawn: on the machine and in the
 * orders. It is glass: a light rim around a dark inside, so every layer
 * (espresso, chocolate, milk, foam, water) shows against it.
 */
const CUP = 'M12 12 H84 L76 66 Q74 74 66 74 H30 Q22 74 20 66 Z';
const HANDLE = 'M84 24 Q102 24 102 42 Q102 60 80 60';

export interface MugProps {
  /** What is in the cup, bottom to top. */
  contents?: Addition[];
  /** What is going in right now, and how far along it is (0–1): it rises from the top of the rest. */
  pouring?: { addition: Addition; progress: number };
  /** What the cup should end up holding, drawn faintly behind (an order's recipe). */
  target?: Addition[];
  /** Crossed out: the order was declined. */
  declined?: boolean;
  width?: number | string;
  height?: number | string;
  /** Position, when the cup is drawn inside another SVG. */
  x?: number;
  y?: number;
  /** Outline colour: light on the dark page, dark on the machine. */
  ink?: string;
  /** The cup's inside, behind the layers. */
  inside?: string;
  /** A colour to trace around the cup, as around the machine's parts. */
  halo?: string;
  /** A dashed ghost of the cup to come: the outline dashed, only the target showing, faintly. */
  dashed?: boolean;
}

/** Bands stacked from the cup's foot (y 82 in the viewBox) upward. */
function stack(layers: CupLayer[]): Array<CupLayer & { y: number }> {
  let top = 82;
  return layers.map((l) => ((top -= l.h), { ...l, y: top }));
}

export function Mug({
  contents = [],
  pouring,
  target,
  declined = false,
  width = 76,
  height = 56,
  x,
  y,
  ink = '#faf9f5',
  inside = '#1d1d1b',
  halo,
  dashed = false,
}: MugProps) {
  const clipId = `mug-${useId().replace(/:/g, '')}`;
  const shown = declined || dashed ? [] : contents;
  const solid = stack(shown.flatMap(layersOf));
  // What is going in rises from the top of what is in, eased linearly between
  // the bar's ticks, so a pour fills smoothly rather than in steps.
  const top = solid.length ? solid[solid.length - 1].y : 82;
  const incoming = pouring && !dashed ? stack([{ color: '', h: 82 - top }, ...layersOf(pouring.addition)]).slice(1) : [];
  const incomingH = incoming.reduce((h, l) => h + l.h, 0);
  const ghost = declined ? [] : stack((target ?? []).flatMap(layersOf));

  const label = declined
    ? 'declined'
    : shown.length || pouring
      ? [...shown, ...(pouring ? [pouring.addition] : [])].map(additionLabel).join(', ')
      : 'empty cup';

  // The viewBox runs to 108: the handle curves out to x≈102, plus half its stroke.
  return (
    <svg x={x} y={y} width={width} height={height} viewBox="0 0 108 80" role="img" aria-label={label} overflow="visible">
      {halo ? (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* a dark keyline outside the ring, then the ring */}
          <g stroke="#0a0a09" strokeWidth="24">
            <path d={CUP} />
            <path d={HANDLE} />
          </g>
          <g stroke={halo} strokeWidth="16">
            <path d={CUP} />
            <path d={HANDLE} />
          </g>
          <g stroke="#0a0a09" strokeWidth="9">
            <path d={CUP} />
            <path d={HANDLE} />
          </g>
        </g>
      ) : null}
      <clipPath id={clipId}>
        <path d={CUP} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="12" width="100" height="70" fill={inside} />
        {ghost.map((b, i) => (
          <rect key={`g${i}`} x="0" y={b.y} width="100" height={b.h} fill={b.color} opacity={0.25} />
        ))}
        {solid.map((b, i) => (
          <rect key={`s${i}`} x="0" y={b.y} width="100" height={b.h} fill={b.color} />
        ))}
        {incoming.length ? (
          <g
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'bottom',
              transform: `scaleY(${Math.max(0, Math.min(1, pouring!.progress))})`,
              transition: 'transform 260ms linear',
            }}
          >
            {/* a clear rect makes the group's box the whole incoming band, so it scales from its foot */}
            <rect x="0" y={top - incomingH} width="100" height={incomingH} fill="none" />
            {incoming.map((b, i) => (
              <rect key={`p${i}`} x="0" y={b.y} width="100" height={b.h} fill={b.color} />
            ))}
          </g>
        ) : null}
      </g>
      <g opacity={dashed ? 0.5 : 1} strokeDasharray={dashed ? '7 6' : undefined}>
        <path d={CUP} stroke={ink} strokeWidth="5" fill="none" strokeLinejoin="round" />
        <path d={HANDLE} stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
      {declined ? <path d="M30 30 L66 60 M66 30 L30 60" stroke="#f0565f" strokeWidth="5" strokeLinecap="round" /> : null}
    </svg>
  );
}
