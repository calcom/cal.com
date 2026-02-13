import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { isAuthorizedToViewFormOnOrgDomain } from "@calcom/features/routing-forms/lib/isAuthorizedToViewForm";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";

import { buildCustomDomainRedirect } from "@lib/getCustomDomainRedirect";

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
  const { currentOrgDomain, isValidOrgDomain, customDomain } = orgDomainConfig(context.req);

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
              customDomain: {
                where: {
                  verified: true,
                },
                select: {
                  slug: true,
                }
              }
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
            select: {
              slug: true,
              customDomain: { where: { verified: true }, select: { slug: true } },
            },
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

  if (!isEmbed && isValidOrgDomain && !customDomain) {
    const orgCustomDomainSlug =
      form.team?.parent?.customDomain?.slug ?? form.user.organization?.customDomain?.slug;
    const customDomainRedirect = buildCustomDomainRedirect({
      customDomainFromRequest: customDomain,
      verifiedCustomDomain: orgCustomDomainSlug,
      path: `/forms/${formId}`,
      search: context.resolvedUrl?.includes("?") ? `?${context.resolvedUrl.split("?")[1]}` : "",
    });
    if (customDomainRedirect) return customDomainRedirect;
  }

  const { UserRepository } = await import("@calcom/features/users/repositories/UserRepository");
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
        theme: formWithUserProfile.user.profile?.organization?.theme ?? formWithUserProfile.user.theme,
        brandColor:
          formWithUserProfile.user.profile?.organization?.brandColor ?? formWithUserProfile.user.brandColor,
        darkBrandColor:
          formWithUserProfile.user.profile?.organization?.darkBrandColor ??
          formWithUserProfile.user.darkBrandColor,
      },
      form: await getSerializableForm({ form: enrichFormWithMigrationData(formWithUserProfile) }),
    },
  };
};
