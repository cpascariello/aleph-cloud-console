"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TerminalModal, GlowLine, HudLabel } from "@/components/data-terminal";
import { sidebarItems } from "@/components/shell/sidebar-config";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  href: string;
  group: string;
}

function flattenNavItems(): CommandItem[] {
  const items: CommandItem[] = [];
  for (const group of sidebarItems) {
    if (!group.children) continue;
    for (const item of group.children) {
      if (item.href) {
        items.push({
          id: item.id,
          label: item.label,
          href: item.href,
          group: group.label,
        });
      }
    }
  }
  return items;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const allCommands = useMemo(flattenNavItems, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lower = query.toLowerCase();
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.group.toLowerCase().includes(lower),
    );
  }, [query, allCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.href);
      onClose();
    },
    [router, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, handleSelect, onClose],
  );

  if (!open) return null;

  return (
    <TerminalModal open={open} onClose={onClose} size="md" title="Command Palette">
      <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2 border border-border bg-foreground/[0.02] px-4 py-3">
          <span className="font-display text-sm text-accent">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            aria-label="Search commands"
            className="w-full bg-transparent font-display text-sm text-accent outline-none placeholder:text-foreground/20"
          />
        </div>
        <GlowLine />
        <div className="max-h-80 overflow-y-auto">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition-colors ${
                index === selectedIndex
                  ? "bg-accent/10 text-accent"
                  : "hover:bg-foreground/[0.04]"
              }`}
            >
              <span className="font-display text-sm">{item.label}</span>
              <HudLabel>{item.group}</HudLabel>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No results found
            </p>
          )}
        </div>
      </div>
    </TerminalModal>
  );
}
