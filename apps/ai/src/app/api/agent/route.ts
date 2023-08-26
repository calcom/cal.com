import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import agent from "../../../utils/agent";
import sendEmail from "../../../utils/sendEmail";

export const POST = async (request: NextRequest) => {
  const json = await request.json();

  const message = await agent(`${json.subject}\n\n${json.message}`, json.user);

  await sendEmail({
    html: message,
    subject: `Re: ${json.subject}`,
    text: message,
    to: json.user.email,
  });

  return new NextResponse("ok");
};
