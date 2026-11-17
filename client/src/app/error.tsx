'use client';

import { Button } from '@/components/ui/Button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="container-page grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted">Please try again. If the problem continues, contact support.</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
