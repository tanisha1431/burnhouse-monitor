"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Heats", href: "/dashboard/heats" },
  { label: "Participants", href: "/dashboard/participants" },
  { label: "Admins", href: "/dashboard/admins" },
  { label: "Logs", href: "/dashboard/logs" },
  { label: "Health", href: "/dashboard/health" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 shrink-0 border-r bg-muted/40 flex flex-col">
        <div className="px-4 py-5 border-b">
          <h1 className="text-lg font-bold tracking-tight">Burnhouse</h1>
          <p className="text-xs text-muted-foreground">Monitor</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
