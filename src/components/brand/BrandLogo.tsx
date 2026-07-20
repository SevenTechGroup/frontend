import { Link } from 'react-router-dom';

interface BrandLogoProps {
  variant?: 'default' | 'light';
  compact?: boolean;
  to?: string;
}

export function BrandLogo({ variant = 'default', compact = false, to = '/' }: BrandLogoProps) {
  const isLight = variant === 'light';

  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2.5"
      aria-label="Sahel Signal — Accueil"
    >
      <span
        className={`grid size-10 place-items-center rounded-xl text-white shadow-lg transition-transform group-hover:-rotate-3 group-hover:scale-105 ${
          isLight
            ? 'bg-white/15 shadow-black/10 ring-1 ring-white/15'
            : 'bg-teal-800 shadow-teal-900/15'
        }`}
      >
        <svg aria-hidden="true" className="size-6" viewBox="0 0 28 28" fill="none">
          <path d="M5 5.5h18v13H14l-5.5 4v-4H5z" fill="currentColor" />
          <circle cx="10" cy="12" r="1.3" fill="#fbbf24" />
          <circle cx="14" cy="12" r="1.3" fill="#fbbf24" />
          <circle cx="18" cy="12" r="1.3" fill="#fbbf24" />
        </svg>
      </span>
      {!compact && (
        <span
          className={`text-lg font-black tracking-tight ${isLight ? 'text-white' : 'text-slate-950'}`}
        >
          Sahel <span className={isLight ? 'text-amber-300' : 'text-teal-700'}>Signal</span>
        </span>
      )}
    </Link>
  );
}
