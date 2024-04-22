import type {
  AppGetServerSidePropsContext,
  AppPrisma,
  AppSsrInit,
  AppUser,
} from "@calcom/types/AppGetServerSideProps";

import { enrichFormWithMigrationData } from "../enrichFormWithMigrationData";
import { getSerializableForm } from "../lib/getSerializableForm";

export const getServerSidePropsForSingleFormView = async function getServerSidePropsForSingleFormView(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser,
  ssrInit: AppSsrInit
) {
  const ssr = await ssrInit(context);

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

  const isFormCreateEditAllowed = (await import("../lib/isFormCreateEditAllowed")).isFormCreateEditAllowed;
  if (!(await isFormCreateEditAllowed({ userId: user.id, formId, targetTeamId: null }))) {
    return {
      notFound: true,
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

  const formWithoutProfilInfo = {
    ...formWithoutUser,
    team: form.team
      ? {
          slug: form.team.slug,
          name: form.team.name,
        }
      : null,
  };

  const { UserRepository } = await import("@calcom/lib/server/repository/user");

  const formWithUserInfoProfil = {
    ...form,
    user: await UserRepository.enrichUserWithItsProfile({ user: form.user }),
  };

  return {
    props: {
      trpcState: await ssr.dehydrate(),
      form: await getSerializableForm({ form: formWithoutProfilInfo }),
      enrichedWithUserProfileForm: await getSerializableForm({
        form: enrichFormWithMigrationData(formWithUserInfoProfil),
      }),
    },
  };
};
