import type { Params } from "app/_types";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import z from "zod";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  org: z.string({ required_error: "org slug is required" }),
});

async function handler(req: NextRequest, { params }: { params: Params }) {
  const parsedQuery = querySchema.safeParse(params);

  if (!parsedQuery.success) throw new HttpError({ statusCode: 400, message: parsedQuery.error.message });

  const {
    data: { org: slug },
  } = parsedQuery;
  if (!slug) return NextResponse.json({ message: "Org is needed" }, { status: 400 });

  const org = await prisma.team.findFirst({
    where: { slug },
    select: { children: true, isOrganization: true },
  });

  if (!org) return NextResponse.json({ message: "Org doesn't exist" }, { status: 400 });

  const isOrganization = org.isOrganization;

  if (!isOrganization) return NextResponse.json({ message: "Team is not an org" }, { status: 400 });

  return NextResponse.json({ slugs: org.children.map((ch) => ch.slug) });
}

const getHandler = defaultResponderForAppDir(handler);

export { getHandler as GET };
