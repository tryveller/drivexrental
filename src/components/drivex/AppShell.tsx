import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bike, LifeBuoy } from "lucide-react";
import { DRIVEX_SUPPORT_PHONE } from "@/lib/format";

export function AppShell({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bike className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight">DriveX</span>
              <span className="block text-[11px] text-muted-foreground">
                {subtitle ?? "Two-wheeler rentals"}
              </span>
            </span>
          </Link>
          <a
            href={`tel:${DRIVEX_SUPPORT_PHONE}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Help
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5">{children}</main>
    </div>
  );
}
