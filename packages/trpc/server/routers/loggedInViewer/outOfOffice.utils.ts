import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

export const isAdminForUser = async (adminUserId: number, memberUserId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: memberUserId,
      teams: {
        some: {
          team: {
            AND: [
              {
                members: {
                  some: {
                    userId: adminUserId,
                    role: {
                      in: [MembershipRole.ADMIN, MembershipRole.OWNER],
                    },
                    accepted: true,
                  },
                },
              },
              {
                members: {
                  some: {
                    userId: memberUserId,
                    accepted: true,
                  },
                },
              },
            ],
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  return !!user;
};
