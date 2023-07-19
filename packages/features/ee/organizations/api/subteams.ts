import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const querySchema = z.object({
  org: z.string({ required_error: "org slug is required" }),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parsedQuery = querySchema.safeParse(req.query);

  if (!parsedQuery.success) throw new HttpError({ statusCode: 400, message: parsedQuery.error.message });

  const {
    data: { org: slug },
  } = parsedQuery;
  if (!slug) return res.status(400).json({ message: "Org is needed" });

  const org = await prisma.team.findFirst({ where: { slug }, select: { children: true, metadata: true } });

  if (!org) return res.status(400).json({ message: "Org doesn't exist" });

  const metadata = teamMetadataSchema.parse(org?.metadata);

  if (!metadata?.isOrganization) return res.status(400).json({ message: "Team is not an org" });

  return res.status(200).json({ slugs: org.children.map((ch) => ch.slug) });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
