"use server";

import { z } from "zod";

import { withUser } from "@lib/withUser";

const saveGeneralPageSchema = z.object({
  locale: z.string(),
  timeZone: z.string(),
  timeFormat: z.number(),
  weekStart: z.string(),
  allowDynamicBooking: z.boolean(),
});

export type SaveGeneralPageInput = z.infer<typeof saveGeneralPageSchema>;

export async function saveGeneralPage(data: SaveGeneralPageInput) {
  await withUser(async (session) => {
    const parsedSchema = saveGeneralPageSchema.safeParse(data);

    if (!parsedSchema.success) {
      throw new Error("Invalid input.");
    }

    // save
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        locale: parsedSchema.data.locale,
        timeZone: parsedSchema.data.timeZone,
        timeFormat: parsedSchema.data.timeFormat,
        weekStart: parsedSchema.data.weekStart,
        allowDynamicBooking: parsedSchema.data.allowDynamicBooking,
      },
    });
  });
}
