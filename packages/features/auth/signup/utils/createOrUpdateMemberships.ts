import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import type { User, OrganizationSettings, CalIdTeam } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

export const createOrUpdateMemberships = async ({
  user,
  team,
}: {
  user: Pick<User, "id">;
  team: Pick<CalIdTeam, "id"> & {
    organizationSettings?: Pick<OrganizationSettings, "orgAutoAcceptEmail"> | null;
  };
}) => {
  return await prisma.$transaction(async (tx) => {
    // if (team.isOrganization) {
    //   const dbUser = await tx.user.update({
    //     where: {
    //       id: user.id,
    //     },
    //     data: {
    //       organizationId: team.id,
    //     },
    //     select: {
    //       username: true,
    //       email: true,
    //     },
    //   });

    //   // Ideally dbUser.username should never be null, but just in case.
    //   // This method being called only during signup means that dbUser.username should be the correct org username
    //   const orgUsername =
    //     dbUser.username ||
    //     getOrgUsernameFromEmail(dbUser.email, team.organizationSettings?.orgAutoAcceptEmail ?? null);
    //   await tx.profile.upsert({
    //     create: {
    //       uid: ProfileRepository.generateProfileUid(),
    //       userId: user.id,
    //       organizationId: team.id,
    //       username: orgUsername,
    //     },
    //     update: {
    //       username: orgUsername,
    //     },
    //     where: {
    //       userId_organizationId: {
    //         userId: user.id,
    //         organizationId: team.id,
    //       },
    //     },
    //   });
    // }
    const membership = await tx.calIdMembership.upsert({
      where: {
        userId_calIdTeamId: { userId: user.id, calIdTeamId: team.id },
      },
      update: {
        acceptedInvitation: true,
      },
      create: {
        userId: user.id,
        calIdTeamId: team.id,
        role: MembershipRole.MEMBER,
        acceptedInvitation: true,
      },
    });
    const orgMembership = null;
    // if (team.parentId) {
    //   await tx.calIdMembership.upsert({
    //     where: {
    //       userId_calIdTeamId: { userId: user.id, calIdTeamId: team.parentId },
    //     },
    //     update: {
    //       acceptedInvitation: true,
    //     },
    //     create: {
    //       userId: user.id,
    //       calIdTeamId: team.parentId,
    //       role: MembershipRole.MEMBER,
    //       acceptedInvitation: true,
    //     },
    //   });
    // }
    await updateNewTeamMemberEventTypes(user.id, team.id);
    return { membership, orgMembership };
  });
};
