import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";

import { env } from "../env.mjs";
import createBookingIfAvailable from "../tools/createBooking";
import deleteBooking from "../tools/deleteBooking";
import getAvailability from "../tools/getAvailability";
import getBookings from "../tools/getBookings";
import sendBookingEmail from "../tools/sendBookingEmail";
import updateBooking from "../tools/updateBooking";
import type { EventType } from "../types/eventType";
import type { User, UserList } from "../types/user";
import type { WorkingHours } from "../types/workingHours";
import now from "./now";

const gptModel = "gpt-4";

/**
 * Core of the Cal.ai booking agent: a LangChain Agent Executor.
 * Uses a toolchain to book meetings, list available slots, etc.
 * Uses OpenAI functions to better enforce JSON-parsable output from the LLM.
 */
const agent = async (
  input: string,
  user: User,
  users: UserList,
  apiKey: string,
  userId: number,
  agentEmail: string
) => {
  const tools = [
    // getEventTypes(apiKey),
    getAvailability(apiKey),
    getBookings(apiKey, userId),
    createBookingIfAvailable(apiKey, userId, users),
    updateBooking(apiKey, userId),
    deleteBooking(apiKey),
    sendBookingEmail(apiKey, user, users, agentEmail),
  ];

  const model = new ChatOpenAI({
    modelName: gptModel,
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
  });

  /**
   * Initialize the agent executor with arguments.
   */
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentArgs: {
      prefix: `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email.
Make sure your final answers are definitive, complete and well formatted.
Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone.
In responses to users, always summarize necessary context and open the door to follow ups. For example "I have booked your chat with @username for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule."
If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds.

The primary user's id is: ${userId}
The primary user's username is: ${user.username}
The current time in the primary user's timezone is: ${now(user.timeZone)}
The primary user's time zone is: ${user.timeZone}
The primary user's event types are: ${user.eventTypes
        .map((e: EventType) => `ID: ${e.id}, Slug: ${e.slug}, Title: ${e.title}, Length: ${e.length};`)
        .join("\n")}
The primary user's working hours are: ${user.workingHours
        .map(
          (w: WorkingHours) =>
            `Days: ${w.days.join(", ")}, Start Time (minutes in UTC): ${
              w.startTime
            }, End Time (minutes in UTC): ${w.endTime};`
        )
        .join("\n")}
${
  users.length
    ? `The email references the following @usernames and emails: ${users
        .map(
          (u) =>
            `${
              (u.id ? `, id: ${u.id}` : "id: (non user)") +
              (u.username
                ? u.type === "fromUsername"
                  ? `, username: @${u.username}`
                  : ", username: REDACTED"
                : ", (no username)") +
              (u.email
                ? u.type === "fromEmail"
                  ? `, email: ${u.email}`
                  : ", email: REDACTED"
                : ", (no email)")
            };`
        )
        .join("\n")}`
    : ""
}
            `,
    },
    agentType: "openai-functions",
    returnIntermediateSteps: env.NODE_ENV === "development",
    verbose: env.NODE_ENV === "development",
  });

  const result = await executor.call({ input });
  const { output } = result;

  return output;
};

export default agent;
