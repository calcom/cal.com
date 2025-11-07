"use client";

import { useGclidCapture } from "./gclid";

export function GclidTracker() {
  useGclidCapture(); // Custom hook handles everything

  return null;
}
