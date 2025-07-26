import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

import { AuditLogService } from "~/lib/audit-log.service";
import type { AuditLogEvent } from "~/lib/types";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body as Partial<AuditLogEvent>;
  if (!body || typeof body !== "object") {
    throw new HttpError({
      statusCode: 400,
      message: "Invalid/Missing JSON body",
    });
  }

  // Required audit event fields
  const requiredFields = ["timestamp", "userId", "orgId", "action", "resource", "details"];
  for (const field of requiredFields) {
    if (!body[field as keyof AuditLogEvent]) {
      throw new HttpError({
        statusCode: 400,
        message: `Missing required field: ${field}`,
      });
    }
  }

  try {
    await AuditLogService.logEvent(body as AuditLogEvent);
    return res.status(201).json({ ok: true });
  } catch (error: unknown) {
    throw error;
  }
}

export default defaultResponder(handler);
