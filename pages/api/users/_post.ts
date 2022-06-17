import { HttpError } from "@/../../packages/lib/http-error";
import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { isAdminGuard } from "@lib/utils/isAdmin";
import { schemaUserCreateBodyParams } from "@lib/validations/user";

async function postHandler(req: NextApiRequest) {
  const isAdmin = await isAdminGuard(req.userId);
  // If user is not ADMIN, return unauthorized.
  if (!isAdmin) throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  const data = schemaUserCreateBodyParams.parse(req.body);
  const user = await prisma.user.create({ data });
  req.statusCode = 201;
  return { user };
}

export default defaultResponder(postHandler);
