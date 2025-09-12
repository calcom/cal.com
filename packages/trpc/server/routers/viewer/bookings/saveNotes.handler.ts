import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TSaveNoteInputSchema } from "./saveNotes.schema";

type SaveNoteOptions = {
  input: TSaveNoteInputSchema;
};

export const saveNoteHandler = async ({ input }: SaveNoteOptions) => {
  const { bookingId, meetingNote } = input;

  try {
    const booking = await prisma.booking.findFirstOrThrow({
      where: {
        id: bookingId,
      },
      select: {
        metadata: true,
      },
    });

    let updatedMetadata = {};

    if (booking.metadata && typeof booking.metadata === "object") {
      updatedMetadata = {
        ...booking.metadata,
        meetingNote: meetingNote,
      };
    }

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        metadata: updatedMetadata,
      },
    });
    return { message: "Meeting notes saved" };
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
};
