import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import type { AppGetServerSidePropsContext, AppPrisma } from "@calcom/types/AppGetServerSideProps";

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
      user: {
        organization: isValidOrgDomain
          ? {
              slug: currentOrgDomain,
            }
          : null,
      },
    },
    include: {
      user: {
        select: {
          username: true,
          theme: true,
          brandColor: true,
          darkBrandColor: true,
        },
      },
    },
  });

  if (!form || form.disabled) {
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
      form: await getSerializableForm({ form }),
    },
  };
};
