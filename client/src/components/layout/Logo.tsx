import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/config';

/** Logo icon + the "ShopFussion" name written in a gold script face. */
export function Logo({ height = 52, showName = true }: { height?: number; showName?: boolean }) {
  return (
    <Link href="/" aria-label={`${SITE.name} home`} className="flex shrink-0 items-center gap-1.5">
      <Image
        src={SITE.logo}
        alt=""
        // intrinsic size of logo1.png; CSS below scales it down keeping the aspect ratio
        width={640}
        height={386}
        sizes={`${Math.ceil((height * 640) / 386)}px`}
        priority
        style={{ height, width: 'auto' }}
      />
      {showName && (
        <span
          aria-hidden
          // hidden on phones (logo icon only), shown from tablet width up
          className="hidden font-script text-[length:var(--logo-name)] leading-none whitespace-nowrap text-[#b8894a] sm:inline dark:text-[#d9ad6c]"
          style={{ ['--logo-name' as string]: `${Math.round(height * 0.62)}px` }}
        >
          ShopFussion
        </span>
      )}
    </Link>
  );
}
