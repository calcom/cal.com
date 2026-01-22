import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";

export const getServerSideProps = async ({ req }: GetServerSidePropsContext) => {
  const featureRepository = getFeatureRepository();
  const organizationsEnabled = await featureRepository.checkIfFeatureIsEnabledGlobally("organizations");
  // Check if organizations are enabled
  if (!organizationsEnabled) {
    return {
      notFound: true,
    } as const;
  }

  // Check if logged in user has an organization assigned
  const session = await getServerSession({ req });

  if (!session?.user.profile?.organizationId) {
    return {
      notFound: true,
    } as const;
  }

  const permissionCheckService = new PermissionCheckService();
  const canManageOrganization = await permissionCheckService.checkPermission({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    permission: "organization.update",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!canManageOrganization) {
    return {
      notFound: true,
    } as const;
  }

  // Otherwise, all good
  return {
    props: {},
  };
};
