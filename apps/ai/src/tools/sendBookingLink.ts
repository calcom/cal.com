import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "~/src/env.mjs";
import type { User, UserList } from "~/src/types/user";
import sendEmail from "~/src/utils/sendEmail";

export const sendBookingLink = async ({
  user,
  agentEmail,
  subject,
  to,
  message,
  eventTypeSlug,
  date,
}: {
  apiKey: string;
  user: User;
  users: UserList;
  agentEmail: string;
  subject: string;
  to: string[];
  message: string;
  eventTypeSlug: string;
  date: string;
}) => {
  const url = `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?date=${date}`;

  // const toEmails = to.map((userId) => users[userId]?.email || "");

  // if (!toEmails.length) {
  //   return {
  //     error: "No emails found",
  //   };
  // }

  await sendEmail({
    subject,
    // to: toEmails,
    to,
    cc: user.email,
    from: agentEmail,
    text: message + "\n" + url,
    html: message + "<br>" + '<a href="' + url + '">Click here to book a meeting</a>',
  });

  return "Booking link sent";
};

const sendBookingLinkTool = (apiKey: string, user: User, users: UserList, agentEmail: string) => {
  return new DynamicStructuredTool({
    description: "Send a booking link via email. Useful for scheduling with non cal users to meetings.",
    func: async ({ message, subject, to, eventTypeSlug, date }) => {
      return JSON.stringify(
        await sendBookingLink({
          apiKey,
          user,
          users,
          agentEmail,
          subject,
          to,
          message,
          eventTypeSlug,
          date,
        })
      );
    },
    name: "sendBookingLink",

    schema: z.object({
      message: z.string(),
      subject: z.string(),
      to: z
        .array(z.string())
        .describe("array of emails to send the booking link to. Primary user is automatically CC'd"),
      eventTypeSlug: z.string().describe("the slug of the event type to book"),
      date: z.string().describe("the date (yyyy-mm-dd) to suggest for the booking"),
    }),
  });
};

export default sendBookingLinkTool;
