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
      <main className="flex-1 overflow-y-auto p-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <CommandPalette open={isOpen} onClose={close} />
    </>
  );
}
