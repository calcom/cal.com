import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

const ROLES_WITH_EDIT_PERMISSION = [MembershipRole.ADMIN, MembershipRole.OWNER] as MembershipRole[];

type InputOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: {
    memberId: number;
  };
};

export async function hasEditPermissionForUserID({ ctx, input }: InputOptions) {
  const { user } = ctx;
  const memberships = await prisma.membership.findMany({
    where: {
      OR: [
        {
          userId: user.id,
          accepted: true,
          role: {
            in: [MembershipRole.ADMIN, MembershipRole.OWNER],
          },
        },
        {
          userId: input.memberId,
          accepted: true,
        },
      ],
    },
  });

  const hasEditPermission = memberships.some(
    (m) =>
      (m.userId === user.id && ROLES_WITH_EDIT_PERMISSION.includes(m.role)) || m.userId === input.memberId
  );

  return hasEditPermission;
}

export async function hasReadPermissionsForUserId({ ctx, input }: InputOptions) {
  const { user } = ctx;
  const memberships = await prisma.membership.findMany({
    where: {
      OR: [
        {
          userId: user.id,
          accepted: true,
        },
        {
          userId: input.memberId,
          accepted: true,
        },
      ],
    },
  });

  const hasReadPermission = memberships.some((m) => m.userId === user.id || m.userId === input.memberId);

  return hasReadPermission;
}
