import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { NextResponse } from "next/server";

import renderEmail from "@calcom/emails/src/renderEmail";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";

/**
 * This API endpoint is used for development purposes to preview email templates
 */
async function getHandler() {
  // Only allow in development mode
  if (IS_PRODUCTION) {
    return new NextResponse("Only for development purposes", {
      status: 403,
    });
  }

  const t = await getTranslation("en", "common");

  // Render the email template
  const emailHtml = await renderEmail("MonthlyDigestEmail", {
    language: t,
    Created: 12,
    Completed: 13,
    Rescheduled: 14,
    Cancelled: 16,
    mostBookedEvents: [
      {
        eventTypeId: 3,
        eventTypeName: "Test1",
        count: 3,
      },
      {
        eventTypeId: 4,
        eventTypeName: "Test2",
        count: 5,
      },
    ],
    membersWithMostBookings: [
      {
        userId: 4,
        user: {
          id: 4,
          name: "User1 name",
          email: "email.com",
          avatar: "none",
          username: "User1",
        },
        count: 4,
      },
      {
        userId: 6,
        user: {
          id: 6,
          name: "User2 name",
          email: "email2.com",
          avatar: "none",
          username: "User2",
        },
        count: 8,
      },
    ],
    admin: { email: "admin.com", name: "admin" },
    team: { name: "Team1", id: 4 },
  });

  // Create a response with the HTML content
  const response = new NextResponse(emailHtml);

  // Set appropriate headers
  response.headers.set("Content-Type", "text/html");
  response.headers.set("Cache-Control", "no-cache, no-store, private, must-revalidate");

  return response;
}

export const GET = defaultResponderForAppDir(getHandler);
