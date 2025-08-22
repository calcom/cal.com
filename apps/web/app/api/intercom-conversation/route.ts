import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const contactFormSchema = z.object({
  message: z.string().min(1, "Message is required"),
  subject: z.string().optional(),
});

const log = logger.getSubLogger({ prefix: [`/api/intercom-conversation`] });

async function postHandler(request: NextRequest) {
  const headersList = await headers();
  const cookiesList = await cookies();
  const legacyReq = buildLegacyRequest(headersList, cookiesList);

  const session = await getServerSession({ req: legacyReq });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
  }

  const intercomApiKey = process.env.INTERCOM_SECRET;
  if (!intercomApiKey) {
    return NextResponse.json({ error: "Intercom API key not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { message, subject } = contactFormSchema.parse(body);

    const response = await fetch("https://api.intercom.io/conversations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${intercomApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from: {
          type: "user",
          email: session.user.email,
          name: session.user.name || session.user.email,
        },
        body: message,
        subject: subject || "Support Request",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      log.error("Intercom API error:", errorData);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    const conversationData = await response.json();
    return NextResponse.json({ success: true, conversation: conversationData });
  } catch (err) {
    log.error(`Error creating Intercom conversation:`, safeStringify(err));
    return NextResponse.json({ error: "Unexpected error occurred" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
