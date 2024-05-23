import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import type { AuditLogEvent } from "@calcom/features/audit-logs/types";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import GenericAuditLogManager from "../lib/AuditLogManager";

const pingEvent: AuditLogEvent = {
  action: "ping.connection",
  actor: {
    id: "jackson@boxyhq.com",
    name: "Jackson",
  },
  target: {
    name: "tasks",
    type: "Tasks",
  },
};

const ZPingInputSchema = z.object({
  credentialId: z.number(),
});

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { credentialId } = ZPingInputSchema.parse(req.body);

  if (!credentialId) throw new HttpError({ statusCode: 400, message: "Credential ID not provided." });

  const data = await prisma.credential.findUnique({
    where: {
      id: credentialId,
    },
  });

  if (
    !data ||
    !data?.key ||
    !(data.key as Prisma.JsonObject).projectId ||
    !(data.key as Prisma.JsonObject).apiKey ||
    !(data.key as Prisma.JsonObject).endpoint
  )
    throw new HttpError({ statusCode: 400, message: "Invalid credentials." });

  const appCredentials = data.key as { projectId: string; apiKey: string; endpoint: string };

  const auditLogManager = new GenericAuditLogManager({
    projectId: appCredentials.projectId,
    apiKey: appCredentials.apiKey,
    endpoint: appCredentials.endpoint,
  });

  try {
    auditLogManager.reportEvent(pingEvent);

    // if (userInfo.first_name) {
    return res.status(200).end();
    // } else {
    //   return res.status(404).end();
    // }
  } catch (e) {
    return res.status(500).json({ message: e });
  }
}

export default defaultResponder(handler);
