import Image from 'next/image';
import { cn } from '@/lib/format';

/** The original ShopFussion product illustrations, used when a product has no uploaded photo. */
const ART: Record<string, string> = {
  cleaner:
    '<circle cx="50" cy="50" r="38" fill="#2b3550"/><circle cx="50" cy="50" r="13" fill="#5b6785"/><circle cx="50" cy="50" r="5" fill="#cfd6e6"/>',
  mouse:
    '<ellipse cx="50" cy="52" rx="25" ry="34" fill="#e6e9ee" stroke="#b9c0cc" stroke-width="2"/><path d="M50 18v30M25 48h50" stroke="#b9c0cc" stroke-width="2"/>',
  watch:
    '<rect x="36" y="4" width="28" height="18" rx="5" fill="#2f4a7a"/><rect x="36" y="78" width="28" height="18" rx="5" fill="#2f4a7a"/><rect x="24" y="18" width="52" height="64" rx="15" fill="#1f2a44"/><text x="50" y="58" text-anchor="middle" font-size="20" font-weight="700" fill="#e8eef6" font-family="sans-serif">12:9</text>',
  earbuds:
    '<rect x="20" y="46" width="60" height="46" rx="20" fill="#f4f5f7" stroke="#d3d8e0" stroke-width="2"/><rect x="28" y="8" width="14" height="42" rx="7" fill="#fff" stroke="#d3d8e0" stroke-width="2"/><rect x="58" y="8" width="14" height="42" rx="7" fill="#fff" stroke="#d3d8e0" stroke-width="2"/>',
  speaker:
    '<rect x="22" y="10" width="56" height="80" rx="14" fill="#3a4660"/><circle cx="50" cy="34" r="10" fill="#1f2740"/><circle cx="50" cy="66" r="16" fill="#1f2740"/><circle cx="50" cy="66" r="6" fill="#5b6785"/>',
  headphones:
    '<path d="M22 60V50a28 28 0 0 1 56 0v10" stroke="#2f4a7a" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="14" y="54" width="18" height="32" rx="9" fill="#3f8fd6"/><rect x="68" y="54" width="18" height="32" rx="9" fill="#3f8fd6"/>',
  decor:
    '<path d="M30 40h40l-8 40H38z" fill="#e3a283"/><rect x="44" y="80" width="12" height="10" rx="2" fill="#5b6785"/><circle cx="50" cy="28" r="14" fill="#f7d77a"/>',
};

/** Shows the product photo when there is one, otherwise the built-in illustration. */
export function ProductVisual({
  name,
  image,
  art,
  className,
  artClassName = 'w-[56%]',
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority,
}: {
  name: string;
  image?: string;
  art?: string;
  className?: string;
  artClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn('tint relative grid place-items-center overflow-hidden', className)}>
      {image ? (
        <Image src={image} alt={name} fill sizes={sizes} className="object-cover" unoptimized priority={priority} />
      ) : (
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={name}
          className={cn('transition-transform duration-300', artClassName)}
          dangerouslySetInnerHTML={{ __html: ART[art ?? ''] ?? ART.decor }}
        />
      )}
    </div>
  );
}
