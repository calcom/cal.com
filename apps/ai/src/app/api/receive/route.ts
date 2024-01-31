import type { ParsedMail, Source } from "mailparser";
import { simpleParser } from "mailparser";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import prisma from "@calcom/prisma";

import { env } from "../../../env.mjs";
import { fetchAvailability } from "../../../tools/getAvailability";
import { fetchEventTypes } from "../../../tools/getEventTypes";
import { extractUsers } from "../../../utils/extractUsers";
import getHostFromHeaders from "../../../utils/host";
import now from "../../../utils/now";
import sendEmail from "../../../utils/sendEmail";
import { verifyParseKey } from "../../../utils/verifyParseKey";

// Allow receive loop to run for up to 30 seconds
// Why so long? the rate determining API call (getAvailability, getEventTypes) can take up to 15 seconds at peak times so we give it a little extra time to complete.
export const maxDuration = 30;

/**
 * Verifies email signature and app authorization,
 * then hands off to booking agent.
 */
export const POST = async (request: NextRequest) => {
  const verified = verifyParseKey(request.url);

  if (!verified) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const envelope = JSON.parse(body.envelope as string);

  const aiEmail = envelope.to[0];
  const subject = body.subject || "";

  try {
    await checkRateLimitAndThrowError({
      identifier: `ai:email:${envelope.from}`,
      rateLimitingType: "ai",
    });
  } catch (error) {
    await sendEmail({
      subject: `Re: ${subject}`,
      text: "Thanks for using Cal.ai! You've reached your daily limit. Please try again tomorrow.",
      to: envelope.from,
      from: aiEmail,
    });

    return new NextResponse("Exceeded rate limit", { status: 200 }); // Don't return 429 to avoid triggering retry logic in SendGrid
  }

  // Parse email from mixed MIME type
  const parsed: ParsedMail = await simpleParser(body.email as Source);

  if (!parsed.text && !parsed.subject) {
    await sendEmail({
      subject: `Re: ${subject}`,
      text: "Thanks for using Cal.ai! It looks like you forgot to include a message. Please try again.",
      to: envelope.from,
      from: aiEmail,
    });
    return new NextResponse("Email missing text and subject", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    select: {
      email: true,
      id: true,
      username: true,
      timeZone: true,
      credentials: {
        select: {
          appId: true,
          key: true,
        },
      },
    },
    where: { email: envelope.from },
  });

  // body.dkim looks like {@domain-com.22222222.gappssmtp.com : pass}
  const signature = (body.dkim as string).includes(" : pass");

  // User is not a cal.com user or is using an unverified email.
  if (!signature || !user) {
    await sendEmail({
      html: `Thanks for your interest in Cal.ai! To get started, Make sure you have a <a href="https://cal.com/signup" target="_blank">cal.com</a> account with this email address and then install Cal.ai here: <a href="https://go.cal.com/ai" target="_blank">go.cal.com/ai</a>.`,
      subject: `Re: ${subject}`,
      text: `Thanks for your interest in Cal.ai! To get started, Make sure you have a cal.com account with this email address. You can sign up for an account at: https://cal.com/signup`,
      to: envelope.from,
      from: aiEmail,
    });

    return new NextResponse("ok");
  }

  const credential = user.credentials.find((c) => c.appId === env.APP_ID)?.key;

  // User has not installed the app from the app store. Direct them to install it.
  if (!(credential as { apiKey: string })?.apiKey) {
    const url = env.APP_URL;

    await sendEmail({
      html: `Thanks for using Cal.ai! To get started, the app must be installed. <a href=${url} target="_blank">Click this link</a> to install it.`,
      subject: `Re: ${subject}`,
      text: `Thanks for using Cal.ai! To get started, the app must be installed. Click this link to install the Cal.ai app: ${url}`,
      to: envelope.from,
      from: aiEmail,
    });

    return new NextResponse("ok");
  }

  const { apiKey } = credential as { apiKey: string };

  // Pre-fetch data relevant to most bookings.
  const [eventTypes, availability, users] = await Promise.all([
    fetchEventTypes({
      apiKey,
    }),
    fetchAvailability({
      apiKey,
      userId: user.id,
      dateFrom: now(user.timeZone),
      dateTo: now(user.timeZone),
    }),
    extractUsers(`${parsed.text} ${parsed.subject}`),
  ]);

  if ("error" in availability) {
    await sendEmail({
      subject: `Re: ${subject}`,
      text: "Sorry, there was an error fetching your availability. Please try again.",
      to: user.email,
      from: aiEmail,
    });
    console.error(availability.error);
    return new NextResponse("Error fetching availability. Please try again.", { status: 400 });
  }

  if ("error" in eventTypes) {
    await sendEmail({
      subject: `Re: ${subject}`,
      text: "Sorry, there was an error fetching your event types. Please try again.",
      to: user.email,
      from: aiEmail,
    });
    console.error(eventTypes.error);
    return new NextResponse("Error fetching event types. Please try again.", { status: 400 });
  }

  const { workingHours } = availability;

  const appHost = getHostFromHeaders(request.headers);

  // Hand off to long-running agent endpoint to handle the email. (don't await)
  fetch(`${appHost}/api/agent?parseKey=${env.PARSE_KEY}`, {
    body: JSON.stringify({
      apiKey,
      userId: user.id,
      message: parsed.text || "",
      subject: parsed.subject || "",
      replyTo: aiEmail,
      user: {
        email: user.email,
        eventTypes,
        username: user.username,
        timeZone: user.timeZone,
        workingHours,
      },
      users,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  await new Promise((r) => setTimeout(r, 1000));

  return new NextResponse("ok");
};
