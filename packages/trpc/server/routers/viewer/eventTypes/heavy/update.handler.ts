import { getEventTypeService } from "@calcom/features/eventtypes/di/EventTypeService.container";
import type { PrismaClient } from "@calcom/prisma";
import type { GetServerSidePropsContext, NextApiResponse } from "next";
import type { TrpcSessionUser } from "../../../../types";
import type { TUpdateInputSchema } from "./update.schema";

type SessionUser = NonNullable<TrpcSessionUser>;

type User = {
  id: SessionUser["id"];
  username: SessionUser["username"];
  profile: {
    id: SessionUser["profile"]["id"] | null;
  };
  userLevelSelectedCalendars: SessionUser["userLevelSelectedCalendars"];
  organizationId: number | null;
  email: SessionUser["email"];
  locale: string;
};

type UpdateOptions = {
  ctx: {
    user: User;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
};

export type UpdateEventTypeReturn = Awaited<ReturnType<typeof updateHandler>>;

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const service = getEventTypeService();
  return service.update({
    user: ctx.user,
    input,
    res: ctx.res as NextApiResponse | undefined,
  });
};
