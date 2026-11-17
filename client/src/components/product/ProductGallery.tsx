'use client';

import { useState } from 'react';
import { Tilt } from '@/components/motion/Tilt';
import { cn } from '@/lib/format';
import { ProductVisual } from './ProductArt';

/** Product page photos: thumbnails switch the big photo; every photo zooms and tilts in 3D on hover. */
export function ProductGallery({ name, images, art }: { name: string; images: string[]; art?: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {images.length > 1 && (
        <div className="flex gap-3 sm:flex-col">
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === active}
              className="rounded-xl"
            >
              <Tilt max={14} scale={1.08}>
                <ProductVisual
                  name={`${name} photo ${i + 1}`}
                  image={img}
                  sizes="80px"
                  className={cn('size-20 shrink-0 rounded-xl border-2 transition-colors', i === active ? 'border-brand' : 'border-line')}
                />
              </Tilt>
            </button>
          ))}
        </div>
      )}
      <Tilt className="flex-1" max={10} scale={1.05}>
        <ProductVisual
          name={name}
          image={main}
          art={art}
          priority
          className="aspect-square rounded-2xl shadow-[0_24px_50px_-30px_rgba(10,26,64,.45)]"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
      </Tilt>
    </div>
  );
}
