import type { TRPCContext } from "@calcom/trpc/server/createContext";
import type { TListMembersInputSchema } from "./listMembers.schema";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

type ListMembersOptions = {
  ctx: TRPCContext & {
    user: NonNullable<TRPCContext["user"]>;
  };
  input: TListMembersInputSchema;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersOptions) => {
  const { teamId } = input;

  // Verify the user is a member of the team
  const membership = await prisma.membership.findFirst({
    where: {
      teamId,
      userId: ctx.user.id,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not a member of this team",
    });
  }

  const members = await prisma.membership.findMany({
    where: { teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  return {
    members: members
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        username: m.user.username,
        avatarUrl: m.user.avatar,
      }))
      // Exclude the current user (event owner) from optional guests list
      .filter((m) => m.id !== ctx.user.id),
  };
};
