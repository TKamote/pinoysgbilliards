"use client";

import { usePathname } from "next/navigation";
import LayoutWithNav from "@/components/LayoutWithNav";

/** Routes that render without nav (clean overlay for OBS / GO LIVE). */
const NO_NAV_ROUTES = ["/overlay", "/live-match"] as const;

function isNoNavRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return NO_NAV_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

/**
 * Renders LayoutWithNav for normal routes; for /overlay/* and /live-match
 * renders only the page (no nav) so OBS and GO LIVE get a clean overlay.
 */
export default function LayoutSwitch({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isNoNavRoute(pathname)) {
    return <main className="min-h-screen bg-transparent">{children}</main>;
  }
  return <LayoutWithNav>{children}</LayoutWithNav>;
}
