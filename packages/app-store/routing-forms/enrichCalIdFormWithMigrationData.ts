import { WEBAPP_URL } from "@calcom/lib/constants";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

export const enrichCalIdFormWithMigrationData = <
  T extends {
    user: {
      movedToProfileId: number | null;
      metadata?: unknown;
      username: string | null;
      nonProfileUsername: string | null;
      profile: {
        organization: {
          slug: string | null;
        } | null;
      };
    };
    calIdTeam: {
      metadata?: unknown;
      name?: string;
      slug?: string | null;
      [key: string]: any;
    } | null;
  }
>(
  form: T
) => {
  const parsedUserMetadata = userMetadata.parse(form.user.metadata ?? null);
  const parsedCalIdTeamMetadata = teamMetadataSchema.parse(form.calIdTeam?.metadata ?? null);
  const nonOrgUsername = parsedUserMetadata?.migratedToOrgFrom?.username ?? form.user.nonProfileUsername;
  const nonOrgCalIdTeamslug = parsedCalIdTeamMetadata?.migratedToOrgFrom?.teamSlug ?? null;

  return {
    ...form,
    user: {
      ...form.user,
      metadata: parsedUserMetadata,
    },
    calIdTeam: {
      ...form.calIdTeam,
      metadata: teamMetadataSchema.parse(form.calIdTeam?.metadata ?? null),
    },
    userOrigin: WEBAPP_URL,
    calIdTeamOrigin: WEBAPP_URL, // CalIdTeam doesn't have parent hierarchy like regular teams
    nonOrgUsername,
    nonOrgCalIdTeamslug,
  };
};
