'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Tilt } from '@/components/motion/Tilt';

// WebGL only runs in the browser; the hero text renders immediately without waiting for it.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <div className="grid gap-5 lg:grid-cols-[2.1fr_1fr]">
      <section
        className="relative min-h-[440px] overflow-hidden rounded-3xl px-6 pt-8 pb-[300px] text-hero-ink sm:px-11 sm:py-10 sm:pb-10"
        style={{ background: 'linear-gradient(135deg,var(--hero-a),var(--hero-b))' }}
      >
        <HeroScene />
        <div className="relative z-10 max-w-[480px] sm:max-w-[min(480px,56%)]">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <Link
              href="/shop"
              className="group inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/90 py-1 pr-3 pl-1 text-[11px] font-medium whitespace-nowrap text-[#1d5fd1] transition hover:bg-white hover:shadow-lg sm:gap-2.5 sm:pr-4 sm:text-sm"
            >
              <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] text-brand-ink sm:px-3 sm:text-xs">NEWS</span>
              Free shipping on orders above $50
              <Icon name="arrow" size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </motion.div>
          <motion.h1
            // visible in the server HTML (good for LCP/SEO); only slides into place
            initial={{ y: 18 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
            className="mt-5 mb-6 font-elegant text-[clamp(2.3rem,4.6vw,3.6rem)] leading-[1.08] font-normal tracking-[0.01em]"
          >
            Gadgets you’ll love. <span className="opacity-55">Prices you’ll trust.</span>
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.25 }}>
            <p className="text-sm font-medium">Starts from</p>
            <p className="mb-6 font-display text-3xl font-bold">$4.90</p>
            {/* desktop: 32x10px; phones 2px smaller: 30x8px */}
            <ButtonLink href="/shop" variant="inverse" size="lg" className="px-[30px]! py-2! sm:px-8! sm:py-2.5!">
              SHOP NOW
            </ButtonLink>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.15 }}
          className="pointer-events-none absolute bottom-0 left-1/2 z-[5] h-[300px] w-[min(100%,380px)] -translate-x-1/2 sm:right-0 sm:left-auto sm:h-full sm:w-[56%] sm:translate-x-0 sm:[mask-image:linear-gradient(90deg,transparent,#000_12%)]"
        >
          <Image
            src="/images/RGB_Gamer_Girl_Portrait.png"
            alt="Gamer wearing RGB wireless headphones"
            fill
            priority
            sizes="(max-width: 640px) 380px, 50vw"
            className="object-contain object-bottom sm:object-right-bottom"
          />
        </motion.div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        {[
          // Product photos live in client/public/images/ (replace the files to change them)
          {
            title: 'Best products',
            bg: 'var(--card1-a),var(--card1-b)',
            img: '/images/earbuds.webp',
            alt: 'Wireless earbuds in a charging case',
            href: '/shop?sort=best',
          },
          {
            title: '20% discounts',
            bg: 'var(--card2-a),var(--card2-b)',
            img: '/images/watch.webp',
            alt: 'Smart watch with fitness tracking',
            href: '/shop?category=Watch',
          },
        ].map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 + i * 0.12 }}
            whileHover={{ scale: 1.02 }}
            className="relative flex min-h-[200px] flex-col justify-center overflow-hidden rounded-3xl px-7 py-6"
            style={{ background: `linear-gradient(135deg,${c.bg})` }}
          >
            <h2 className="relative z-10 max-w-[52%] text-2xl leading-tight font-bold">{c.title}</h2>
            <Link href={c.href} className="relative z-10 mt-3 inline-flex items-center gap-1.5 font-medium hover:underline">
              View more <Icon name="arrow" size={16} />
            </Link>
            {/* product photo floats gently on the right of the card; on hover it zooms and tilts with the cursor */}
            <motion.div
              className="absolute top-1/2 right-[4%] aspect-square w-[44%] -translate-y-1/2"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Tilt className="relative size-full" max={18} scale={1.15}>
                <Image
                  src={c.img}
                  alt={c.alt}
                  fill
                  sizes="(max-width: 1024px) 40vw, 160px"
                  className="pointer-events-none object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,.28)]"
                />
              </Tilt>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
