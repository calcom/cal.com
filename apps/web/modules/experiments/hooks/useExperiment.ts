"use client";

import {
  CONTROL_GROUP,
  EXP_OVERRIDE_PREFIX,
  EXPERIMENTS,
  type ExperimentSlug,
  type VariantSlug,
} from "@calcom/features/experiments/config";
import { assignVariant } from "@calcom/features/experiments/lib/bucketing";
import { trackExperimentExposure, trackExperimentOutcome } from "@calcom/features/experiments/lib/tracking";
import type { ExperimentConfigDto as ExperimentConfig } from "@calcom/lib/dto/ExperimentConfigDto";
import { localStorage, sessionStorage } from "@calcom/lib/webstorage";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ExperimentContext } from "../provider";

interface UseExperimentResult<V extends string = string> {
  variant: V | null;
  isControl: boolean;
  trackExposure: () => void;
  trackOutcome: () => void;
}

const INACTIVE_RESULT: UseExperimentResult<never> = {
  variant: null,
  isControl: true,
  trackExposure: () => {},
  trackOutcome: () => {},
};

const ANON_BUCKETS_KEY = "exp_anon_buckets";
const AnonBucketsSchema = z.record(z.string(), z.number().int().min(0).max(99));

// Returns a stable random number 0–99 for this experiment, persisted in localStorage.
// Each experiment gets its own bucket so assignments are independent across experiments.
// Consistent across tabs and sessions — just random numbers, no PII.
function getAnonymousBucket(slug: string): number {
  if (typeof window === "undefined") return 0;

  let buckets: Record<string, number> = {};
  const stored = localStorage.getItem(ANON_BUCKETS_KEY);
  if (stored) {
    try {
      const parsed = AnonBucketsSchema.safeParse(JSON.parse(stored));
      buckets = parsed.success ? parsed.data : {};
    } catch {
      buckets = {};
    }
  }

  if (slug in buckets) return buckets[slug];

  const bucket = Math.floor(Math.random() * 100);
  buckets[slug] = bucket;
  localStorage.setItem(ANON_BUCKETS_KEY, JSON.stringify(buckets));
  return bucket;
}

// Anonymous users can't be bucketed server-side (no userId), so we assign a random
// bucket per experiment and persist it in localStorage for consistency across tabs and sessions.
function resolveAnonymousVariant(slug: string, configs: ExperimentConfig[]): string | null {
  if (typeof window === "undefined") return null;

  const config = configs.find((c) => c.slug === slug);
  if (!config || config.status !== "RUNNING") return null;

  const bucket = getAnonymousBucket(slug);
  return assignVariant(
    bucket,
    config.variants.map((v) => ({ slug: v.slug, weight: v.weight }))
  );
}

export function useExperiment<T extends ExperimentSlug>(
  slug: T,
  options?: { trackExposure?: boolean }
): UseExperimentResult<VariantSlug<T>> {
  const context = useContext(ExperimentContext);
  const config = EXPERIMENTS[slug];
  const target: string | undefined = config?.target;
  const active = target === "logged-in" || target === "anonymous";

  const loggedInVariant =
    target === "logged-in" && context?.precomputedVariants && slug in context.precomputedVariants
      ? context.precomputedVariants[slug]
      : null;

  // useState initializer runs once — safe for bucketing since the variant
  // must stay stable for the lifetime of the component.
  const [anonymousVariant] = useState(() => {
    if (target !== "anonymous" || !context) return null;
    return resolveAnonymousVariant(slug, context.configs);
  });

  const bucketedVariant = target === "logged-in" ? loggedInVariant : anonymousVariant;

  // Admin preview: sessionStorage override lets admins see what each variant looks like
  // without affecting bucketing for real users. Resolved before tracking callbacks so
  // they capture the correct variant.
  const override =
    typeof window !== "undefined" ? sessionStorage.getItem(`${EXP_OVERRIDE_PREFIX}${slug}`) : null;
  const variant = override !== null ? (override === CONTROL_GROUP ? null : override) : bucketedVariant;

  // Exposure is NOT tracked automatically by default — callers must explicitly opt in with
  // { trackExposure: true } or call trackExposure() manually. This avoids false exposures
  // when a component mounts but isn't visible (e.g. a closed dialog).
  const autoTrack = active && options?.trackExposure === true;
  const trackedRef = useRef(false);

  useEffect(() => {
    if (autoTrack && !trackedRef.current) {
      trackedRef.current = true;
      trackExperimentExposure(slug, variant);
    }
  }, [autoTrack, slug, variant]);

  const trackExposure = useCallback(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackExperimentExposure(slug, variant);
    }
  }, [slug, variant]);

  const trackOutcome = useCallback(() => {
    trackExperimentOutcome(slug, variant);
  }, [slug, variant]);

  if (!active) return INACTIVE_RESULT as UseExperimentResult<VariantSlug<T>>;
  return {
    variant: variant as VariantSlug<T> | null,
    isControl: variant === null,
    trackExposure,
    trackOutcome,
  };
}
