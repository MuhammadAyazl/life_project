/* eslint-disable @next/next/no-img-element -- small avatars from /uploads or Google; no optimisation needed */
import { cn } from '@/lib/format';

/** User's profile photo, or their initial on a coloured circle when there is no photo. */
export function Avatar({ name, src, size = 36, className }: { name: string; src?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand font-semibold text-brand-ink', className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? (
        <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        (name.trim().charAt(0) || '?').toUpperCase()
      )}
    </span>
  );
}
