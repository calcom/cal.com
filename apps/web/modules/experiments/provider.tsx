"use client";

import type { ExperimentConfigDto as ExperimentConfig } from "@calcom/lib/dto/ExperimentConfigDto";
import { createContext } from "react";

export interface ExperimentContextValue {
  configs: ExperimentConfig[];
  // Logged-in users get their variants computed server-side (deterministic, based on userId)
  // and passed down to avoid hydration mismatches. Anonymous users don't have this — they
  // get bucketed client-side via sessionStorage instead.
  precomputedVariants: Record<string, string | null> | null;
}

interface ExperimentProviderProps {
  configs: ExperimentConfig[];
  precomputedVariants: Record<string, string | null> | null;
  children: React.ReactNode;
}

export const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export function ExperimentProvider({ configs, precomputedVariants, children }: ExperimentProviderProps) {
  return <ExperimentContext.Provider value={{ configs, precomputedVariants }}>{children}</ExperimentContext.Provider>;
}
