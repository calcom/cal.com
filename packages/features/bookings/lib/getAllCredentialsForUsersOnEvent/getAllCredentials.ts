import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import type { CredentialPayload } from "@calcom/types/Credential";

/**
 * Gets credentials from the user, team, and org if applicable
 *
 */
export const getAllCredentials = async (
  user: { id: number; username: string | null; credentials: CredentialPayload[] },
  eventType: { team: { id: number | null } | null; parentId: number | null } | null
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

  const { profile } = await UserRepository.enrichUserWithItsProfile({
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
  const eventTypeAppMetadata = eventType?.metadata?.apps;

  // Will be [credentialId]: { enabled: boolean }]
  const eventTypeCrmCredentials = {};

  for (const appKey in eventTypeAppMetadata) {
    const app = eventTypeAppMetadata[appKey];
    if (app.appCategories && app.appCategories.some((category) => category === "crm")) {
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
      // If the CRM app doesn't exist on the event type metadata, check that the credential belongs to the user/team/org
      if (
        credential.userId === eventType.userId ||
        credential.teamId === eventType.team?.id ||
        credential.teamId === eventType.parentId
      ) {
        // If the CRM app doesn't exist on the event type metadata, assume it's an older CRM credential
        return credential;
      }
    }
  });

  return allCredentials;
};
