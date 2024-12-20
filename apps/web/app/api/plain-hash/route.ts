import { createHmac } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";

const responseSchema = z.object({
  hash: z.string(),
  email: z.string().email(),
  fullName: z.string().optional(),
  shortName: z.string(),
});

async function handler(request: Request) {
  const headersList = headers();

  const incomingSignature = headersList.get("plain-request-signature");
  if (incomingSignature) {
    const requestBody = await request.json();
    const expectedSignature = createHmac("sha-256", process.env.PLAIN_HMAC_SECRET_KEY!)
      .update(JSON.stringify(requestBody))
      .digest("hex");

    if (incomingSignature !== expectedSignature) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const session = await getServerSession({ req: request as any });
  if (!session?.user?.email) {
    return new Response("Unauthorized - No session email found", { status: 401 });
  }

  // Environment variable check
  const secret = process.env.PLAIN_CHAT_HMAC_SECRET_KEY;
  if (!secret) {
    return new Response("Missing Plain Chat secret", { status: 500 });
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(session.user.email.toLowerCase().trim());
  const hash = hmac.digest("hex");

  const shortName =
    (session.user.name?.split(" ")[0] || session.user.email).charAt(0).toUpperCase() +
    (session.user.name?.split(" ")[0] || session.user.email).slice(1);

  const response = responseSchema.parse({
    hash,
    email: session.user.email,
    fullName: session.user.name,
    shortName,
  });

  console.log("Sending response:", response);

  return NextResponse.json(response);
}

export const POST = apiRouteMiddleware(handler);
