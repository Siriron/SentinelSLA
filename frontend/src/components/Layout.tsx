import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import WalletButton from './WalletButton';
import { EXPLORER_ADDRESS_URL, STUDIONET_CONTRACT_ADDRESS } from '../config/chains';

const NAV_LINKS = [
  { to: '/', label: 'Overview' },
  { to: '/register', label: 'Register SLA' },
  { to: '/file', label: 'File a check' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/docs', label: 'Docs' },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {open ? (
        <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <>
          <path d="M2 5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 9H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2 13H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-void scanline-field flex flex-col">
      <header className="border-b border-voidline sticky top-0 z-30 bg-void/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMenuOpen(false)}>
            <img src="/favicon.svg" width={28} height={28} alt="" />
            <span className="font-mono font-bold text-sm tracking-tight text-trace">SentinelSLA</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-mono text-xs px-3 py-2 rounded transition-colors ${
                  location.pathname === link.to
                    ? 'text-phosphor bg-phosphordim'
                    : 'text-tracedim hover:text-trace'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <WalletButton />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded border border-voidline text-trace hover:border-phosphor/40 hover:text-phosphor transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            className="md:hidden border-t border-voidline bg-void px-6 py-3 flex flex-col gap-1"
            aria-label="Primary, mobile"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`font-mono text-sm px-3 py-2.5 rounded transition-colors ${
                  location.pathname === link.to
                    ? 'text-phosphor bg-phosphordim'
                    : 'text-tracedim hover:text-trace hover:bg-voidraised'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-voidline mt-24">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="font-mono text-[11px] text-tracedim break-all sm:break-normal">
            Contract{' '}
            <a
              href={EXPLORER_ADDRESS_URL(STUDIONET_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-static hover:text-phosphor underline underline-offset-2"
            >
              {STUDIONET_CONTRACT_ADDRESS.slice(0, 10)}…{STUDIONET_CONTRACT_ADDRESS.slice(-6)}
            </a>{' '}
            · StudioNet
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-tracedim">
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-trace">
              Built on GenLayer
            </a>
            <a href="https://portal.genlayer.foundation/" target="_blank" rel="noopener noreferrer" className="hover:text-trace">
              Portal
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
