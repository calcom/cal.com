import type { AssignmentType, ExperimentVariantConfig, ExperimentConfig } from "../types";

function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}

export function assignVariantDeterministic(
  identifier: string,
  experimentSlug: string,
  variants: ExperimentVariantConfig[]
): string {
  const hashInput = `${identifier}-${experimentSlug}`;
  const hashValue = hashStringToNumber(hashInput);

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.percentage;
    if (hashValue < cumulative) {
      return variant.name;
    }
  }

  return variants[variants.length - 1]?.name ?? "control";
}

export function assignVariantRandom(variants: ExperimentVariantConfig[]): string {
  const random = Math.random() * 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.percentage;
    if (random < cumulative) {
      return variant.name;
    }
  }

  return variants[variants.length - 1]?.name ?? "control";
}

export function validateVariantPercentages(variants: ExperimentVariantConfig[]): boolean {
  const total = variants.reduce((sum, variant) => sum + variant.percentage, 0);
  return Math.abs(total - 100) < 0.01;
}

export function getVariantForUser(
  userId: number,
  experimentSlug: string,
  config: ExperimentConfig,
  assignmentType: AssignmentType
): string {
  if (!validateVariantPercentages(config.variants)) {
    throw new Error(`Variant percentages for experiment ${experimentSlug} do not sum to 100`);
  }

  if (assignmentType === "deterministic") {
    return assignVariantDeterministic(`user-${userId}`, experimentSlug, config.variants);
  } else {
    return assignVariantRandom(config.variants);
  }
}

export function getVariantForTeam(
  teamId: number,
  experimentSlug: string,
  config: ExperimentConfig,
  assignmentType: AssignmentType
): string {
  if (!validateVariantPercentages(config.variants)) {
    throw new Error(`Variant percentages for experiment ${experimentSlug} do not sum to 100`);
  }

  if (assignmentType === "deterministic") {
    return assignVariantDeterministic(`team-${teamId}`, experimentSlug, config.variants);
  } else {
    return assignVariantRandom(config.variants);
  }
}

export function getVariantForVisitor(
  visitorId: string,
  experimentSlug: string,
  config: ExperimentConfig,
  assignmentType: AssignmentType
): string {
  if (!validateVariantPercentages(config.variants)) {
    throw new Error(`Variant percentages for experiment ${experimentSlug} do not sum to 100`);
  }

  if (assignmentType === "deterministic") {
    return assignVariantDeterministic(visitorId, experimentSlug, config.variants);
  } else {
    return assignVariantRandom(config.variants);
  }
}
