import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { AuditLogService } from "~/lib/audit-log.service";
import type { AuditLogEvent } from "~/lib/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { orgId, userId, action } = req.query;

  const filter: Record<string, string | undefined> = {
    orgId: typeof orgId === "string" ? orgId : undefined,
    userId: typeof userId === "string" ? userId : undefined,
    action: typeof action === "string" ? action : undefined,
  };

  try {
    const events: AuditLogEvent[] = await AuditLogService.getEvents?.(filter);
    return res.status(200).json({ events });
  } catch (error) {
    throw new HttpError({
      statusCode: 500,
      message: "Failed to fetch audit logs",
    });
  }
}

export default defaultResponder(handler);
