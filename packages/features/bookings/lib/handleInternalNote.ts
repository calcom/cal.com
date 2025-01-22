import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

type InternalNote = {
  id: number;
  name: string;
  value?: string;
};

type BookingWithEventType = {
  id: number;
  eventType: {
    hosts: {
      user: {
        id: number;
      };
    }[];
    owner?: {
      id: number | null;
    } | null;
  };
};

export async function handleInternalNote({
  internalNote,
  booking,
  userId,
  teamId,
}: {
  internalNote: InternalNote;
  booking: BookingWithEventType;
  userId: number;
  teamId?: number | null;
}) {
  const userIsHost = booking.eventType.hosts.find((host) => {
    if (host.user.id === userId) return true;
  });

  const userIsOwnerOfEventType = booking.eventType.owner?.id === userId;

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
