import type { ParsedMail } from "mailparser";
import { simpleParser } from "mailparser";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import prisma from "@calcom/prisma";

import { env } from "../../../env.mjs";
import { fetchAvailability } from "../../../tools/getAvailability";
import { fetchEventTypes } from "../../../tools/getEventTypes";
import { encrypt } from "../../../utils/encryption";
import host from "../../../utils/host";
import now from "../../../utils/now";
import sendEmail from "../../../utils/sendEmail";

export const POST = async (request: NextRequest) => {
  const formData: any = await request.formData();
  const body = Object.fromEntries(formData);

  const signature = body.dkim;

  const envelope = JSON.parse(body.envelope);

  const parsed: ParsedMail = await simpleParser(body.email);

  if (!(parsed.text || parsed.subject)) return new NextResponse();

  const user = await prisma.user.findUnique({
    include: { credentials: true },
    where: { email: envelope.from },
  });

  if (!user?.credentials.find((c) => c.appId === env.APP_ID)?.key) {
    const url = env.APP_URL;

    await sendEmail({
      html: `thanks for using CAL AI. <a href=${url} target="_blank">Click this link</a> to install the app.`,
      subject: `Re: ${body.subject}`,
      text: `thanks for using CAL AI. Click this link to install the Cal AI app: ${url}`,
      to: envelope.from,
    });
    return new NextResponse();
  }

  const { hash: apiKeyHashed, initVector: apiKeyIV } = encrypt(env.CAL_API_KEY);

  if (!signature || !user.email || !user.id) {
    await sendEmail({
      subject: `Re: ${body.subject}`,
      text: "Sorry, you are not authorized to use this service.",
      to: user.email || "",
    });
    return new NextResponse();
  }

  const [eventTypes, availability] = await Promise.all([
    fetchEventTypes({
      apiKeyHashed,
      apiKeyIV,
      userId: user.id.toString(),
    }),
    fetchAvailability({
      apiKeyHashed,
      apiKeyIV,
      dateFrom: now,
      dateTo: now,
      userId: user.id.toString(),
    }),
  ]);

  const { timeZone, workingHours } = availability;

  fetch(host(request.headers) + "/api/agent", {
    body: JSON.stringify({
      message: parsed.text,
      subject: parsed.subject,
      user: {
        id: user.id.toString(),
        email: user.email,
        apiKeyHashed,
        apiKeyIV,
        eventTypes,
        timeZone,
        workingHours,
      },
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  await new Promise((r) => setTimeout(r, 1000));

  return new NextResponse("ok");
};
