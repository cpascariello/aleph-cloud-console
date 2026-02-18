import { ConsoleSidebar } from "@/components/shell/console-sidebar";
import { ConsoleShell } from "@/components/shell/console-shell";

// Console pages depend on wallet/auth state and context providers
// that are unavailable during static generation.
export const dynamic = "force-dynamic";

export default function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ConsoleSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsoleShell>{children}</ConsoleShell>
      </div>
    </div>
  );
}
