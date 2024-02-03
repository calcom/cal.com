import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { CAL_URL } from "@calcom/lib/constants";
import { teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

export const enrichFormWithMigrationData = <
  T extends {
    user: {
      movedToProfileId: number | null;
      metadata?: unknown;
      username: string | null;
      organization: {
        slug: string | null;
      } | null;
    };
    team: {
      metadata?: unknown;
    } | null;
  }
>(
  form: T
) => {
  const parsedUserMetadata = userMetadata.parse(form.user.metadata ?? null);
  const parsedTeamMetadata = teamMetadataSchema.parse(form.team?.metadata ?? null);
  const formOwnerOrgSlug = form.user.organization?.slug ?? null;
  const nonOrgUsername = form.user.movedToProfileId
    ? form.user.username
    : parsedUserMetadata?.migratedToOrgFrom?.username ?? null;
  const nonOrgTeamslug = parsedTeamMetadata?.migratedToOrgFrom?.teamSlug ?? null;

  return {
    ...form,
    user: {
      ...form.user,
      metadata: parsedUserMetadata,
    },
    team: {
      ...form.team,
      metadata: teamMetadataSchema.parse(form.team?.metadata ?? null),
    },
    origin: formOwnerOrgSlug
      ? getOrgFullOrigin(formOwnerOrgSlug, {
          protocol: true,
        })
      : CAL_URL,
    nonOrgUsername,
    nonOrgTeamslug,
  };
};
