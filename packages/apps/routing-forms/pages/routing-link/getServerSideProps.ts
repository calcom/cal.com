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
    username: string | null;
    metadata: Prisma.JsonValue;
    movedToProfileId: number | null;
    profile: {
      organization: { slug: string | null; requestedSlug: string | null } | null;
    };
    id: number;
  };
  currentOrgDomain: string | null;
}) {
  const formUser = {
    ...user,
    metadata: userMetadata.parse(user.metadata),
  };
  const orgSlug = formUser.profile.organization?.slug ?? formUser.profile.organization?.requestedSlug ?? null;

  if (!currentOrgDomain) {
    // If not on org domain, let's allow serving any form belong to any organization so that even if the form owner is migrate to an organization, old links for the form keep working
    return true;
  } else if (currentOrgDomain !== orgSlug) {
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
  if (context.query["flag.coep"] === "true") {
    context.res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  }

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
  const formWithUserProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  if (!(await isAuthorizedToViewTheForm({ user: formWithUserProfile.user, currentOrgDomain }))) {
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
      form: await getSerializableForm({ form: enrichFormWithMigrationData(formWithUserProfile) }),
    },
  };
};
