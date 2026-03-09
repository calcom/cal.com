import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import { getInternalBookingsInRange } from "../../../calendar/internalBookingsRepo";
import {
  compareUnifiedCalendarItems,
  mapExternalEventToUnifiedItem,
  mapInternalBookingToUnifiedItem,
  type ExternalEventForUnifiedCalendar,
} from "../../../calendar/unifiedMapper";
import type { TUnifiedCalendarListInput, TUnifiedCalendarListOutput } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUnifiedCalendarListInput;
};

const log = logger.getSubLogger({ prefix: ["viewer", "unifiedCalendar", "list"] });

const MAX_RANGE_DAYS = 180;
const CLAMP_PAST_DAYS = 30;
const CLAMP_FUTURE_DAYS = 90;
const OVERFETCH_FACTOR = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

interface ExternalEventRow {
  id: number;
  calendarId: number;
  provider: string;
  externalEventId: string;
  iCalUID: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  showAsBusy: boolean;
  status: string | null;
  rawPayload: unknown;
}

const toDateOrThrow = (value: string, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${fieldName}`,
    });
  }
  return parsed;
};

const clampRange = (from: Date, to: Date, clampEnabled: boolean): { from: Date; to: Date } => {
  if (!clampEnabled) {
    return { from, to };
  }

  const now = Date.now();
  const lowerBound = new Date(now - CLAMP_PAST_DAYS * DAY_MS);
  const upperBound = new Date(now + CLAMP_FUTURE_DAYS * DAY_MS);

  const clampedFrom = from < lowerBound ? lowerBound : from;
  const clampedTo = to > upperBound ? upperBound : to;
  return { from: clampedFrom, to: clampedTo };
};

const validateRange = (from: Date, to: Date): void => {
  if (from >= to) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "from must be earlier than to",
    });
  }
  const rangeMs = to.getTime() - from.getTime();
  if (rangeMs > MAX_RANGE_DAYS * DAY_MS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `range exceeds maximum of ${MAX_RANGE_DAYS} days`,
    });
  }
};

const getMembershipScopes = async (
  userId: number
): Promise<{ teamIds: number[]; calIdTeamIds: number[] }> => {
  const [teamMemberships, calIdMemberships] = await Promise.all([
    prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
      select: { teamId: true },
    }),
    prisma.calIdMembership.findMany({
      where: {
        userId,
        acceptedInvitation: true,
      },
      select: { calIdTeamId: true },
    }),
  ]);

  return {
    teamIds: teamMemberships.map((m) => m.teamId),
    calIdTeamIds: calIdMemberships.map((m) => m.calIdTeamId),
  };
};

const fetchExternalEvents = async (params: {
  userId: number;
  from: Date;
  to: Date;
  take: number;
  teamIds: number[];
  calIdTeamIds: number[];
  cursorStartTime?: Date | null;
  includeCancelledExternal: boolean;
  includeExternalCalendarIds?: number[];
  excludeExternalCalendarIds?: number[];
  showAsBusyOnly: boolean;
}): Promise<ExternalEventForUnifiedCalendar[]> => {
  const scopeFilters: Prisma.Sql[] = [Prisma.sql`c."userId" = ${params.userId}`];
  if (params.teamIds.length > 0) {
    scopeFilters.push(Prisma.sql`c."teamId" IN (${Prisma.join(params.teamIds)})`);
  }
  if (params.calIdTeamIds.length > 0) {
    scopeFilters.push(Prisma.sql`c."calIdTeamId" IN (${Prisma.join(params.calIdTeamIds)})`);
  }

  const predicates: Prisma.Sql[] = [
    Prisma.sql`e."startTime" < ${params.to}`,
    Prisma.sql`e."endTime" > ${params.from}`,
    Prisma.sql`ec."syncEnabled" = true`,
    Prisma.sql`(${Prisma.join(scopeFilters, " OR ")})`,
  ];

  if (params.cursorStartTime) {
    predicates.push(Prisma.sql`e."startTime" >= ${params.cursorStartTime}`);
  }
  if (!params.includeCancelledExternal) {
    predicates.push(Prisma.sql`COALESCE(UPPER(e."status"), 'CONFIRMED') <> 'CANCELLED'`);
  }
  if (params.showAsBusyOnly) {
    predicates.push(Prisma.sql`e."showAsBusy" = true`);
  }
  if (params.includeExternalCalendarIds && params.includeExternalCalendarIds.length > 0) {
    predicates.push(Prisma.sql`e."calendarId" IN (${Prisma.join(params.includeExternalCalendarIds)})`);
  }
  if (params.excludeExternalCalendarIds && params.excludeExternalCalendarIds.length > 0) {
    predicates.push(Prisma.sql`e."calendarId" NOT IN (${Prisma.join(params.excludeExternalCalendarIds)})`);
  }

  const rows = await prisma.$queryRaw<ExternalEventRow[]>(
    Prisma.sql`
      SELECT
        e."id",
        e."calendarId",
        e."provider",
        e."externalEventId",
        e."iCalUID",
        e."startTime",
        e."endTime",
        e."isAllDay",
        e."showAsBusy",
        e."status",
        e."rawPayload"
      FROM "ExternalCalendarEvent" e
      INNER JOIN "ExternalCalendar" ec ON ec."id" = e."calendarId"
      INNER JOIN "Credential" c ON c."id" = ec."credentialId"
      WHERE ${Prisma.join(predicates, " AND ")}
      ORDER BY e."startTime" ASC, e."endTime" ASC, e."id" ASC
      LIMIT ${params.take}
    `
  );

  return rows.map((row) => ({
    id: row.id,
    calendarId: row.calendarId,
    provider: row.provider,
    externalEventId: row.externalEventId,
    iCalUID: row.iCalUID,
    startTime: row.startTime,
    endTime: row.endTime,
    isAllDay: row.isAllDay,
    showAsBusy: row.showAsBusy,
    status: row.status,
    rawPayload: row.rawPayload,
  }));
};

const compareByCursor = (
  item: { startTime: string; id: string },
  cursor: { startTime: string; id: string }
): number => {
  const startCompare = Date.parse(item.startTime) - Date.parse(cursor.startTime);
  if (startCompare !== 0) {
    return startCompare;
  }
  return item.id.localeCompare(cursor.id);
};

export const listUnifiedCalendarHandler = async ({
  ctx,
  input,
}: ListOptions): Promise<TUnifiedCalendarListOutput> => {
  const startedAt = Date.now();
  const userId = ctx.user?.id;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  const requestedFrom = toDateOrThrow(input.from, "from");
  const requestedTo = toDateOrThrow(input.to, "to");
  validateRange(requestedFrom, requestedTo);

  const { from, to } = clampRange(requestedFrom, requestedTo, input.clampEnabled);
  if (from >= to) {
    return { items: [], nextCursor: null };
  }

  const cursorStartTime = input.cursor?.startTime
    ? toDateOrThrow(input.cursor.startTime, "cursor.startTime")
    : null;
  const take = Math.min(1000, Math.max(1, input.limit * OVERFETCH_FACTOR));

  log.info("unified_calendar_read_started", {
    event: "unified_calendar_read_started",
    userId,
    from: from.toISOString(),
    to: to.toISOString(),
    limit: input.limit,
  });

  const scopes = await getMembershipScopes(userId);

  const [internalRows, externalRows] = await Promise.all([
    getInternalBookingsInRange({
      userId,
      from,
      to,
      take,
      teamIds: scopes.teamIds,
      calIdTeamIds: scopes.calIdTeamIds,
      includeCancelled: input.includeCancelledInternal,
      cursor: cursorStartTime ? { startTime: cursorStartTime } : null,
    }),
    input.includeExternalEvents
      ? fetchExternalEvents({
          userId,
          from,
          to,
          take,
          teamIds: scopes.teamIds,
          calIdTeamIds: scopes.calIdTeamIds,
          cursorStartTime,
          includeCancelledExternal: input.includeCancelledExternal,
          includeExternalCalendarIds: input.includeExternalCalendarIds,
          excludeExternalCalendarIds: input.excludeExternalCalendarIds,
          showAsBusyOnly: input.showAsBusyOnly,
        })
      : Promise.resolve([]),
  ]);

  const merged = [
    ...internalRows.map(mapInternalBookingToUnifiedItem),
    ...externalRows.map(mapExternalEventToUnifiedItem),
  ].sort(compareUnifiedCalendarItems);

  let filtered = merged;
  if (input.cursor) {
    const cursor = input.cursor;
    const cursorIndex = merged.findIndex(
      (item) => item.id === cursor.id && item.startTime === cursor.startTime
    );

    if (cursorIndex >= 0) {
      filtered = merged.slice(cursorIndex + 1);
    } else {
      filtered = merged.filter((item) => compareByCursor(item, cursor) > 0);
    }
  }

  const items = filtered.slice(0, input.limit);
  const hasMore = filtered.length > input.limit;
  const nextCursor = hasMore
    ? {
        startTime: items[items.length - 1].startTime,
        id: items[items.length - 1].id,
      }
    : null;

  log.info("unified_calendar_read_completed", {
    event: "unified_calendar_read_completed",
    userId,
    internalCount: internalRows.length,
    externalCount: externalRows.length,
    returnedCount: items.length,
    durationMs: Date.now() - startedAt,
  });

  return {
    items,
    nextCursor,
  };
};
