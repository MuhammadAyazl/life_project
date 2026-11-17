import { cn } from '@/lib/format';
import { ButtonLink } from './Button';
import { Icon, type IconName } from './Icon';

export function Stars({ value, className }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={cn('tracking-[2px] text-star', className)} aria-label={`${value} out of 5 stars`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? '' : 'opacity-30'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('grid place-items-center py-16', className)} role="status" aria-label="Loading">
      <span className="size-8 animate-spin rounded-full border-[3px] border-brand border-r-transparent" />
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon = 'box',
}: {
  title: string;
  text?: string;
  action?: { href: string; label: string };
  icon?: IconName;
}) {
  return (
    <div className="grid place-items-center gap-3 py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-chip text-brand">
        <Icon name={icon} size={28} />
      </span>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {text && <p className="max-w-md text-muted">{text}</p>}
      {action && (
        <ButtonLink href={action.href} className="mt-3">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}

export function Badge({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'green' | 'amber' | 'red' }) {
  const tones = {
    brand: 'bg-chip text-brand',
    green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-700',
    red: 'bg-red-500/15 text-red-600',
  };
  return <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>;
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-normal sm:text-3xl [&_b]:font-bold">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}
