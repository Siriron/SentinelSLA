import { Verdict } from '../lib/contractMethods';

export interface TraceEvent {
  label: string;
  verdict?: Verdict | 'pending' | 'open';
  timestamp?: string;
  detail?: string;
}

const VERDICT_COLOR: Record<string, string> = {
  compliant: 'bg-phosphor shadow-[0_0_8px_2px_rgba(74,222,128,0.5)]',
  non_compliant: 'bg-alarm shadow-[0_0_8px_2px_rgba(245,158,11,0.5)]',
  unverifiable: 'bg-static',
  pending: 'bg-tracedim animate-blink',
  open: 'bg-trace animate-trace-sweep',
};

const VERDICT_TEXT: Record<string, string> = {
  compliant: 'text-phosphor',
  non_compliant: 'text-alarm',
  unverifiable: 'text-static',
  pending: 'text-tracedim',
  open: 'text-trace',
};

/**
 * The signature element. A horizontal instrument trace — a row of ticks
 * along a baseline, each tick a real event with a real timestamp, colored
 * by its actual verdict. Deliberately not a card grid or stat blocks: the
 * whole point of this contract is that it reads a clock, and the visual
 * should read like one too.
 */
export default function TraceReadout({ events, dense = false }: { events: TraceEvent[]; dense?: boolean }) {
  return (
    <div className={dense ? 'py-3' : 'py-8'}>
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-voidline -translate-y-1/2" />
        <div className={`relative flex items-center justify-between ${dense ? 'gap-4' : 'gap-8'}`}>
          {events.map((event, i) => {
            const key = event.verdict ?? 'pending';
            return (
              <div key={i} className="flex flex-col items-center gap-2 min-w-0 flex-1">
                <div
                  className={`rounded-full ${dense ? 'w-2 h-2' : 'w-3 h-3'} ${VERDICT_COLOR[key] ?? 'bg-tracedim'}`}
                  aria-hidden="true"
                />
                <div className="text-center min-w-0">
                  <div className={`font-mono ${dense ? 'text-[10px]' : 'text-xs'} uppercase tracking-wider ${VERDICT_TEXT[key] ?? 'text-tracedim'} truncate`}>
                    {event.label}
                  </div>
                  {event.timestamp && !dense && (
                    <div className="font-mono text-[11px] text-tracedim mt-0.5">{event.timestamp}</div>
                  )}
                  {event.detail && !dense && (
                    <div className="font-sans text-xs text-tracedim mt-1 max-w-[14rem]">{event.detail}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
