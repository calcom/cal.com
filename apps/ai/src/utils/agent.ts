import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent, createStructuredChatAgent } from "langchain/agents";

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

const gptModel = "gpt-4-0125-preview";

const OPENAI_SYSTEM_PROMPT_TEMPLATE = `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email.
Make sure your final answers are definitive, complete and well formatted.
Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone.
In responses to users, always summarize necessary context and open the door to follow ups. For example "I have booked your chat with @username for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule."
If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds.

The primary user's id is: {user_id}
The primary user's username is: {username}
The current time in the primary user's timezone is: {local_time}
The primary user's time zone is: {timezone}
The primary user's event types are: {user_event_types}
The primary user's working hours are: {working_hours}
{referenced_users}`;

const MIXTRAL_SYSTEM_PROMPT_TEMPLATE = `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email.
Make sure your final answers are definitive, complete and well formatted.

You have access to the following tools:

{tools}

Use a json blob to specify a tool by providing an action key (tool name) and an action_input key (tool input).
When calling a tool, make sure the parameters you generate EXACTLY match the chosen tool's schema.

Valid "action" values: "Final Answer" or {tool_names}

Provide only ONE action per $JSON_BLOB, as shown:

\`\`\`
{{
  "action": $TOOL_NAME,
  "action_input": $INPUT
}}
\`\`\`

Follow this format:

Question: input question to answer
Thought: consider previous and subsequent steps
Action:

\`\`\`
$JSON_BLOB
\`\`\`

Observation: action result
... (repeat Thought/Action/Observation N times)
Thought: I know what to respond
Action:

\`\`\`

{{
  "action": "Final Answer",
  "action_input": "Final response to human"
}}

Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone.
In responses to users, always summarize necessary context and open the door to follow ups. For example "I have booked your chat with @username for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule."
If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds.

The primary user's id is: {user_id}
The primary user's username is: {username}
The current time in the primary user's timezone is: {local_time}
The primary user's time zone is: {timezone}
The primary user's event types are: {user_event_types}
The primary user's working hours are: {working_hours}
{referenced_users}

Begin! Reminder to ALWAYS respond with a valid json blob of a single action. Use tools if necessary. Respond directly if appropriate. Format is Action: \`\`\`$JSON_BLOB\`\`\` then Observation`;

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
  agentEmail: string,
  agentType?: "openai" | "groq"
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

  const partialPromptParams = {
    user_id: userId.toString(),
    username: user.username,
    local_time: now(user.timeZone, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }),
    timezone: user.timeZone,
    user_event_types: user.eventTypes
      .map((e: EventType) => `ID: ${e.id}, Slug: ${e.slug}, Title: ${e.title}, Length: ${e.length};`)
      .join("\n"),
    working_hours: user.workingHours
      .map(
        (w: WorkingHours) =>
          `Days: ${w.days.join(", ")}, Start Time (minutes in UTC): ${
            w.startTime
          }, End Time (minutes in UTC): ${w.endTime};`
      )
      .join("\n"),
    referenced_users: users.length
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
      : "",
  };

  let agent;
  if (agentType === "groq") {
    const model = new ChatGroq({
      modelName: "mixtral-8x7b-32768",
      apiKey: env.GROQ_API_KEY,
      temperature: 0,
    });
    /**
     * Initialize the agent's prompt.
     * Adapted from:
     * https://smith.langchain.com/hub/hwchase17/structured-chat-agent
     */
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", MIXTRAL_SYSTEM_PROMPT_TEMPLATE],
      [
        "human",
        `{input}

{agent_scratchpad}
(reminder to respond in a JSON blob no matter what)`,
      ],
    ]);
    const partialedPrompt = await prompt.partial(partialPromptParams);
    agent = await createStructuredChatAgent({
      llm: model,
      prompt: partialedPrompt,
      tools,
    });
  } else {
    const model = new ChatOpenAI({
      modelName: gptModel,
      openAIApiKey: env.OPENAI_API_KEY,
      temperature: 0,
    });

    /**
     * Initialize the agent's prompt.
     * Adapted from:
     * https://smith.langchain.com/hub/hwchase17/openai-functions-agent
     */
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", OPENAI_SYSTEM_PROMPT_TEMPLATE],
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const partialedPrompt = await prompt.partial(partialPromptParams);
    agent = await createOpenAIFunctionsAgent({
      llm: model,
      prompt: partialedPrompt,
      tools,
    });
  }

  const executor = new AgentExecutor({
    agent,
    tools,
    returnIntermediateSteps: env.NODE_ENV === "development",
    verbose: env.NODE_ENV === "development",
  });

  const result = await executor.invoke({ input });
  const { output } = result;

  return output;
};

export default agent;
