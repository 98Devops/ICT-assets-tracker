import { cn } from '@/lib/utils';

/** IATS monogram — ink tile, off-white "IA", ember "TS" slash accent. */
export function IatsLogo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="IATS logo"
    >
      <rect width="64" height="64" rx="14" fill="#1A1714" />
      <path d="M20 20h6v24h-6z" fill="#FBF8F4" />
      <path d="M30 44 40 20h5.5L35.5 44Z" fill="#C1440E" />
      <rect x="42" y="20" width="4" height="4" fill="#FBF8F4" />
    </svg>
  );
}

export function IatsWordmark({ orgName, logoUrl }: { orgName?: string; logoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-9 w-9 object-contain rounded bg-white/10 shrink-0" />
      ) : (
        <IatsLogo />
      )}
      <div className="leading-tight">
        <div className="font-display font-semibold text-base text-white">IATS</div>
        <div className="text-[11px] text-white/60 tracking-wide">
          {orgName ?? 'ICT Assets Tracker System'}
        </div>
      </div>
    </div>
  );
}
