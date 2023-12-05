import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import agent from "../../../utils/agent";
import sendEmail from "../../../utils/sendEmail";

// Allow agent loop to run for up to 5 minutes
export const maxDuration = 300;

/**
 * Launches a LangChain agent to process an incoming email,
 * then sends the response to the user.
 */
export const POST = async (request: NextRequest) => {
  //TODO: auth
  // const verified = verifyParseKey(request.url);

  // if (!verified) {
  //   return new NextResponse("Unauthorized", { status: 401 });
  // }

  const json = await request.json();

  //TODO: destructure every arg
  const { apiKey, userId, message, subject, user, users, replyTo: agentEmail } = json;
  // const { message, subject, user } = json;

  if ((!message && !subject) || !user) {
    return new NextResponse("Missing fields", { status: 400 });
  }
  console.log("---------------INITIAL API CALL---------------");
  console.log("API KEY: ", apiKey);
  console.log("USER ID: ", userId);
  console.log("AGENT E-MAIL: ", agentEmail);
  console.log("USER OBJECT: ", user);
  try {
    const response = await agent(`${message}`, { ...user }, users, apiKey, userId, agentEmail);
    // const response = await agent(`${message}`);
    //TODO: send mail
    //Send response to user
    await sendEmail({
      subject: `Re: ${subject}`,
      text: response.replace(/(?:\r\n|\r|\n)/g, "\n"),
      to: user.email,
      from: agentEmail,
    });

    return new NextResponse(response);
  } catch (error) {
    return new NextResponse(error as BodyInit);
    //TODO: send mail
    await sendEmail({
      subject: `Re: ${subject}`,
      text: "Thanks for using Cal.ai! We're experiencing high demand and can't currently process your request. Please try again later.",
      to: user.email,
      from: agentEmail,
    });
    return new NextResponse(
      (error as Error).message || "Something went wrong. Please try again or reach out for help.",
      { status: 500 }
    );
  }
};
