import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { OpenAI } from "openai";

import { DailyLocationType } from "@calcom/app-store/locations";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateCopilotSuggestionInputSchema } from "./createCopilotSuggestion.schema";

type CreateCopilotSuggestionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TCreateCopilotSuggestionInputSchema;
};

export const createCopilotSuggestionHandler = async ({ ctx, input }: CreateCopilotSuggestionOptions) => {
  try {
    const items = await augmentInputsWithCopilot(input);

    for (const item of items) {
      const enhancedItem: Prisma.EventTypeCreateInput = {
        ...item,
        owner: { connect: { id: ctx.user.id } },
        users: { connect: { id: ctx.user.id } },
        locations: [{ type: DailyLocationType }],
      };
      await ctx.prisma.eventType.create({
        data: enhancedItem,
      });
    }
    return {};
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};
async function augmentInputsWithCopilot(input: { aboutMe: string; aboutPeopleToMeet: string }) {
  const { aboutMe, aboutPeopleToMeet } = input;

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const llmResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `
  You're an AI assistant built into a meeting scheduling software.
  You learn who the user is, who they want to meet, and the parameters API accepts,
  and you suggest the value for the parameters based on the user's preferences.
          `,
      },
      {
        role: "user",
        content: `
            Here's the parameters API accepts, as zod schema:

            export const _EventTypeModel = z.object({
              title: z.string().min(1),
              slug: imports.eventTypeSlug,
              description: z.string().nullish(),
              length: z.number().int().min(1),
            });
          `,
      },
      {
        role: "user",
        content: `
            Here's the user's preferences:

            About me: "${aboutMe}"
            About people I want to be booked by: "${aboutPeopleToMeet}"
          `,
      },
      {
        role: "user",
        content: `
            Infer the needs of the user based on their preferences.
            Write a json array with objects representing the parameters API accepts,
            given what the user said about themselves and the people they want to meet.
            Every entry must represent a single user need category.

            Whatever explanation / description you write, it must be written from the perspective of the user.

            Must be brief with titles / slugs / names.
            Must be brief, but not too brief with the descriptions / explanations.

            Titles must be short, descriptions must call to action.

            Must sound friendly, professional, optimistic, use simple language, and be easy to understand.
          `,
      },
      {
        role: "assistant",
        content: `Sure! Here's the json array:`,
      },
    ],
  });

  let responseContent = llmResponse?.choices?.[0]?.message?.content || "[]";
  // make sure responseContent is valid json, cut off the rest
  if (responseContent) {
    const jsonStartIndex = responseContent.indexOf("[");
    const jsonEndIndex = responseContent.lastIndexOf("]") + 1;
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      responseContent = responseContent.substring(jsonStartIndex, jsonEndIndex);
    }
  }
  const result = JSON.parse(responseContent);
  return result;
}
