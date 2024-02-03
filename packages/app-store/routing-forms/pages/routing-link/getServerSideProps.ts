import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import type { Prisma } from "@calcom/prisma/client";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";

import { enrichFormWithMigrationData } from "../../enrichFormWithMigrationData";
import { getSerializableForm } from "../../lib/getSerializableForm";

export async function isAuthorizedToViewTheForm({
  user,
  currentOrgDomain,
}: {
  user: {
    metadata: Prisma.JsonValue;
    movedToProfileId: number | null;
    organization: { slug: string | null } | null;
    id: number;
  };
  currentOrgDomain: string | null;
}) {
  const formUser = {
    ...user,
    metadata: userMetadata.parse(user.metadata),
  };
  const { UserRepository } = await import("@calcom/lib/server/repository/user");
  console.log("isAuthorizedToViewTheForm", formUser, currentOrgDomain);
  if (!currentOrgDomain) {
    // If the form doesn't belong to an org user and we are on non-org domain, then obviously allow access
    if (!(await UserRepository.findIfAMemberOfSomeOrganization({ user: formUser }))) {
      return true;
    }
    // Check if the form owner has been migrated to an org. If not(i.e. user is a new user that was directly added to an organization), then we can't allow access to his form on non-org domain
    if (
      !UserRepository.isMigratedToOrganization({ user: formUser }) &&
      !UserRepository.isMovedToAProfile({ user: formUser })
    ) {
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
  const { currentOrgDomain } = orgDomainConfig(context.req);

  const isEmbed = params.appPages[1] === "embed";

  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
    include: {
      user: {
        select: {
          id: true,
          movedToProfileId: true,
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

  if (!(await isAuthorizedToViewTheForm({ user: form.user, currentOrgDomain }))) {
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
