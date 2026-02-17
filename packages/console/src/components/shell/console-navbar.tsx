"use client";

import { Search, Bell, Wallet } from "lucide-react";
import { Button } from "@/components/data-terminal";

interface ConsoleNavbarProps {
  onOpenCommandPalette?: () => void;
}

export function ConsoleNavbar({ onOpenCommandPalette }: ConsoleNavbarProps) {
  return (
    <nav
      aria-label="Top navigation"
      className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-2 backdrop-blur-md"
    >
      <Button variant="ghost" size="sm" onClick={onOpenCommandPalette}>
        <Search size={16} />
        <span className="ml-2 text-xs text-muted-foreground">
          Search... <kbd className="ml-1 opacity-50">⌘K</kbd>
        </span>
      </Button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <Button variant="primary" size="sm">
          <Wallet size={16} />
          Connect Wallet
        </Button>
      </div>
    </nav>
  );
}
