'use client';

import { forwardRef, useId, useState } from 'react';
import { cn } from '@/lib/format';
import { Icon } from './Icon';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

/** Labelled input with inline error + accessible description. Password inputs get a show/hide toggle. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, hint, error, wrapperClassName, className, type = 'text', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className={cn('grid gap-1.5', wrapperClassName)}>
      <label htmlFor={inputId} className="flex items-baseline justify-between text-sm font-semibold">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPw && show ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className={cn('field', isPw && 'pr-11', error && 'border-danger', className)}
          {...rest}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-chip"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-err`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

export function TextArea({
  label,
  error,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea id={id} aria-invalid={!!error} className={cn('field min-h-32 resize-y', error && 'border-danger')} {...rest} />
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} aria-invalid={!!error} className={cn('field', error && 'border-danger')} {...rest}>
        {children}
      </select>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
