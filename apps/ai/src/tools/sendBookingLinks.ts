import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "~/src/env.mjs";
import type { User, UserList } from "~/src/types/user";
import sendEmail from "~/src/utils/sendEmail";

export const sendBookingLinks = async ({
  user,
  agentEmail,
  subject,
  to,
  message,
  eventTypeSlug,
  dates,
}: {
  apiKey: string;
  user: User;
  users: UserList;
  agentEmail: string;
  subject: string;
  to: string[];
  message: string;
  eventTypeSlug: string;
  dates: { date: string; text: string }[];
}) => {
  // const url = `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?date=${date}`;
  const urls = dates.map(({ date, text }) => ({
    url: `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?date=${date}`,
    text,
  }));

  await sendEmail({
    subject,
    to,
    cc: user.email,
    from: agentEmail,
    text: message
      .split("[[[Booking Links]]]")
      .join(urls.map(({ url, text }) => `${text}: ${url}`).join("\n")),
    html: message
      .split("\n")
      .join("<br>")
      .split("[[[Booking Links]]]")
      .join(urls.map(({ url, text }) => `<a href="${url}">${text}</a>`).join(", ")),
  });

  return "Booking link sent";
};

const sendBookingLinksTool = (apiKey: string, user: User, users: UserList, agentEmail: string) => {
  return new DynamicStructuredTool({
    description: "Send a booking link via email. Useful for scheduling with non cal users.",
    func: async ({ message, subject, to, eventTypeSlug, dates }) => {
      return JSON.stringify(
        await sendBookingLinks({
          apiKey,
          user,
          users,
          agentEmail,
          subject,
          to,
          message,
          eventTypeSlug,
          dates,
        })
      );
    },
    name: "sendBookingLinks",

    schema: z.object({
      message: z
        .string()
        .describe(
          "Make sure to nicely format the message and introduce yourself as the primary user's booking assistant. Make sure to include a spot for the links using: [[[Booking Links]]]"
        ),
      subject: z.string(),
      to: z
        .array(z.string())
        .describe("array of emails to send the booking link to. Primary user is automatically CC'd"),
      eventTypeSlug: z.string().describe("the slug of the event type to book"),
      dates: z
        .array(
          z.object({
            date: z.string().describe("the date and time (yyyy-mm-ddThh:mm) to suggest for the booking"),
            text: z
              .string()
              .describe("Simple text to display for the start time such as 4:30pm or Saturday at 4:30pm"),
          })
        )
        .describe(
          "array of dates to suggest for the booking. No more than 3 options unless otherwise specified"
        ),
    }),
  });
};

export default sendBookingLinksTool;
