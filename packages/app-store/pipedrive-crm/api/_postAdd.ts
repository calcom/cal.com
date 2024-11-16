import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { throwIfNotHaveAdminAccessToTeam } from "../../_utils/throwIfNotHaveAdminAccessToTeam";
import appConfig from "../../pipedrive-crm/config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = checkSession(req);
    const user = session?.user;
    if (!user) {
      throw new HttpError({ statusCode: 401, message: "Unauthorized" });
    }
    //this need to be accessed by admin only. need to confirm
    let teamId = req?.query?.teamId;
    const state = (req?.query?.state || "{}") as string;
    if (!teamId) {
      teamId = JSON.parse(state)?.teamId || "";
    }
    await throwIfNotHaveAdminAccessToTeam({
      teamId: teamId ? Number(teamId) : null,
      userId: Number(user.id),
    });
    const { client_id, client_secret }: { client_id: string; client_secret: string } = req.body;
    if (!client_id || !client_secret)
      throw new HttpError({ statusCode: 400, message: "client_id and client_secret are required" });
    const data = {
      slug: appConfig.slug,
      keys: { client_id, client_secret },
      enabled: true,
      categories: appConfig["categories"],
      dirName: appConfig["dirName"],
    } as Prisma.AppCreateInput;
    //making sure only one record is maintained
    const exisitngApp = await prisma.app.findUnique({
      where: {
        slug: appConfig.slug,
      },
    });
    if (exisitngApp) {
      await prisma.app.update({
        where: { slug: exisitngApp.slug },
        data,
      });
    } else {
      await prisma.app.create({
        data,
      });
    }
  } catch (reason) {
    logger.error("Could not add Pipedrive.com app", reason);
    return res.status(500).json({ message: "Could not add Pipedrive.com app" });
  }
  const { returnTo, ...newQeury } = req.query;
  const query = stringify(newQeury || {});
  return res.status(200).json({
    url: returnTo ? `${returnTo}&${query}` : getInstalledAppPath({ variant: "crm", slug: "pipedrive-crm" }),
  });
}

export default defaultResponder(getHandler);
