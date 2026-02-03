import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import getRawBody from "raw-body";
import z from "zod";

import { emailSchema } from "@calcom/lib/emailSchema";
import { default as webPrisma } from "@calcom/prisma";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const helpscoutRequestBodySchema = z.object({
  customer: z.object({
    email: emailSchema,
  }),
});

/**
 * API for Helpscout to retrieve key information about a user from a ticket
 * Note: HelpScout expects a JSON with a `html` prop to show its content as HTML
 */
async function postHandler(request: NextRequest) {
  const hsSignature = request.headers.get("x-helpscout-signature");
  if (!hsSignature) return NextResponse.json({ message: "Missing signature" }, { status: 400 });

  if (!process.env.CALENDSO_ENCRYPTION_KEY)
    return NextResponse.json({ message: "Missing encryption key" }, { status: 500 });

  const legacyRequest = buildLegacyRequest(await headers(), await cookies());

  // Get the raw request body
  const rawBody = await getRawBody(legacyRequest);

  try {
    const parsedBody = helpscoutRequestBodySchema.safeParse(JSON.parse(rawBody.toString()));
    if (!parsedBody.success) return NextResponse.json({ message: "Invalid request body" }, { status: 400 });

    // Verify the signature
    const calculatedSig = createHmac("sha1", process.env.CALENDSO_ENCRYPTION_KEY)
      .update(rawBody)
      .digest("base64");

    if (hsSignature !== calculatedSig)
      return NextResponse.json({ message: "Invalid signature" }, { status: 400 });

    const user = await webPrisma.user.findFirst({
      where: {
        email: parsedBody.data.customer.email,
      },
      select: {
        username: true,
        id: true,
        createdDate: true,
      },
    });

    if (!user) return NextResponse.json({ html: "User not found" });

    const lastBooking = await webPrisma.attendee.findFirst({
      where: {
        email: parsedBody.data.customer.email,
      },
      select: {
        booking: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        booking: {
          createdAt: "desc",
        },
      },
    });

    return NextResponse.json({
      html: `
        <ul>
          <li><b>Username:</b>&nbsp;${user.username}</li>
          <li><b>Last booking:</b>&nbsp;${
            lastBooking && lastBooking.booking
              ? new Date(lastBooking.booking.createdAt).toLocaleDateString("en-US")
              : "No info"
          }</li>
          <li><b>Account created:</b>&nbsp;${new Date(user.createdDate).toLocaleDateString("en-US")}</li>
        </ul>
      `,
    });
  } catch (error) {
    console.error("Error processing HelpScout request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export const POST = defaultResponderForAppDir(postHandler);
