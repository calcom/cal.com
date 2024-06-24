import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { CRUD } from "@calcom/features/audit-logs/types";
import type { AuditLogEvent } from "@calcom/features/audit-logs/types";
import { defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import AuditLogManager from "../lib/AuditLogManager";
import { appKeysSchema } from "../zod";

const pingEvent: AuditLogEvent = {
  action: "SYSTEM.PING",
  actor: {
    id: -1,
    name: "App interface",
  },
  target: {
    id: -1,
    name: "connection",
    type: "SYSTEM",
  },
  group: {
    id: "dev",
    name: "dev",
  },
  crud: CRUD.CREATE,
  source_ip: "127.0.0.0",
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
    return res.status(200).end();
  } catch (e) {
    return res.status(500).json({ message: e });
  }
}

export default defaultResponder(handler);
