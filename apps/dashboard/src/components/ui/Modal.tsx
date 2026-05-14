'use client';
import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 mx-4 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hairline bg-surface-card p-6 shadow-2xl sm:mx-0 sm:w-full sm:p-7">
          <Dialog.Title className="text-title-md text-body-strong">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="mt-1 text-body-sm text-body">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-5">{children}</div>
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted hover:bg-surface-card-elevated hover:text-body-strong"
              aria-label="Close"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
