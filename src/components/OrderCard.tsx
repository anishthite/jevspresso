import { assignCups, cupFor, MILK_TYPES } from '../lib/legal';
import { additionLabel, targetOf } from '../lib/recipes';
import type { ActiveStep, Bar, BaristaMove, Drink } from '../lib/types';
import { blockedBy, drinkName, type HandsView, type ViewBar } from '../lib/view';
import { HandIcon } from './Machine';
import { Mug } from './Mug';
import { RiseIn, SuccessCheck } from './Transitions';

const STEP_VERB: Record<string, string> = {
  place_cup: 'Placing cup',
  present_cup: 'Bringing cup forward',
  pour_milk: 'Pouring milk',
  grind_beans: 'Grinding',
  knock_out: 'Knocking out',
  tamp: 'Tamping',
  lock_in: 'Locking in',
  extract: 'Pulling shot',
  steam_milk: 'Steaming',
  add_water: 'Adding water',
  add_chocolate: 'Adding chocolate',
  serve: 'Serving',
  dump_cup: 'Pouring away',
  return_cup: 'Sliding back',
  put_away_cup: 'Putting away',
};

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="shrink-0">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1" />
      <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
    </svg>
  );
}

/** One pip per thing the recipe puts in the cup: green once its cup has it, blue while it goes in. */
function Pips({ total, done, running }: { total: number; done: number; running: boolean }) {
  return (
    <ul className="flex items-center gap-1" aria-label={`${done} of ${total} in the cup`}>
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className="m-settle h-1 w-3.5 shrink-0 rounded-sm"
          style={{ background: i < done ? '#34d399' : i === done && running ? '#5aa9ff' : '#3a3936' }}
        />
      ))}
    </ul>
  );
}

export interface OrderCardProps {
  drink: Drink;
  ctx: ViewBar;
  /** Both baristas' busy hands. */
  hands: HandsView[];
  /** The served cup has flown here from the machine; until then the card holds a dashed ghost of it. */
  landed: boolean;
  /**
   * Working the bar by hand: pick this order (its milk is steamed first), and
   * the order's own actions (swap milk, decline) when the bar accepts them.
   */
  interact?: {
    can: (move: BaristaMove) => boolean;
    act: (move: BaristaMove) => void;
    selected: boolean;
    onSelect: () => void;
  };
}

const PILL = 'rounded-full border px-2 py-0.5 text-[11px] font-medium bg-[#141413]';

export function OrderCard({ drink, ctx, hands, landed, interact }: OrderCardProps) {
  const { now } = ctx;
  // The cup on its way to being this drink, if any: cups belong to no order until served.
  const assigned = assignCups(ctx);
  const cup = cupFor(ctx, drink.id, assigned);
  const running: ActiveStep | undefined = cup ? ctx.activeSteps.find((a) => a.cupId === cup.id) : undefined;
  const handsHere = hands.find((h) => h.drink?.id === drink.id) ?? null;
  const yours = handsHere?.who === 'you';
  const blocked = blockedBy(drink, ctx);
  const wrong = drink.served && !drink.served.correct;
  // What happened to it, beyond the recipe: the wrong drink handed over, a milk swap.
  const aside = wrong
    ? { text: `Got ${drink.served!.contents.map(additionLabel).join(' + ') || 'an empty cup'}`, tone: 'text-[#ff9aa0]' }
    : drink.note && drink.status !== 'declined'
      ? { text: drink.note[0].toUpperCase() + drink.note.slice(1), tone: 'text-[#ffc48a]' }
      : null;
  // The order's own actions a person can take, when the bar accepts them.
  const own: Array<{ event: BaristaMove; label: string; tone: string }> = interact
    ? [
        ...MILK_TYPES.map((milk) => ({
          event: { type: 'barista.substituteMilk', drinkId: drink.id, milk } as BaristaMove,
          label: `Use ${milk === 'half' ? 'half & half' : milk}`,
          tone: 'border-[#6b6862] text-[#faf9f5]',
        })),
        { event: { type: 'barista.decline', drinkId: drink.id } as BaristaMove, label: 'Decline', tone: 'border-[#f0565f] text-[#ff9aa0]' },
      ].filter((a) => interact.can(a.event))
    : [];
  const target = targetOf(drink);
  const served = drink.status === 'served';
  const declined = drink.status === 'declined';

  const waited = Math.round(((ctx.servedAt[drink.id] ?? now) - drink.orderedAt) / 1000);
  const mods = [
    drink.mods.milk !== 'none' ? drink.mods.milk : null,
    drink.mods.size !== 'regular' ? drink.mods.size : null,
    drink.mods.decaf ? 'decaf' : null,
    drink.mods.iced ? 'iced' : null,
  ].filter(Boolean);

  const ring = interact?.selected ? 'outline-2 outline-offset-2 outline-[#d97757]' : '';
  const frame = handsHere
    ? `${yours ? 'border-[#e8845f]' : 'border-[#faf9f5]'} border-2 bg-[#1d1d1b]`
    : declined
      ? 'border-[#f0565f] bg-[#1d1d1b]'
      : served
        ? 'border-dashed border-[#2a2a28] opacity-60'
        : running
          ? 'border-[#5aa9ff] bg-[#1d1d1b]'
          : 'border-[#2a2a28] bg-[#1d1d1b]';

  const status = handsHere ? (
    <span className={`flex min-w-0 items-center gap-1.5 ${yours ? 'text-[#f5b69c]' : 'text-[#faf9f5]'}`}>
      <HandIcon size={13} />
      <span className="min-w-0 truncate">{yours ? `You: ${handsHere.label}` : handsHere.label}</span>
      <span className="secs shrink-0 opacity-80">{handsHere.secondsLeft.toFixed(1)}s</span>
    </span>
  ) : served ? (
    <span className={`flex items-center gap-1.5 ${wrong ? 'text-[#ff9aa0]' : 'text-[#8ee6b4]'}`}>
      {wrong ? 'Wrong drink' : <SuccessCheck show size={14} />}
      <span className="tnum">{waited}s</span>
    </span>
  ) : declined ? (
    <span className="min-w-0 truncate text-[#ff9aa0]" title={drink.note}>
      Declined
    </span>
  ) : running ? (
    <span className="flex min-w-0 items-center gap-1.5 text-[#9fd0ff]">
      <span className="min-w-0 truncate">{STEP_VERB[running.stepId] ?? running.stepId}</span>
      <span className="secs shrink-0">{Math.max(0, (running.endsAt - now) / 1000).toFixed(1)}s</span>
    </span>
  ) : blocked ? (
    <span className="flex min-w-0 items-center gap-1.5 text-[#ff9aa0]">
      <LockIcon />
      <span className="min-w-0 truncate">{blocked}</span>
    </span>
  ) : (
    <span className="text-[#a8a49c]">Queued</span>
  );

  return (
    // A new order rises onto the counter.
    <RiseIn as="li" className="w-[148px] shrink-0">
      <article
        className={`m-settle relative flex h-full min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2.5 pt-2.5 pb-2 ${frame} ${ring} ${declined ? 'm-shake' : ''} ${
          interact && !served && !declined ? 'cursor-pointer' : ''
        }`}
        aria-label={`${drink.customerLabel.replace(/ .*/, '')} ${drinkName(drink)}`}
        // Picking an order: the next drink started by hand is this one.
        onClick={interact && !served && !declined ? interact.onSelect : undefined}
      >
        {own.length ? (
          <div className="absolute inset-x-2 top-2 z-10 flex flex-wrap justify-end gap-1">
            {own.map((a) => (
              <button
                key={a.label}
                type="button"
                className={`${PILL} ${a.tone} hover:bg-[#2a2a28]`}
                onClick={(e) => {
                  e.stopPropagation();
                  interact!.act(a.event);
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
        {/* The real cup is on the machine while it is made; once served it
            flies here (same view-transition-name) and replaces the ghost. */}
        <div style={{ width: 64, height: 48, viewTransitionName: served && landed ? `cup-${drink.served?.cupId}` : undefined }}>
          <Mug
            target={target}
            contents={drink.served?.contents}
            declined={declined}
            width={64}
            height={48}
            dashed={!declined && !(served && landed)}
          />
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-0.5 text-center">
          <div className="w-full min-w-0 truncate text-[13px] font-medium">
            {interact && !served && !declined ? (
              <span className="sr-only">
                <button
                  type="button"
                  aria-pressed={interact.selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    interact.onSelect();
                  }}
                >
                  Make next
                </button>
              </span>
            ) : null}
            <span className="tnum">{drink.customerLabel.replace(/^#?(\d+).*/, '$1')}.</span> {drinkName(drink)}
          </div>
          <div className="w-full min-w-0 truncate text-xs text-[#a8a49c]">
            {[...mods, served || declined ? null : `${waited}s`].filter(Boolean).join(' · ') || ' '}
          </div>
          {aside ? <div className={`w-full min-w-0 truncate text-xs ${aside.tone}`} title={aside.text}>{aside.text}</div> : null}
        </div>
        {!served && !declined ? <Pips total={target.length} done={cup?.contents.length ?? 0} running={Boolean(running)} /> : null}
        <div className="flex h-4 w-full min-w-0 items-center justify-center text-xs">{status}</div>
      </article>
    </RiseIn>
  );
}
