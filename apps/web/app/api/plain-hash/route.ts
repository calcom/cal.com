import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { apiRouteMiddleware } from "@calcom/lib/server/apiRouteMiddleware";

const responseSchema = z.object({
  hash: z.string(),
  email: z.string().email(),
  shortName: z.string(),
  appId: z.string(),
  fullName: z.string(),
  chatAvatarUrl: z.string(),
});

async function handler(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getServerSession({ req: request as any });
  if (!session?.user?.email) {
    return new Response("Unauthorized - No session email found", { status: 401 });
  }

  const secret = process.env.PLAIN_CHAT_HMAC_SECRET_KEY;
  if (!secret) {
    return new Response("Missing Plain Chat secret", { status: 500 });
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(session.user.email.toLowerCase().trim());
  const hash = hmac.digest("hex");

  const shortName =
    (session.user.name?.split(" ")[0] || session.user.email).charAt(0).toUpperCase() +
      (session.user.name?.split(" ")[0] || session.user.email).slice(1) || "User";

  const response = responseSchema.parse({
    hash,
    email: session.user.email || "user@example.com",
    shortName,
    appId: process.env.PLAIN_CHAT_ID,
    fullName: session.user.name || "User",
    chatAvatarUrl: session.user.avatarUrl || "",
  });

  return NextResponse.json(response);
}

export const POST = apiRouteMiddleware(handler);
