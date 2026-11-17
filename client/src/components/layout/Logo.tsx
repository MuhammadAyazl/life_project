import Image from 'next/image';
import Link from 'next/link';
import { SITE } from '@/lib/config';

export function Logo({ height = 52 }: { height?: number }) {
  return (
    <Link href="/" aria-label={`${SITE.name} home`} className="flex shrink-0 items-center">
      <Image
        src={SITE.logo}
        alt={SITE.name}
        // intrinsic size of logo1.png; CSS below scales it down keeping the aspect ratio
        width={640}
        height={386}
        sizes={`${Math.ceil((height * 640) / 386)}px`}
        priority
        style={{ height, width: 'auto' }}
      />
    </Link>
  );
}
