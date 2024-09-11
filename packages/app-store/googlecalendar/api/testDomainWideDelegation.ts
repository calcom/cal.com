import fs from "fs";
import { JWT } from "google-auth-library";
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";

import { defaultHandler, defaultResponder } from "@calcom/lib/server";

const calendar = google.calendar("v3");
const scopes = ["https://www.googleapis.com/auth/calendar"];

function getKey() {
  const keyPath = path.join(
    process.cwd(),
    "../../packages/app-store/googlecalendar/api/service-account-key.json"
  );
  console.log("keyPath", keyPath);
  return JSON.parse(fs.readFileSync(keyPath, "utf8"));
}

async function createCalendarEvent({ userToImpersonate }: { userToImpersonate: string }) {
  try {
    const key = getKey();

    const authClient = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: scopes,
      subject: userToImpersonate,
    });

    await authClient.authorize();

    const event = {
      summary: "Test Meeting - Domain-Wide Delegation",
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
  const userToImpersonate = req.query.userToImpersonate as string | undefined;
  if (!userToImpersonate) {
    return res.status(400).json({ error: "userToImpersonate query parameter is required" });
  }
  const link = await createCalendarEvent({ userToImpersonate });
  return res.json({ link });
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
