"use client";

import type { ReactNode } from "react";
import { ConsoleNavbar } from "@/components/shell/console-navbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { ErrorBoundary } from "@/components/shell/error-boundary";
import { useCommandPalette } from "@/hooks/use-command-palette";

export function ConsoleShell({ children }: { children: ReactNode }) {
  const { isOpen, open, close } = useCommandPalette();

  return (
    <>
      <ConsoleNavbar onOpenCommandPalette={open} />
      <main className="flex-1 overflow-y-auto">
        <div className="relative min-h-full p-6">
          <div
            className="pointer-events-none absolute inset-0 z-0 terminal-grid"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </div>
      </main>
      <CommandPalette open={isOpen} onClose={close} />
    </>
  );
}
