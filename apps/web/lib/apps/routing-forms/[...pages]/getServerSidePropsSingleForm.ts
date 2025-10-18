import { enrichFormWithMigrationData } from "@calcom/app-store/routing-forms/enrichFormWithMigrationData";
import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { MembershipRole } from "@calcom/prisma/enums";
import type { AppGetServerSidePropsContext, AppPrisma, AppUser } from "@calcom/types/AppGetServerSideProps";

export const getServerSidePropsForSingleFormView = async function getServerSidePropsForSingleFormView(
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

  const { UserRepository } = await import("@calcom/features/users/repositories/UserRepository");

  const userRepo = new UserRepository(prisma);
  const formWithUserInfoProfile = {
    ...form,
    user: await userRepo.enrichUserWithItsProfile({ user: form.user }),
  };

  // Get PBAC permissions for team-scoped routing forms
  let permissions = {
    canCreate: false,
    canRead: false,
    canEdit: false,
    canDelete: false,
  };

  if (!form.teamId) {
    // For personal forms (teamId = null),
    // check if the form belongs to the current user
    if (form.userId !== user.id) {
      return {
        notFound: true,
      };
    }

    permissions = {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    };
  } else {
    // team-scoped routing form
    // Get user's role in the team
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
      userId: user.id,
      teamId: form.teamId,
    });

    if (!membership) {
      return {
        notFound: true,
      };
    }

    permissions = await getResourcePermissions({
      userId: user.id,
      teamId: form.teamId,
      resource: Resource.RoutingForm,
      userRole: membership.role,
      fallbackRoles: {
        read: { roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER] },
        create: { roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        update: { roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
        delete: { roles: [MembershipRole.ADMIN, MembershipRole.OWNER] },
      },
    });
  }

  return {
    props: {
      form: await getSerializableForm({ form: formWithoutProfileInfo }),
      enrichedWithUserProfileForm: await getSerializableForm({
        form: enrichFormWithMigrationData(formWithUserInfoProfile),
      }),
      permissions: {
        canCreate: permissions.canCreate,
        canRead: permissions.canRead,
        canEdit: permissions.canEdit,
        canDelete: permissions.canDelete,
      },
    },
  };
};
