interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}

export default function Field({ label, value, onChange, placeholder, type = 'text', hint }: FieldProps) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] text-tracedim uppercase tracking-widest">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-void border border-voidline rounded px-3 py-2.5 font-mono text-sm text-trace placeholder:text-tracedim/50 focus:border-phosphor/50 focus:outline-none transition-colors"
      />
      {hint && <span className="block font-sans text-[11px] text-tracedim mt-1.5">{hint}</span>}
    </label>
  );
}
