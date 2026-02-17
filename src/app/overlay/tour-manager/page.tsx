"use client";

import TourManagerPage from "@/app/tour-manager/page";

/**
 * Same Tour Manager UI as /tour-manager but under /overlay/tour-manager
 * so the layout renders no nav (clean overlay for OBS and GO LIVE).
 */
export default function OverlayTourManagerPage() {
  return <TourManagerPage />;
}
