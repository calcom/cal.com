import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@calcom/prisma";
import { prisma } from "@calcom/prisma";
import type { TRPCContext } from "@calcom/trpc/server/createContext";
import type { TUpdateInputSchema } from "./update.schema";
import { TRPCError } from "@trpc/server";
import { updateOptionalGuests } from "./util";

// ... existing imports and code ...

type UpdateOptions = {
  ctx: {
    user: NonNullable<TRPCContext["user"]>;
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const {
    // ... existing destructuring ...
    optionalGuests,
    ...rest
  } = input;

  // ... existing event type ownership verification ...

  // Handle optional guests update
  if (optionalGuests !== undefined) {
    const eventType = await prisma.eventType.findUnique({
      where: { id: input.id },
      select: { teamId: true },
    });

    await updateOptionalGuests(
      prisma,
      input.id,
      optionalGuests?.map((g) => g.id) ?? [],
      eventType?.teamId ?? null
    );
  }

  // ... rest of update logic ...
};
