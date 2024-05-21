import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import GenericAuditLogManager from "../lib/AuditLogManager";
import { appKeysSchema } from "../zod";

const pingEvent = {
  action: "ping.connection",
  teamId: "boxyhq",
  group: {
    id: "dev",
    name: "dev",
  },
  crud: "c" as const,
  created: new Date(),
  source_ip: "127.0.0.1",
  actor: {
    id: "jackson@boxyhq.com",
    name: "Jackson",
  },
  target: {
    id: "100",
    name: "tasks",
    type: "Tasks",
  },
};

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, apiKey, endpoint } = appKeysSchema.parse(req.body);

  if (!projectId || !apiKey || !endpoint)
    throw new HttpError({ statusCode: 400, message: "App keys not provided." });

  const auditLogManager = new GenericAuditLogManager({ projectId, apiKey, endpoint });

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
