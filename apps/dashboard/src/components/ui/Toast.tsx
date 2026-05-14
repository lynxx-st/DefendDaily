'use client';
import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#181818',
          border: '1px solid #222222',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '14px',
        },
      }}
    />
  );
}
