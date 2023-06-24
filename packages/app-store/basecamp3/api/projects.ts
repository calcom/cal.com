import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { userAgent } from "../lib/constants";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const credential = await prisma.credential.findFirst({
    where: {
      userId: req.session?.user?.id,
    },
    select: { key: true },
  });

  if (!credential) {
    return res.status(400).json({ message: "No app credential found for user" });
  }
  const url = `${credential.key?.account?.href}/projects.json`;
  console.log("FETCHING DATA", url);
  const resp = await fetch(url, {
    headers: { "User-Agent": userAgent, Authorization: `Bearer ${credential.key.access_token}` },
  });
  const data = await resp.json();
  console.log("dataz", credential.key);
  return res.json({ data, currentProject: credential.key.projectId });
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  console.log("session idd", req.session?.user?.id);
  const credential = await prisma.credential.findFirst({
    where: {
      userId: req.session?.user?.id,
    },
    select: { key: true, id: true },
  });

  if (!credential) {
    return res.status(400).json({ message: "No app credential found for user" });
  }
  // get schedule id
  const basecampUserId = credential.key.account.id;
  const scheduleResponse = await fetch(
    `https://3.basecampapi.com/${basecampUserId}/projects/${projectId}.json`,
    {
      headers: {
        "User-Agent": userAgent,
        Authorization: `Bearer ${credential.key.access_token}`,
      },
    }
  );
  const scheduleJson = await scheduleResponse.json();
  const scheduleId = scheduleJson.dock.find((dock) => dock.name === "schedule").id;
  await prisma.credential.update({
    where: { id: credential.id },
    data: { key: { ...credential.key, projectId: Number(projectId), scheduleId } },
  });

  return res.json({ message: "Updated basecamp project" });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
