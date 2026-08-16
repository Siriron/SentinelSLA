import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-6 py-32 text-center">
      <div className="font-mono text-static text-xs uppercase tracking-widest mb-3">No signal</div>
      <h1 className="font-mono text-3xl text-trace mb-3">This trace does not exist</h1>
      <p className="font-sans text-sm text-tracedim mb-8">
        Nothing is recorded at this address. Check the URL, or head back to the overview.
      </p>
      <Link
        to="/"
        className="inline-block font-mono text-xs px-4 py-2 rounded border border-voidline bg-voidraised text-trace hover:border-phosphor/40 hover:text-phosphor transition-colors"
      >
        Back to overview
      </Link>
    </div>
  );
}
