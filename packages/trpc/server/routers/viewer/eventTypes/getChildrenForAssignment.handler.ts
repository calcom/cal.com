import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TGetChildrenForAssignmentInputSchema } from "./getChildrenForAssignment.schema";

type GetChildrenForAssignmentInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetChildrenForAssignmentInputSchema;
};

export type AssignmentChild = {
  childEventTypeId: number;
  slug: string;
  hidden: boolean;
  owner: {
    id: number;
    name: string | null;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
};

export type GetChildrenForAssignmentResponse = {
  children: AssignmentChild[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export const getChildrenForAssignmentHandler = async ({
  ctx,
  input,
}: GetChildrenForAssignmentInput): Promise<GetChildrenForAssignmentResponse> => {
  const { eventTypeId, cursor, limit, search } = input;

  const hostRepository = new HostRepository(ctx.prisma);
  const { items, nextCursor, hasMore } = await hostRepository.findChildrenForAssignmentPaginated({
    eventTypeId,
    cursor: cursor ?? undefined,
    limit,
    search,
  });

  const children: AssignmentChild[] = items
    .filter((item) => item.owner !== null)
    .map((item) => ({
      childEventTypeId: item.id,
      slug: item.slug,
      hidden: item.hidden,
      owner: {
        id: item.owner!.id,
        name: item.owner!.name,
        email: item.owner!.email,
        username: item.owner!.username,
        avatarUrl: item.owner!.avatarUrl,
      },
    }));

  return { children, nextCursor, hasMore };
};
