import { ConsoleSidebar } from "@/components/shell/console-sidebar";
import { ConsoleShell } from "@/components/shell/console-shell";

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
