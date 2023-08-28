import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import agent from "../../../utils/agent";
import sendEmail from "../../../utils/sendEmail";

/**
 * Launches a LangChain agent to process an incoming email,
 * then sends the response to the user.
 */
export const POST = async (request: NextRequest) => {
  const json = await request.json();

  const { message, subject, user } = json;

  if ((!message && !subject) || !user) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  try {
    const response = await agent(`${subject}\n\n${message}`, user);

    await sendEmail({
      html: response,
      subject: `Re: ${subject}`,
      text: response,
      to: user.email,
    });

    return new NextResponse("ok");
  } catch (error) {
    return new NextResponse(
      error.message || "Something went wrong. Please try again or reach out for help.",
      { status: 500 }
    );
  }
};
