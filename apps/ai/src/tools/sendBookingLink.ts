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

  await sendEmail({
    subject,
    to,
    cc: user.email,
    from: agentEmail,
    text: message.split("[[[Booking Link]]]").join(url),
    html: message
      .split("\n")
      .join("<br>")
      .split("[[[Booking Link]]]")
      .join(`<a href="${url}">Booking Link</a>`),
  });

  return "Booking link sent";
};

const sendBookingLinkTool = (apiKey: string, user: User, users: UserList, agentEmail: string) => {
  return new DynamicStructuredTool({
    description: "Send a booking link via email. Useful for scheduling with non cal users.",
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
      message: z
        .string()
        .describe(
          "Make sure to nicely format the message and introduce yourself as the primary user's booking assistant. Make sure to include a spot for the link using: [[[Booking Link]]]"
        ),
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
