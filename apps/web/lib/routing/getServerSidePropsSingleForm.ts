import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { prisma } from "@calcom/prisma";
import type { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";

import { ssrInit } from "@server/lib/ssr";

export const getServerSidePropsForSingleFormView = async function getServerSidePropsForSingleFormView(
  context: AppGetServerSidePropsContext
) {
  const ssr = await ssrInit(context);
  const session = await getServerSession({ req: context.req });
  const user = session?.user;
  if (!user) {
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }
  const { params } = context;
  if (!params) {
    return {
      notFound: true,
    };
  }
  const formId = params.appPages[0];
  if (!formId || params.appPages.length > 1) {
    return {
      notFound: true,
    };
  }

  const isFormCreateEditAllowed = (
    await import("@calcom/app-store/routing-forms/lib/isFormCreateEditAllowed")
  ).isFormCreateEditAllowed;
  if (!(await isFormCreateEditAllowed({ userId: user.id, formId, targetTeamId: null }))) {
    return {
      redirect: {
        permanent: false,
        destination: "/403",
      },
    };
  }

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
          name: true,
          parent: {
            select: { slug: true },
          },
          parentId: true,
          metadata: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });
  if (!form) {
    return {
      notFound: true,
    };
  }

  const { user: u, ...formWithoutUser } = form;

  const formWithoutProfileInfo = {
    ...formWithoutUser,
    team: form.team
      ? {
          slug: form.team.slug,
          name: form.team.name,
        }
      : null,
  };

  const { UserRepository } = await import("@calcom/lib/server/repository/user");

  const formWithUserInfoProfile = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  return {
    props: {
      trpcState: await ssr.dehydrate(),
      form: await getSerializableForm({ form: formWithoutProfileInfo }),
      enrichedWithUserProfileForm: await getSerializableForm({
        form: enrichFormWithMigrationData(formWithUserInfoProfile),
      }),
    },
  };
};
