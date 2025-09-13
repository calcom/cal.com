"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { bulkUpdateToDefaultLocationHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/bulkUpdateToDefaultLocation.handler";
import { deleteHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/delete.handler";
import { ZDeleteInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/delete.schema";

import { eventOwnerActionClient } from "@lib/safe-action";

export const deleteAction = eventOwnerActionClient
  .schema(ZDeleteInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await deleteHandler({
      ctx: { user: ctx.user },
      input: parsedInput,
    });

    revalidatePath("/event-types");
    revalidatePath(`/event-types/${parsedInput.id}`);

    return result;
  });

export const bulkUpdateToDefaultLocationAction = eventOwnerActionClient
  .schema(
    z.object({
      eventTypeIds: z.array(z.number()),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const result = await bulkUpdateToDefaultLocationHandler({
      ctx: { user: ctx.user },
      input: parsedInput,
    });

    revalidatePath("/event-types");

    return result;
  });
