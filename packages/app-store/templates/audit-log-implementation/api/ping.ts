import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import type { AuditLogEvent } from "@calcom/features/audit-logs/types";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import AuditLogManager from "../lib/AuditLogManager";
import { appKeysSchema } from "../zod";

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

  const data = await prisma.credential.findUnique({
    where: {
      id: credentialId,
    },
  });

  const appKeys = appKeysSchema.parse(data?.key);
  const auditLogManager = new AuditLogManager(appKeys);

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
