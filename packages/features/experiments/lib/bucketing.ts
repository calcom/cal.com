import { createHash } from "node:crypto";

export function hashUserToPercent(userId: number, experimentSlug: string): number {
  const hash = createHash("md5").update(`${userId}:${experimentSlug}`).digest("hex");
  return parseInt(hash.substring(0, 8), 16) % 100;
}

export function assignVariant(
  userPercent: number,
  variants: { slug: string; weight: number }[]
): string | null {
  let cursor = 0;
  for (const variant of variants) {
    cursor += variant.weight;
    if (userPercent < cursor) {
      return variant.slug;
    }
  }
  return null;
}
