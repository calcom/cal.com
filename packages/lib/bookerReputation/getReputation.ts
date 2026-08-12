import { unstable_cache } from "@calcom/lib/unstable_cache";
import type { PrismaClient } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import {
  REPUTATION_CACHE_TAG,
  REPUTATION_CACHE_TTL_SECONDS,
} from "./constants";
import { computeScore } from "./computeScore";
import type { BookerReputation } from "./types";

/**
 * Fetch the on-the-fly booker reputation for a set of booker emails.
 *
 * Runs a single batched pair of Prisma `groupBy` queries over `Attendee` scoped
 * to past ACCEPTED bookings (per ADR-003: only ACCEPTED bookings count in the
 * denominator; CANCELLED/REJECTED are excluded as non-events).
 *
 * Returns a plain object keyed by email (not a Map) so the result survives the
 * `unstable_cache` superjson serialization boundary cleanly.
 *
 * `isSuspiciousEmail` is hardcoded `false` here — the suspicious-email badge
 * (M3) is a separate signal that does NOT fold into the numeric score (ADR-005).
 *
 * @param emails  the unique set of `attendees[0].email` values on the current page
 * @param prisma  injected for testability; the cached wrapper uses the singleton
 */
export async function getReputationByEmailsUncached(
  emails: string[],
  prisma: PrismaClient
): Promise<Record<string, BookerReputation>> {
  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (uniqueEmails.length === 0) return {};

  const now = new Date();
  // Denominator: every past ACCEPTED booking for any of these emails.
  const totalsBy = await prisma.attendee.groupBy({
    by: ["email"],
    where: {
      email: { in: uniqueEmails },
      booking: { status: BookingStatus.ACCEPTED, endTime: { lt: now } },
    },
    _count: { _all: true },
  });
  // Numerator: the subset of the above where the attendee marked no-show.
  // `noShow: true` excludes `null` (treated as "showed up") per the design.
  const noShowsBy = await prisma.attendee.groupBy({
    by: ["email"],
    where: {
      email: { in: uniqueEmails },
      noShow: true,
      booking: { status: BookingStatus.ACCEPTED, endTime: { lt: now } },
    },
    _count: { _all: true },
  });

  const totals = new Map(totalsBy.map((r) => [r.email, r._count._all] as const));
  const noShows = new Map(noShowsBy.map((r) => [r.email, r._count._all] as const));

  const out: Record<string, BookerReputation> = {};
  for (const email of uniqueEmails) {
    const totalCount = totals.get(email) ?? 0;
    const noShowCount = noShows.get(email) ?? 0;
    const { score } = computeScore(noShowCount, totalCount);
    out[email] = {
      score,
      noShowCount,
      totalCount,
      // M1/M2 stub — computed by `suspiciousEmail.ts` in M3 (ADR-005).
      isSuspiciousEmail: false,
    };
  }
  return out;
}

/**
 * Cached variant of {@link getReputationByEmailsUncached}.
 *
 * Wraps the batched query with `unstable_cache` (~60s TTL per the design).
 * The cache key is derived by Next.js from the function args (the email set)
 * plus the static key tag below, so distinct email sets get distinct entries.
 *
 * Uses the default `@calcom/prisma` singleton (not injectable) — the resolver
 * calls this; tests exercise the uncached variant with `prismaMock` instead.
 */
export const getReputationByEmails = async (
  emails: string[]
): Promise<Record<string, BookerReputation>> => {
  // Imported lazily here to avoid a module-load-time side-effect / circular dep
  // when the singleton is unavailable (e.g. in unit test contexts).
  const { default: prisma } = await import("@calcom/prisma");
  const cached = unstable_cache(
    async (emails: string[]) => getReputationByEmailsUncached(emails, prisma),
    [REPUTATION_CACHE_TAG],
    {
      revalidate: REPUTATION_CACHE_TTL_SECONDS,
      tags: [REPUTATION_CACHE_TAG],
    }
  );
  return cached(emails);
};