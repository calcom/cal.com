import type { z } from "zod";

import { WorkspacePlatformRepository } from "@calcom/lib/server/repository/workspacePlatform";
import { workspacePlatformCreateSchema } from "./schema";
import { TRPCError } from "@trpc/server";

export default async function addHandler({
  input,
}: {
  input: z.infer<typeof workspacePlatformCreateSchema>;
}) {
  try {
    return await WorkspacePlatformRepository.create(input);
  } catch (error) {
    console.error(error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to add workspace platform" });
  }
}
