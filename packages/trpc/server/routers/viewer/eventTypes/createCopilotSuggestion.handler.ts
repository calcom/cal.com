import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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

export const createCopilotSuggestionHandler = async ({ input }: CreateCopilotSuggestionOptions) => {
  const { aboutMe, aboutPeopleToMeet } = input;

  try {
    // TODO: fetch suggestion from open ai API

    return { aboutMe, aboutPeopleToMeet };
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
      }
    }
    throw new TRPCError({ code: "BAD_REQUEST" });
  }
};
