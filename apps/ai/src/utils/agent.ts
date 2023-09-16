import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";

import { env } from "../env.mjs";
import createBookingIfAvailable from "../tools/createBookingIfAvailable";
import deleteBooking from "../tools/deleteBooking";
import getAvailability from "../tools/getAvailability";
import getBookings from "../tools/getBookings";
import updateBooking from "../tools/updateBooking";
import type { EventType } from "../types/eventType";
import type { User, UserList } from "../types/user";
import type { WorkingHours } from "../types/workingHours";
import now from "./now";

const gptModel = "gpt-4";

/**
 * Core of the Cal AI booking agent: a LangChain Agent Executor.
 * Uses a toolchain to book meetings, list available slots, etc.
 * Uses OpenAI functions to better enforce JSON-parsable output from the LLM.
 */
const agent = async (input: string, user: User, users: UserList, apiKey: string, userId: number) => {
  const tools = [
    // getEventTypes(apiKey),
    getAvailability(apiKey, userId),
    getBookings(apiKey, userId),
    createBookingIfAvailable(apiKey, userId),
    updateBooking(apiKey, userId),
    deleteBooking(apiKey),
  ];

  const model = new ChatOpenAI({
    modelName: gptModel,
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
  });

  console.log(
    users,
    `${
      users.length
        ? `The user referenced the following users: ${users
            .map(
              (u) =>
                `id: ${u.id}` +
                (u.email ? `, email: ${u.email}` : "") +
                (u.username ? `, username: ${u.username}` : "")
            )
            .join("\n")}`
        : ""
    }`
  );

  /**
   * Initialize the agent executor with arguments.
   */
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentArgs: {
      prefix: `You are Cal AI - a bleeding edge scheduling assistant that interfaces via email.
            Make sure your final answers are definitive, complete and well formatted.
            Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
            Tools will always handle times in UTC, but times sent to the user should be formatted per that user's timezone.

            Bookings should be created at a good time for all parties.

            IMPORTANT: Always create bookings on the primary user's calender and invite external users as responses.

            The primary user's id is: ${userId}
            The primary user's email is: ${user.email}
            The primary user's username is: ${user.username}
            The current time in the primary user's timezone is: ${now(user.timeZone)}
            The primary user's time zone is: ${user.timeZone}
            The primary user's event types are: ${user.eventTypes
              .map((e: EventType) => `ID: ${e.id}, Title: ${e.title}, Length: ${e.length}`)
              .join("\n")}
            The primary user's working hours are: ${user.workingHours
              .map(
                (w: WorkingHours) =>
                  `Days: ${w.days.join(", ")}, Start Time (minutes in UTC): ${
                    w.startTime
                  }, End Time (minutes in UTC): ${w.endTime}`
              )
              .join("\n")}
              ${
                users.length
                  ? `The email references the following @usernames and email addresses: ${users
                      .map(
                        (u) =>
                          (u.id ? `, id: ${u.id}` : "(non user)") +
                          (u.email ? `, email: ${u.email}` : "") +
                          (u.username ? `, username: ${u.username}` : "")
                        // (u.eventTypes.length
                        //   ? `, event types: ${u.eventTypes
                        //       .map((e) => `id: {e.id}, title: ${e.title}, length: ${e.length}`)
                        //       .join("; ")}`
                        //   : "")
                      )
                      .join("\n\n")}`
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
