import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { isAdminGuard } from "@lib/utils/isAdmin";
import { schemaUserCreateBodyParams } from "@lib/validations/user";

async function postHandler(req: NextApiRequest) {
  const { prisma } = req;
  const isAdmin = await isAdminGuard(req);
  // If user is not ADMIN, return unauthorized.
  if (!isAdmin) throw new HttpError({ statusCode: 401, message: "You are not authorized" });
  const data = schemaUserCreateBodyParams.parse(req.body);
  const user = await prisma.user.create({ data });
  req.statusCode = 201;
  return { user };
}

export default defaultResponder(postHandler);
