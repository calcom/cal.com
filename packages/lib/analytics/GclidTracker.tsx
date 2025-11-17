"use client";

import { useGclidCapture } from "./gclid";

export function GclidTracker() {
  useGclidCapture();

  return null;
}
