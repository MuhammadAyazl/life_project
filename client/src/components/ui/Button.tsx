import Link from 'next/link';
import { forwardRef } from 'react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-wide transition duration-200 disabled:opacity-60 active:scale-[.98] select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/25',
  secondary: 'border border-line bg-surface text-ink hover:bg-chip',
  ghost: 'text-muted hover:bg-chip hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
  inverse: 'bg-hero-ink text-[var(--hero-a)] hover:-translate-y-0.5 hover:shadow-lg',
};
const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-9 py-3.5 text-[0.95rem]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
