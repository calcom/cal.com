import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "../../../types";
import type { TListMembersMinimalInput } from "./listMembersMinimal.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListMembersMinimalInput;
};

export const listMembersMinimalHandler = async ({ ctx, input }: GetOptions) => {
  const organizationId = ctx.user.organizationId ?? ctx.user.profiles[0]?.organizationId;

  // Return empty if user is not part of an organization or org is private
  if (!organizationId || ctx.user.organization?.isPrivate) {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const { limit, cursor, searchTerm } = input;

  const where: Prisma.MembershipWhereInput = {
    teamId: organizationId,
    user: {
      username: { not: null },
      isPlatformManaged: false,
      ...(cursor && { id: { gt: cursor } }),
      ...(searchTerm && {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { username: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
    },
  };

  const members = await prisma.membership.findMany({
    where,
    select: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
    take: limit + 1,
    orderBy: {
      user: {
        id: "asc",
      },
    },
  });

  const items = members
    .filter((m): m is typeof m & { user: { username: string } } => m.user.username !== null)
    .map((m) => ({
      id: m.user.id,
      name: m.user.name ?? m.user.username,
      username: m.user.username,
    }));

  let nextCursor: number | null = null;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return {
    items,
    nextCursor,
  };
};

export default listMembersMinimalHandler;
