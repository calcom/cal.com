import { getCalendarCredentials, getConnectedCalendars } from "@calcom/lib/CalendarManager";
import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TUpdateCalendarColorInput, TUpdateCalendarColorOutput } from "./updateCalendarColor.schema";

interface BooleanRow {
  value: boolean;
}

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateCalendarColorInput;
};

type UpdateForUserOptions = {
  userId: number;
  input: TUpdateCalendarColorInput;
};

const providerCredentialTypePredicate = (provider: "GOOGLE" | "OUTLOOK"): Prisma.Sql => {
  if (provider === "GOOGLE") {
    return Prisma.sql`c."type" ILIKE '%google%calendar%'`;
  }
  return Prisma.sql`(c."type" ILIKE '%office365%' OR c."type" ILIKE '%outlook%' OR c."type" ILIKE '%microsoft%')`;
};

const isIntegrationTypeForProvider = (provider: "GOOGLE" | "OUTLOOK", integrationType: string): boolean => {
  const normalized = integrationType.toLowerCase();
  if (provider === "GOOGLE") {
    return normalized.includes("google");
  }
  return (
    normalized.includes("office365") || normalized.includes("outlook") || normalized.includes("microsoft")
  );
};

const isCredentialOwnedByUser = async (params: {
  userId: number;
  provider: "GOOGLE" | "OUTLOOK";
  credentialId: number;
}): Promise<boolean> => {
  const rows = await prisma.$queryRaw<BooleanRow[]>(
    Prisma.sql`
      SELECT true AS "value"
      FROM "Credential" c
      WHERE c."id" = ${params.credentialId}
        AND c."userId" = ${params.userId}
        AND ${providerCredentialTypePredicate(params.provider)}
      LIMIT 1
    `
  );

  return Boolean(rows[0]?.value);
};

const findConnectedCalendarCandidateOwnedByUser = async (params: {
  userId: number;
  provider: "GOOGLE" | "OUTLOOK";
  credentialId: number;
  providerCalendarId: string;
}): Promise<{ calendarName: string | null; isPrimary: boolean } | null> => {
  const credential = await prisma.credential.findFirst({
    where: {
      id: params.credentialId,
      userId: params.userId,
    },
    select: credentialForCalendarServiceSelect,
  });

  if (!credential) {
    return null;
  }

  const calendarCredentials = getCalendarCredentials([credential]);
  const { connectedCalendars } = await getConnectedCalendars(calendarCredentials, []);

  const connectedCalendar = connectedCalendars.find(
    (item) =>
      item.credentialId === params.credentialId &&
      isIntegrationTypeForProvider(params.provider, item.integration.type)
  );
  const candidate = connectedCalendar?.calendars?.find(
    (calendar) => calendar.externalId === params.providerCalendarId
  );

  if (!candidate) {
    return null;
  }

  return {
    calendarName: candidate.name?.trim() || null,
    isPrimary: Boolean(candidate.primary) || candidate.externalId === "primary",
  };
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const mergeCalendarColorIntoMetadata = (params: {
  metadata: Prisma.JsonValue | null;
  color: string;
}): Prisma.JsonObject => {
  const root = asObject(params.metadata);
  const calid = asObject(root.calid);
  const unifiedCalendar = asObject(calid.unifiedCalendar);

  return {
    ...root,
    calid: {
      ...calid,
      unifiedCalendar: {
        ...unifiedCalendar,
        color: params.color,
      },
    },
  };
};

export const updateCalendarColorForUser = async ({
  userId,
  input,
}: UpdateForUserOptions): Promise<TUpdateCalendarColorOutput> => {
  const credentialOwned = await isCredentialOwnedByUser({
    userId,
    provider: input.provider,
    credentialId: input.credentialId,
  });

  if (!credentialOwned) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Calendar not found",
    });
  }

  const connectedCandidate = await findConnectedCalendarCandidateOwnedByUser({
    userId,
    provider: input.provider,
    credentialId: input.credentialId,
    providerCalendarId: input.providerCalendarId,
  });

  if (!connectedCandidate) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Calendar not found",
    });
  }

  const existingCalendar = await prisma.externalCalendar.findUnique({
    where: {
      credentialId_providerCalendarId: {
        credentialId: input.credentialId,
        providerCalendarId: input.providerCalendarId,
      },
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  const metadata = mergeCalendarColorIntoMetadata({
    metadata: existingCalendar?.metadata ?? null,
    color: input.color,
  });

  if (existingCalendar) {
    await prisma.externalCalendar.update({
      where: {
        id: existingCalendar.id,
      },
      data: {
        provider: input.provider,
        calendarName: connectedCandidate.calendarName,
        isPrimary: connectedCandidate.isPrimary,
        metadata,
      },
    });
  } else {
    await prisma.externalCalendar.create({
      data: {
        credentialId: input.credentialId,
        provider: input.provider,
        providerCalendarId: input.providerCalendarId,
        calendarName: connectedCandidate.calendarName,
        isPrimary: connectedCandidate.isPrimary,
        syncEnabled: false,
        metadata,
      },
    });
  }

  return { color: input.color };
};

export const updateCalendarColorHandler = async ({
  ctx,
  input,
}: UpdateOptions): Promise<TUpdateCalendarColorOutput> => {
  const userId = ctx.user?.id;
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  return updateCalendarColorForUser({ userId, input });
};
