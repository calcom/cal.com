import type { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";

import { enrichCalIdFormWithMigrationData } from "../enrichCalIdFormWithMigrationData";
import { getCalIdSerializableForm } from "../lib/getCalIdSerializableForm";

export const getServerSidePropsForSingleFormViewCalId = async function getServerSidePropsForSingleFormViewCalId(
  context: AppGetServerSidePropsContext,
  prisma: AppPrisma,
  user: AppUser
) {
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
  const appPages = params.pages.slice(1);
  const formId = appPages[0];
  if (!formId || appPages.length > 1) {
    return {
      notFound: true,
    };
  }

  const isFormCreateEditAllowed = (await import("../lib/isFormCreateEditAllowed")).isFormCreateEditAllowed;
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
      calIdTeam: {
        select: {
          slug: true,
          name: true,
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
    calIdTeam: form.calIdTeam
      ? {
          slug: form.calIdTeam.slug,
          name: form.calIdTeam.name,
        }
      : null,
  };

  const { UserRepository } = await import("@calcom/lib/server/repository/user");

  const userRepo = new UserRepository(prisma);
  const formWithUserInfoProfile = {
    ...form,
    user: await userRepo.enrichUserWithItsProfile({ user: form.user }),
  };

  return {
    props: {
      form: await getCalIdSerializableForm({ form: formWithoutProfileInfo }),
      enrichedWithUserProfileForm: enrichCalIdFormWithMigrationData(formWithUserInfoProfile as any),
    },
  };
};
