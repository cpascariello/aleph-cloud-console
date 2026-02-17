"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/data-terminal";
import { findActiveId, sidebarItems } from "@/components/shell/sidebar-config";

export function ConsoleSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = findActiveId(pathname);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href?.startsWith("/")) {
        e.preventDefault();
        router.push(href);
      }
    },
    [router],
  );

  return (
    <div onClick={handleLinkClick}>
      <Sidebar
        items={sidebarItems}
        activeId={activeId}
        defaultCollapsed={false}
        header={{
          logo: (
            <span className="font-display text-sm tracking-wider text-accent">
              ALEPH CLOUD
            </span>
          ),
          collapsedLogo: (
            <span className="font-display text-sm tracking-wider text-accent">
              AC
            </span>
          ),
        }}
      />
    </div>
  );
}
