import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

const scopes = ["https://www.googleapis.com/auth/calendar"];

async function createCalendarEvent({ userToImpersonate }: { userToImpersonate: string }) {
  const calendar = google.calendar("v3");
  try {
    const auth = new GoogleAuth({
      scopes,
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      projectId: process.env.GCP_PROJECT_ID,
      clientOptions: {
        subject: userToImpersonate,
      },
    });

    const authClient = await auth.getClient();

    const event = {
      summary: "Test Meeting - Workload Identity Federation",
      description: "Discuss project updates and plans.",
      start: {
        dateTime: new Date().toISOString(),
        timeZone: "America/Los_Angeles",
      },
      end: {
        dateTime: new Date(new Date().getTime() + 1 * 60 * 60 * 1000).toISOString(),
        timeZone: "America/Los_Angeles",
      },
      attendees: [{ email: "attendee1@domain.com" }, { email: "attendee2@domain.com" }],
    };

    const response = await calendar.events.insert({
      auth: authClient,
      calendarId: "primary",
      requestBody: event,
    });
    console.log(`Event created: ${response.data.htmlLink}`);
    return response.data.htmlLink;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw error;
  }
}

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const userToImpersonate = req.query.userToImpersonate as string;
  const link = await createCalendarEvent({ userToImpersonate });
  return res.json({ link });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
