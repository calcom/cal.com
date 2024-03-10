import { NextResponse } from "next/server";

import { env } from "../../../env.mjs";
import agent from "../../../utils/agent";

// Allow agent loop to run for up to 5 minutes
export const maxDuration = 300;

/**
 * Launches a LangChain agent to process an incoming email,
 * then sends the response to the user.
 */
export const POST = async () => {
  console.log(env);
  if (env.NODE_ENV !== "development") {
    throw new Error("Endpoint only valid in test mode.");
  }
  const response = await agent(
    `Meet at 4pm PST?\n\nHey jim@jim.com, Let's meet at 4pm PST tomorrow.\n- Jacob`,
    { username: "jacob", timeZone: "PST", id: 1, workingHours: [], email: "jacob@test.com", eventTypes: [] },
    [],
    "TESTING",
    1,
    `agent@test.com`,
    "groq"
  );
  return NextResponse.json(response);
};
