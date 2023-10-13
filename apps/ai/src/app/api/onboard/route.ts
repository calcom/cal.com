import type { NextRequest } from "next/server";

import prisma from "@calcom/prisma";

import { env } from "../../../env.mjs";
import sendEmail from "../../../utils/sendEmail";

export const POST = async (request: NextRequest) => {
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
    subject: "Welcome to Cal AI",
    to: user.email,
    from: `${user.username}@${env.SENDER_DOMAIN}`,
    text: `Hi ${user.username},\n\nI'm Cal AI, your personal booking assistant.\n\nI'll be here, 24/7 to help manage your busy schedule and find times to meet with the people you care about.\nHere are some things you can ask me:\n\n- "Book a meeting with @someone" (The @ symbol lets you tag Cal.com users)\n- "What meetings do I have today?" (I'll show you your schedule)\n- "Find a time to meet with someone@gmail.com" (I'll intro and send them some good times).\n\nI'm still learning, so if you have any feedback, please tweet it to @calcom!\n\nRemember, you can always reach me here, at ${user.username}@${env.SENDER_DOMAIN}. Looking forward to working together,\n- Cal AI, Your personal booking assistant`,
    html: `Hi ${user.username},<br><br>I'm Cal AI, your personal booking assistant.<br><br>I'll be here, 24/7 to help manage your busy schedule and find times to meet with the people you care about.<br>Here are some things you can ask me:<br><br>- "Book a meeting with @someone" (The @ symbol lets you tag Cal.com users)<br>- "What meetings do I have today?" (I'll show you your schedule)<br>- "Find a time to meet with someone@gmail.com" (I'll intro and send them some good times).<br><br>I'm still learning, so if you have any feedback, please tweet it to @calcom!<br><br>Remember, you can always reach me here, at ${user.username}@${env.SENDER_DOMAIN}. Looking forward to working together,<br>- Cal AI, Your personal booking assistant`,
  });
  return new Response("OK", { status: 200 });
};
