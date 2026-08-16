const STYLES: Record<string, string> = {
  compliant: 'border-phosphor/40 text-phosphor bg-phosphordim',
  non_compliant: 'border-alarm/40 text-alarm bg-alarmdim',
  unverifiable: 'border-static/40 text-static bg-staticdim',
  open: 'border-trace/30 text-trace bg-voidraised',
  upheld: 'border-static/40 text-static bg-staticdim',
  overturned: 'border-alarm/40 text-alarm bg-alarmdim',
  rejected: 'border-tracedim/40 text-tracedim bg-voidraised',
};

const LABELS: Record<string, string> = {
  compliant: 'Compliant',
  non_compliant: 'Non-compliant',
  unverifiable: 'Unverifiable',
  open: 'Open',
  upheld: 'Upheld',
  overturned: 'Overturned',
  rejected: 'Rejected',
};

export default function VerdictBadge({ value }: { value: string }) {
  const style = STYLES[value] ?? 'border-tracedim/40 text-tracedim bg-voidraised';
  const label = LABELS[value] ?? value;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs uppercase tracking-wider ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
