// https://python.langchain.com/docs/modules/agents/how_to/custom-functions-with-openai-functions-agent
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { ChatOpenAI } from "langchain/chat_models/openai";

import { env } from "../env.mjs";
import createBookingIfAvailable from "../tools/createBookingIfAvailable";
import deleteBooking from "../tools/deleteBooking";
import getAvailability from "../tools/getAvailability";
import getBookings from "../tools/getBookings";
// import getEventTypes from '../tools/getEventTypes";
import updateBooking from "../tools/updateBooking";
import type EventType from "../types/eventType";
import type User from "../types/user";
import type WorkingHours from "../types/workingHours";
import now from "./now";

const agent = async (input: string, user: User) => {
  const tools = [
    createBookingIfAvailable,
    deleteBooking,
    getAvailability,
    getBookings,
    // getEventTypes,
    updateBooking,
  ];

  const model = new ChatOpenAI({
    modelName: "gpt-4",
    openAIApiKey: env.OPENAI_API_KEY,
    temperature: 0,
    // maxRetries: 2,
  });

  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentArgs: {
      // TODO: encourage agent to translate times to user's timezone.
      // TODO: fork getAvailability to return nicely-formatted, free blocks.
      prefix: `You are Cal AI - a bleeding edge scheduling assistant that interfaces via email.
            Make sure your final answers are definitive and complete.
            Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
            Tools will always handle times in UTC, but times sent to the user should be formatted as AM/PM in the user's timezone.

            Current UTC time is: ${now}
            The user's time zone is: ${user.timeZone}
            The user's event types are: ${user.eventTypes
              .map((e: EventType) => `ID: ${e.id}, Title: ${e.title}, Length: ${e.length}`)
              .join("\n")}
            The user's working hours are: ${user.workingHours
              .map(
                (w: WorkingHours) =>
                  `Days: ${w.days.join(", ")}, Start Time (minutes in UTC): ${
                    w.startTime
                  }, End Time (minutes in UTC): ${w.endTime}`
              )
              .join("\n")}
            The user's ID is: ${user.id}
            The user's email is: ${user.email}
            The API key hash is: ${user.apiKeyHashed}
            The API key IV is: ${user.apiKeyIV}
            `,
    },
    agentType: "openai-functions",
    // returnIntermediateSteps: true,
    // verbose: true,
  });

  // console.log(`Agent activated with input "${input}"...`);

  const result = await executor.call({ input });

  // console.log(
  //   `Intermediate steps: ${JSON.stringify(result.intermediateSteps, null, 2)}`,
  // );

  // console.log(`Output: ${result.output}`);

  return result.output;
};

export default agent;
