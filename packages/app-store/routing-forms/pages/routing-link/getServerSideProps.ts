import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import type { Prisma } from "@calcom/prisma/client";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";

import { enrichFormWithMigrationData } from "../../enrichFormWithMigrationData";
import { getSerializableForm } from "../../lib/getSerializableForm";

export function isAuthorizedToViewTheForm({
  user,
  currentOrgDomain,
}: {
  user: { metadata: Prisma.JsonValue; organization: { slug: string | null } | null };
  currentOrgDomain: string | null;
}) {
  const formUser = {
    ...user,
    metadata: userMetadata.parse(user.metadata),
  };

  if (!currentOrgDomain) {
    // If the form doesn't belong to an org user and we are on non-org domain, then obviously allow access
    if (!formUser.organization) {
      return true;
    }
    // Check if the form owner has been migrated to an org. If yes, then still allow access on non-org domain
    if (!formUser.metadata?.migratedToOrgFrom) {
      return false;
    }
  } else if (currentOrgDomain !== formUser.organization?.slug) {
    // If on org domain,
    // We don't serve the form that is of another org
    // We don't serve the form that doesn't belong to any org
    return false;
  }
  return true;
}
export const getServerSideProps = async function getServerSideProps(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma
) {
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 2) {
    return {
      notFound: true,
    };
  }
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req);

  const isEmbed = params.appPages[1] === "embed";

  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
    include: {
      user: {
        select: {
          organization: {
            select: {
              slug: true,
            },
          },
          username: true,
          theme: true,
          brandColor: true,
          darkBrandColor: true,
          metadata: true,
        },
      },
      team: {
        select: {
          metadata: true,
        },
      },
    },
  });

  if (!form || form.disabled) {
    return {
      notFound: true,
    };
  }

  if (!isAuthorizedToViewTheForm({ user: form.user, currentOrgDomain })) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      isEmbed,
      themeBasis: form.user.username,
      profile: {
        theme: form.user.theme,
        brandColor: form.user.brandColor,
        darkBrandColor: form.user.darkBrandColor,
      },
      form: await getSerializableForm({ form: enrichFormWithMigrationData(form) }),
    },
  };
};
