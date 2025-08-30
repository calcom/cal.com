import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isAuthorizedToViewFormOnOrgDomain } from "@calcom/features/routing-forms/lib/isAuthorizedToViewForm";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";

import { enrichFormWithMigrationData } from "../../enrichFormWithMigrationData";
import { getSerializableForm } from "../../lib/getSerializableForm";

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
  const appPages = params.pages.slice(1);
  const formId = appPages[0];
  if (!formId || appPages.length > 2) {
    return {
      notFound: true,
    };
  }
  const { currentOrgDomain } = orgDomainConfig(context.req);

  const isEmbed = appPages[1] === "embed";

  const form = await prisma.app_RoutingForms_Form.findUnique({
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
          slug: true,
          parent: {
            select: { slug: true },
          },
          parentId: true,
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

  const { UserRepository } = await import("@calcom/lib/server/repository/user");
  const userRepo = new UserRepository(prisma);
  const formWithUserProfile = {
    ...form,
    user: await userRepo.enrichUserWithItsProfile({ user: form.user }),
  };

  if (
    !isAuthorizedToViewFormOnOrgDomain({ user: formWithUserProfile.user, currentOrgDomain, team: form.team })
  ) {
    return {
      notFound: true,
    };
  }
  return {
    props: {
      isEmbed,
      profile: {
        theme: form.user.theme,
        brandColor: form.user.brandColor,
        darkBrandColor: form.user.darkBrandColor,
      },
      form: await getSerializableForm({ form: enrichFormWithMigrationData(formWithUserProfile) }),
    },
  };
};
