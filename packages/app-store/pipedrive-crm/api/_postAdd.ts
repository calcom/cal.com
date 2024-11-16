import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import appConfig from "../../pipedrive-crm/config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  if (!session.user) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
  //this need to be accessed by admin only. need to conform

  const { client_id, client_secret }: { client_id: string; client_secret: string } = req.body;
  if (!client_id || !client_secret)
    throw new HttpError({ statusCode: 400, message: "client_id and client_secret are required" });
  //Not sure if it is valid or not. right now any user can change the pipe drive credentials.
  const data = {
    slug: appConfig.slug,
    keys: { client_id, client_secret },
    enabled: true,
    categories: appConfig["categories"],
    dirName: appConfig["dirName"],
  } as any;
  try {
    //making sure only one record is maintianed
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
    return res.status(500).json({ message: "Could not add Close.com app" });
  }

  const { returnTo, ...newQeury } = req.query;

  const query = stringify(newQeury);

  return res.status(200).json({
    url: returnTo ? `${returnTo}&${query}` : getInstalledAppPath({ variant: "crm", slug: "pipedrive-crm" }),
  });
}

export default defaultResponder(getHandler);
