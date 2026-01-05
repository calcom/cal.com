import MurmurHash3 from "imurmurhash";

import type { ExperimentVariantConfig } from "../types";

export function validateVariantPercentages(variants: ExperimentVariantConfig[]): boolean {
  const total = variants.reduce((sum, v) => sum + v.percentage, 0);
  return Math.abs(total - 100) < 0.01;
}

export function assignVariantDeterministic(
  identifier: string,
  experimentSlug: string,
  variants: ExperimentVariantConfig[]
): string {
  if (!validateVariantPercentages(variants)) {
    throw new Error(`Variant percentages must sum to 100 for experiment ${experimentSlug}`);
  }

  const hash = MurmurHash3(`${identifier}:${experimentSlug}`).result();
  const bucket = (hash % 10000) / 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.percentage;
    if (bucket < cumulative) {
      return variant.name;
    }
  }

  return variants[variants.length - 1].name;
}

export function assignVariantRandom(variants: ExperimentVariantConfig[]): string {
  if (!validateVariantPercentages(variants)) {
    throw new Error("Variant percentages must sum to 100");
  }

  const random = Math.random() * 100;
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.percentage;
    if (random < cumulative) {
      return variant.name;
    }
  }

  return variants[variants.length - 1].name;
}
