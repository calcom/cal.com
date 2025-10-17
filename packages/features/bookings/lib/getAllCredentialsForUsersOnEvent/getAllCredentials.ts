import type { z } from "zod";

import { eventTypeAppMetadataOptionalSchema } from "@calcom/app-store/zod-utils";
import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import type { CredentialPayload } from "@calcom/types/Credential";

export type EventType = {
  userId?: number | null;
  team?: { id: number | null; parentId: number | null } | null;
  parentId?: number | null;
  metadata: z.infer<typeof EventTypeMetaDataSchema>;
} | null;

/**
 * Gets credentials from the user, team, and org if applicable
 *
 */
export const getAllCredentialsIncludeServiceAccountKey = async (
  user: { id: number; username: string | null; email: string; credentials: CredentialPayload[] },
  eventType: EventType
) => {
  let allCredentials = user.credentials;

  // If it's a team event type query for team credentials
  if (eventType?.team?.id) {
    const teamCredentialsQuery = await prisma.credential.findMany({
      where: {
        teamId: eventType.team.id,
      },
      select: credentialForCalendarServiceSelect,
    });
    allCredentials.push(...teamCredentialsQuery);
  }

  // If it's a managed event type, query for the parent team's credentials
  if (eventType?.parentId) {
    const teamCredentialsQuery = await prisma.team.findFirst({
      where: {
        eventTypes: {
          some: {
            id: eventType.parentId,
          },
        },
      },
      select: {
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
      },
    });
    if (teamCredentialsQuery?.credentials) {
      allCredentials.push(...teamCredentialsQuery?.credentials);
    }
  }

  const { profile } = await new UserRepository(prisma).enrichUserWithItsProfile({
    user: user,
  });

  // If the user is a part of an organization, query for the organization's credentials
  if (profile?.organizationId) {
    const org = await prisma.team.findUnique({
      where: {
        id: profile.organizationId,
      },
      select: {
        credentials: {
          select: credentialForCalendarServiceSelect,
        },
      },
    });

    if (org?.credentials) {
      allCredentials.push(...org.credentials);
    }
  }

  // Only return CRM credentials that are enabled on the event type
  const eventTypeAppMetadata = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);

  // Will be [credentialId]: { enabled: boolean }]
  const eventTypeCrmCredentials: Record<number, { enabled: boolean }> = {};

  for (const appKey in eventTypeAppMetadata) {
    const app = eventTypeAppMetadata[appKey as keyof typeof eventTypeAppMetadata];
    if (app.appCategories && app.appCategories.some((category: string) => category === "crm")) {
      eventTypeCrmCredentials[app.credentialId] = {
        enabled: app.enabled,
      };
    }
  }

  allCredentials = allCredentials.filter((credential) => {
    if (!credential.type.includes("_crm") && !credential.type.includes("_other_calendar")) {
      return credential;
    }

    // Backwards compatibility: All CRM apps are triggered for every event type. Unless disabled on the event type
    // Check if the CRM app exists on the event type
    if (eventTypeCrmCredentials[credential.id]) {
      if (eventTypeCrmCredentials[credential.id].enabled) {
        return credential;
      }
    } else {
      // If the CRM app doesn't exist on the event type metadata, check that the credential belongs to the user/team/org and is an old CRM credential
      if (
        credential.type.includes("_other_calendar") &&
        (credential.userId === eventType?.userId ||
          credential.teamId === eventType?.team?.id ||
          credential.teamId === eventType?.team?.parentId ||
          credential.teamId === profile?.organizationId)
      ) {
        // If the CRM app doesn't exist on the event type metadata, assume it's an older CRM credential
        return credential;
      }
    }
  });

  const userWithDelegationCredentials = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: { ...user, credentials: allCredentials },
  });

  return userWithDelegationCredentials.credentials;
};
