import type { BasecampToken } from "basecamp3/lib/CalendarService";
import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { userAgent } from "../lib/constants";
import { refreshAccessToken } from "../lib/helpers";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const credential = await prisma.credential.findFirst({
    where: {
      userId: req.session?.user?.id,
    },
  });
  if (!credential) {
    return res.status(400).json({ message: "No app credential found for user" });
  }
  let credentialKey = credential.key as BasecampToken;
  if (credentialKey.expires_at < Date.now()) {
    credentialKey = (await refreshAccessToken(credential)) as BasecampToken;
  }
  const url = `${credentialKey.account.href}/projects.json`;

  const resp = await fetch(url, {
    headers: { "User-Agent": userAgent, Authorization: `Bearer ${credentialKey.access_token}` },
  });
  const data = await resp.json();
  return res.json({ data, currentProject: credentialKey.projectId });
}

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query;
  const credential = await prisma.credential.findFirst({
    where: {
      userId: req.session?.user?.id,
    },
  });

  if (!credential) {
    return res.status(400).json({ message: "No app credential found for user" });
  }
  let credentialKey = credential.key as BasecampToken;

  if (credentialKey.expires_at < Date.now()) {
    credentialKey = (await refreshAccessToken(credential)) as BasecampToken;
  }
  // get schedule id
  const basecampUserId = credentialKey.account.id;
  const scheduleResponse = await fetch(
    `https://3.basecampapi.com/${basecampUserId}/projects/${projectId}.json`,
    {
      headers: {
        "User-Agent": userAgent,
        Authorization: `Bearer ${credentialKey.access_token}`,
      },
    }
  );
  const scheduleJson = await scheduleResponse.json();
  const scheduleId = scheduleJson.dock.find((dock: any) => dock.name === "schedule").id;
  await prisma.credential.update({
    where: { id: credential.id },
    data: { key: { ...credentialKey, projectId: Number(projectId), scheduleId } },
  });

  return res.json({ message: "Updated basecamp project" });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
