import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { Ollama } from "langchain/llms/ollama";

import { env } from "../env.mjs";
import createBookingIfAvailable from "../tools/createBooking";
import deleteBooking from "../tools/deleteBooking";
import getAvailability from "../tools/getAvailability";
import getBookings from "../tools/getBookings";
import sendBookingEmail from "../tools/sendBookingEmail";
import updateBooking from "../tools/updateBooking";
import type { User, UserList } from "../types/user";

/**
 * Core of the Cal.ai booking agent: a LangChain Agent Executor.
 * Uses a toolchain to book meetings, list available slots, etc.
 * Uses LangChain's Ollama Functions to better enforce JSON-parsable output from the LLM.
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
  const model = new Ollama({
    temperature: 0,
    model: "mistral",
  });

  //   const prefix = `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email.
  // Make sure your final answers are definitive, complete and well formatted.
  // Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
  // Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone.
  // In responses to users, always summarize necessary context and open the door to follow ups. For example "I have booked your chat with @username for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule."
  // If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds.

  // The primary user's id is: ${userId}
  // The primary user's username is: ${user.username}
  // The current time in the primary user's timezone is: ${now(user.timeZone)}
  // The primary user's time zone is: ${user.timeZone}
  // The primary user's event types are: ${user.eventTypes
  //     .map((e: EventType) => `ID: ${e.id}, Slug: ${e.slug}, Title: ${e.title}, Length: ${e.length};`)
  //     .join("\n")}
  // The primary user's working hours are: ${user.workingHours
  //     .map(
  //       (w: WorkingHours) =>
  //         `Days: ${w.days.join(", ")}, Start Time (minutes in UTC): ${
  //           w.startTime
  //         }, End Time (minutes in UTC): ${w.endTime};`
  //     )
  //     .join("\n")}
  // ${
  //   users.length
  //     ? `The email references the following @usernames and emails: ${users
  //         .map(
  //           (u) =>
  //             `${
  //               (u.id ? `, id: ${u.id}` : "id: (non user)") +
  //               (u.username
  //                 ? u.type === "fromUsername"
  //                   ? `, username: @${u.username}`
  //                   : ", username: REDACTED"
  //                 : ", (no username)") +
  //               (u.email
  //                 ? u.type === "fromEmail"
  //                   ? `, email: ${u.email}`
  //                   : ", email: REDACTED"
  //                 : ", (no email)")
  //             };`
  //         )
  //         .join("\n")}`
  //     : ""
  // }
  //             `;

  const testPrefix = `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email. Make sure your final answers are definitive, complete and well formatted. Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information. Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone. In responses to users, always summarize necessary context and open the door to follow ups. For example, "I have booked your chat with @johndoe for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule." If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds. If the user data given to you is unclear, DO NOT MAKE IT UP. REPLY YOU NEED HELP WITH DATA.

The primary user's id is: 40
The primary user's username is: @filip
The current time in the primary user's timezone is: 2:00 PM EST
The primary user's time zone is: EST
The primary user's event types are:
ID: 1, Slug: 30min, Title: 30min, Length: 30;
ID: 4, Slug: 60min, Title: 60min, Length: 60;

The primary user's working hours are:
Days: Monday, Tuesday, Wednesday, Start Time (minutes in UTC): 540, End Time (minutes in UTC): 1020;
Days: Thursday, Friday, Start Time (minutes in UTC): 600, End Time (minutes in UTC): 900;

The email references the following @usernames and emails:
id: (non user), username: @delete-me, email: wojdafilip@gmail.com;
id: (non user), username: @onboarding, email: wojdafilipdev@gmail.com;`;
  /**
   * Initialize the agent executor with arguments.
   */
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentArgs: {
      prefix: testPrefix,
    },
    agentType: "structured-chat-zero-shot-react-description",
    returnIntermediateSteps: env.NODE_ENV === "development",
    verbose: env.NODE_ENV === "development",
  });

  console.log("Loaded agent.");

  // PROMPT: "Create Booking for 10AM this Wednesday. Then remove the one with Maria on Tuesday.";

  console.log(`Executing with input "${input}"...`);
  const result = await executor.invoke({ input });

  console.log(`Got output ${result.output}`);

  return result.output;
};

export default agent;
