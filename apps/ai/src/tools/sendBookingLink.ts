import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import type { User, UserList } from "~/src/types/user";
import sendEmail from "~/src/utils/sendEmail";

export const sendBookingLink = async ({
  apiKey,
  user,
  users,
  subject,
  to,
  message,
  eventTypeSlug,
}: {
  apiKey: string;
  user: User;
  users: UserList;
  subject: string;
  to: number[];
  message: string;
  eventTypeSlug: string;
}) => {
  const url = `https://cal.com/${user.username}/${eventTypeSlug}?date=2024-09-19&month=2024-09`;

  const toEmails = to.map((userId) => users[userId]?.email || "");

  if (!toEmails.length) {
    return {
      error: "No emails found",
    };
  }

  await sendEmail({
    subject,
    to: toEmails,
    cc: user.email,
    from: "",
    text: message + "\n\n" + url,
  });

  return "Booking link sent";
};

const sendBookingLinkTool = (apiKey: string, user: User, users: UserList) => {
  return new DynamicStructuredTool({
    description: "Send a booking link",
    func: async ({ message, subject, to, eventTypeSlug }) => {
      return JSON.stringify(
        await sendBookingLink({
          apiKey,
          user,
          users,
          subject,
          to,
          message,
          eventTypeSlug,
        })
      );
    },
    name: "sendBookingLink",

    schema: z.object({
      message: z.string(),
      subject: z.string(),
      to: z
        .array(z.number())
        .describe("array of userIds to send the booking link to. Primary user is automatically CC'd"),
      eventTypeSlug: z.string().describe("the slug of the event type to book"),
    }),
  });
};

export default sendBookingLinkTool;
