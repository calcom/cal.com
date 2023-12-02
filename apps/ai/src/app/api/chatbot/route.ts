import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyParseKey } from "../../../utils/verifyParseKey";

// TODO(lydia) uncomment this with rooter method
// import sendEmail from "../../../utils/rooter";

export const POST = async (request: NextRequest) => {
  const verified = verifyParseKey(request.url);

  if (!verified) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const json = await request.json();

  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const envelope = JSON.parse(body.envelope as string);

  const question = envelope.text;
  // TODO(lydia): I've included the user, paving the way to implement this as
  //  a context-based chatbot. This will enhance the coherence of responses.
  // const userId = envelope.id;

  try {
    // TODO(lydia) uncomment this with rooter method
    // const response = await rooter(question);
    const response = "sample answer";

    // Send response to user
    return new NextResponse(response);
  } catch (error) {
    return new NextResponse(
      (error as Error).message || "Something went wrong. Please try again or reach out for help.",
      { status: 500 }
    );
  }
};
