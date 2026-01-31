import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { InternalNotePresetType } from "@calcom/prisma/enums";

import type { BookingToDelete } from "./getBookingToDelete";

type InternalNote = {
  id: number;
  name: string;
  value?: string;
};

export async function handleInternalNote({
  internalNote,
  booking,
  userId,
  teamId,
  presetType,
}: {
  internalNote: InternalNote;
  booking: BookingToDelete;
  userId: number;
  teamId: number;
  presetType?: InternalNotePresetType;
}) {
  const userIsHost = booking?.eventType?.hosts.find((host) => {
    if (host.user.id === userId) return true;
  });

  const userIsOwnerOfEventType = booking?.eventType?.owner?.id === userId;

  if (!userIsHost && !userIsOwnerOfEventType) {
    throw new HttpError({
      statusCode: 403,
      message: "You do not have permission to add an internal note to this booking.",
    });
  }

  // "Other"
  if (internalNote.id === -1) {
    return prisma.bookingInternalNote.create({
      data: {
        booking: {
          connect: {
            id: booking.id,
          },
        },
        text: internalNote.value,
        createdBy: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  // "Preset"
  await prisma.internalNotePreset.findFirstOrThrow({
    where: {
      teamId: teamId,
      id: internalNote.id,
      ...(presetType ? { type: presetType } : {}),
    },
  });

  return prisma.bookingInternalNote.create({
    data: {
      notePreset: {
        connect: {
          id: internalNote.id,
        },
      },
      createdBy: {
        connect: {
          id: userId,
        },
      },
      booking: {
        connect: {
          id: booking.id,
        },
      },
    },
  });
}
