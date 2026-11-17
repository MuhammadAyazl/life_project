'use client';

import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './AuthProvider';
import { CartProvider } from './CartProvider';
import { ToastProvider } from './ToastProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
