import db from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";

type ListWithTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const listWithTeamHandler = async ({ ctx }: ListWithTeamOptions) => {
  const userId = ctx.user.id;
  const query = Prisma.sql`SELECT "public"."EventType"."id", "public"."EventType"."teamId", "public"."EventType"."title", "public"."EventType"."slug", "public"."EventType"."length", "j1"."name" as "teamName"
    FROM "public"."EventType"
    LEFT JOIN "public"."Team" AS "j1" ON ("j1"."id") = ("public"."EventType"."teamId")
    WHERE "public"."EventType"."userId" = ${userId}
    UNION
    SELECT "public"."EventType"."id", "public"."EventType"."teamId", "public"."EventType"."title", "public"."EventType"."slug", "public"."EventType"."length", "j1"."name" as "teamName"
    FROM "public"."EventType"
    INNER JOIN "public"."Team" AS "j1" ON ("j1"."id") = ("public"."EventType"."teamId")
    INNER JOIN "public"."Membership" AS "t2" ON "t2"."teamId" = "j1"."id"
    WHERE "t2"."userId" = ${userId} AND "t2"."accepted" = true`;

  const result = await db.$queryRaw<
    {
      id: number;
      teamId: number | null;
      title: string;
      slug: string;
      length: number;
      teamName: string | null;
    }[]
  >(query);

  return result.map((row) => ({
    id: row.id,
    team: row.teamId ? { id: row.teamId, name: row.teamName || "" } : null,
    title: row.title,
    slug: row.slug,
    length: row.length,
  }));
};
