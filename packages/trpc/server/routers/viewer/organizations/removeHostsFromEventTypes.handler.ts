import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TRemoveHostsFromEventTypes } from "./removeHostsFromEventTypes.schema";

type RemoveHostsFromEventTypes = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TRemoveHostsFromEventTypes;
};

export async function removeHostsFromEventTypesHandler({
  ctx: { user: authedUser },
  input,
}: RemoveHostsFromEventTypes) {
  if (!authedUser.profile?.organizationId) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (!(await isOrganisationAdmin(authedUser.id, authedUser.profile.organizationId)))
    throw new TRPCError({ code: "UNAUTHORIZED" });

  const { userIds, eventTypeIds } = input;

  return await prisma.host.deleteMany({
    where: {
      eventTypeId: {
        in: eventTypeIds,
      },
      userId: {
        in: userIds,
      },
    },
  });
}

export default removeHostsFromEventTypesHandler;
