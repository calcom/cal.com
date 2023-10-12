import type { NextRequest } from "next/server";

import prisma from "@calcom/prisma";

import { env } from "../../../env.mjs";
import sendEmail from "../../../utils/sendEmail";

export const POST = async (request: NextRequest) => {
  console.log("ONBOARD HIT");
  const verified = request.headers.get("Authorization") === `Bearer ${env.CALAI_API_KEY}`;
  if (!verified) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { userId } = await request.json();

  const user = await prisma.user.findUnique({
    select: {
      email: true,
      username: true,
    },
    where: {
      id: userId,
    },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  await sendEmail({
    subject: "Welcome to Cal.ai",
    to: user.email,
    from: `${user.username}@${env.SENDER_DOMAIN}`,
    text: `Hi ${user.username},\n\nWelcome to Cal.ai! We're excited to have you on board.\n\nBest,\nCal.ai`,
    html: `Hi ${user.username},<br><br>Welcome to Cal.ai! We're excited to have you on board.<br><br>Best,<br>Cal.ai`,
  });

  return new Response("OK", { status: 200 });
};
