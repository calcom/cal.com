import { SeatChangeTrackingService } from "@calcom/features/ee/billing/service/seatTracking/SeatChangeTrackingService";
import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { getUserCreationService } from "@calcom/features/users/di/UserCreationService.container";
import { getUsernameValidationService } from "@calcom/features/users/di/UsernameValidationService.container";
import prisma from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { deriveNameFromOrgUsername } from "../../../../auth/signup/utils/getOrgUsernameFromEmail";
import dSyncUserSelect from "./dSyncUserSelect";

type createUsersAndConnectToOrgPropsType = {
  emailsToCreate: string[];
  identityProvider: IdentityProvider;
  identityProviderId: string | null;
};

export const createUsersAndConnectToOrg = async ({
  createUsersAndConnectToOrgProps,
  org,
}: {
  createUsersAndConnectToOrgProps: createUsersAndConnectToOrgPropsType;
  org: {
    id: number;
    organizationSettings: {
      orgAutoAcceptEmail: string | null;
    } | null;
  };
}) => {
  const { emailsToCreate, identityProvider, identityProviderId } = createUsersAndConnectToOrgProps;

  // As of Mar 2024 Prisma createMany does not support nested creates and returning created records
  await getUserCreationService().createManyUsers({
    data: emailsToCreate.map((email) => {
      const username = getUsernameValidationService().deriveFromEmail(
        email,
        org.organizationSettings?.orgAutoAcceptEmail ?? ""
      );
      const name = deriveNameFromOrgUsername({ username });
      return {
        username,
        email,
        name,
        verified: true,
        emailVerified: new Date(),
        invitedTo: org.id,
        organizationId: org.id,
        identityProvider,
        identityProviderId,
        creationSource: CreationSource.WEBAPP,
        locked: false,
      };
    }),
    skipDuplicates: true,
  });

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emailsToCreate,
      },
    },
    select: dSyncUserSelect,
  });

  // Create profiles for new users
  await ProfileRepository.createManyPromise({
    users,
    organizationId: org.id,
    orgAutoAcceptEmail: org.organizationSettings?.orgAutoAcceptEmail ?? "",
  });

  // Create memberships for new members
  const membershipResult = await PrismaMembershipRepository.createMany(
    users.map((user) => ({
      userId: user.id,
      teamId: org.id,
      role: MembershipRole.MEMBER,
      accepted: true,
    }))
  );

  if (membershipResult.count > 0) {
    const seatTracker = new SeatChangeTrackingService();
    await seatTracker.logSeatAddition({
      teamId: org.id,
      seatCount: membershipResult.count,
    });
  }

  return users;
};

export default createUsersAndConnectToOrg;
