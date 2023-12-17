import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

import { env } from "~/src/env.mjs";
import type { User, UserList } from "~/src/types/user";
import sendEmail from "~/src/utils/sendEmail";

export const sendBookingEmail = async ({
  user,
  agentEmail,
  subject,
  to,
  message,
  eventTypeSlug,
  slots,
  date,
}: {
  apiKey: string;
  user: User;
  users: UserList;
  agentEmail: string;
  subject: string;
  to: string;
  message: string;
  eventTypeSlug: string;
  slots?: {
    time: string;
    text: string;
  }[];
  date: {
    date: string;
    text: string;
  };
}) => {
  // const url = `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?date=${date}`;
  const timeUrls = slots?.map(({ time, text }) => {
    return {
      url: `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?slot=${time}`,
      text,
    };
  });

  const dateUrl = {
    url: `${env.FRONTEND_URL}/${user.username}/${eventTypeSlug}?date=${date.date}`,
    text: date.text,
  };

  await sendEmail({
    subject,
    to,
    cc: user.email,
    from: agentEmail,
    text: message
      .split("[[[Slots]]]")
      .join(timeUrls?.map(({ url, text }) => `${text}: ${url}`).join("\n"))
      .split("[[[Link]]]")
      .join(`${dateUrl.text}: ${dateUrl.url}`),
    html: message
      .split("\n")
      .join("<br>")
      .split("[[[Slots]]]")
      .join(timeUrls?.map(({ url, text }) => `<a href="${url}">${text}</a>`).join("<br>"))
      .split("[[[Link]]]")
      .join(`<a href="${dateUrl.url}">${dateUrl.text}</a>`),
  });

  return "Booking link sent";
};

const sendBookingEmailTool = (apiKey: string, user: User, users: UserList, agentEmail: string) => {
  return new DynamicStructuredTool({
    description:
      "Send a booking link via email. Useful for scheduling with non cal users. Be confident, suggesting a good date/time with a fallback to a link to select a date/time.",
    func: async ({ message, subject, to, eventTypeSlug, slots, date }) => {
      return JSON.stringify(
        await sendBookingEmail({
          apiKey,
          user,
          users,
          agentEmail,
          subject,
          to,
          message,
          eventTypeSlug,
          slots,
          date,
        })
      );
    },
    name: "sendBookingEmail",

    schema: z.object({
      message: z
        .string()
        .describe(
          "A polite and professional email with an intro and signature at the end. Specify you are the AI booking assistant of the primary user. Use [[[Slots]]] and a fallback [[[Link]]] to inject good times and 'see all times' into messages"
        ),
      subject: z.string(),
      to: z
        .string()
        .describe("email address to send the booking link to. Primary user is automatically CC'd"),
      eventTypeSlug: z.string().describe("the slug of the event type to book"),
      slots: z
        .array(
          z.object({
            time: z.string().describe("YYYY-MM-DDTHH:mm in UTC"),
            text: z.string().describe("minimum readable label. Ex. 4pm."),
          })
        )
        .optional()
        .describe("Time slots the external user can click"),
      date: z
        .object({
          date: z.string().describe("YYYY-MM-DD"),
          text: z.string().describe('"See all times" or similar'),
        })
        .describe(
          "A booking link that allows the external user to select a date / time. Should be a fallback to time slots"
        ),
    }),
  });
};

export default sendBookingEmailTool;
