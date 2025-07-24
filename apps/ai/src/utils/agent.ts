import OpenAI from "openai";

import { env } from "../env.mjs";
import type { EventType } from "../types/eventType";
import type { User, UserList } from "../types/user";
import type { WorkingHours } from "../types/workingHours";
import { mcpClient } from "./mcpClient";
import now from "./now";

const gptModel = "gpt-4-0125-preview";

/**
 * Core of the Cal.ai booking agent: uses MCP client to communicate with @calcom/cal-mcp server.
 * Provides the same functionality as the previous LangChain implementation.
 */
const agent = async (
  input: string,
  user: User,
  users: UserList,
  apiKey: string,
  userId: number,
  agentEmail: string
) => {
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  const toolsResponse = await mcpClient.listTools();
  const availableTools = toolsResponse.tools.map((tool: any) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));

  const systemPrompt = `You are Cal.ai - a bleeding edge scheduling assistant that interfaces via email.
Make sure your final answers are definitive, complete and well formatted.
Sometimes, tools return errors. In this case, try to handle the error intelligently or ask the user for more information.
Tools will always handle times in UTC, but times sent to users should be formatted per that user's timezone.
In responses to users, always summarize necessary context and open the door to follow ups. For example "I have booked your chat with @username for 3pm on Wednesday, December 20th, 2023 EST. Please let me know if you need to reschedule."
If you can't find a referenced user, ask the user for their email or @username. Make sure to specify that usernames require the @username format. Users don't know other users' userIds.

The primary user's id is: ${userId}
The primary user's username is: ${user.username}
The current time in the primary user's timezone is: ${now(user.timeZone, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  })}
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
}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input },
  ];

  let response = await openai.chat.completions.create({
    model: gptModel,
    messages,
    tools: availableTools,
    temperature: 0,
  });

  let assistantMessage = response.choices[0].message;
  messages.push(assistantMessage);

  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    for (const toolCall of assistantMessage.tool_calls) {
      try {
        const toolResult = await mcpClient.callTool(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult.content),
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    response = await openai.chat.completions.create({
      model: gptModel,
      messages,
      tools: availableTools,
      temperature: 0,
    });

    assistantMessage = response.choices[0].message;
    messages.push(assistantMessage);
  }

  return assistantMessage.content || "I apologize, but I couldn't process your request.";
};

export default agent;
