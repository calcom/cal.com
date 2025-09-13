"use server";

import { revalidatePath } from "next/cache";

import { createHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/create.handler";
import { ZCreateInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/create.schema";
import { duplicateHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/duplicate.handler";
import { ZDuplicateInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/duplicate.schema";
import { updateHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/update.handler";
import { ZUpdateInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/heavy/update.schema";

import { authedActionClient, eventOwnerActionClient } from "../../../../lib/safe-action";

export const createAction = authedActionClient
  .schema(ZCreateInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    const result = await createHandler({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });

    revalidatePath("/event-types");

    return result;
  });

export const updateAction = eventOwnerActionClient
  .schema(ZUpdateInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    const result = await updateHandler({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });

    revalidatePath("/event-types");
    revalidatePath(`/event-types/${parsedInput.id}`);

    return result;
  });

export const duplicateAction = eventOwnerActionClient
  .schema(ZDuplicateInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    const result = await duplicateHandler({
      ctx: { user: ctx.user },
      input: parsedInput,
    });

    revalidatePath("/event-types");

    return result;
  });
