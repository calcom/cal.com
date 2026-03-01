import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/prisma", () => {
  const mockPrisma = {
    bookingInternalNote: {
      create: vi.fn().mockResolvedValue({ id: 1, text: "Test note" }),
    },
    internalNotePreset: {
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 1, name: "Preset" }),
    },
  };
  return { default: mockPrisma };
});

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import { handleInternalNote } from "./handleInternalNote";

function makeBooking(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    uid: "booking-uid",
    eventType: {
      hosts: [{ user: { id: 100 } }],
      owner: { id: 200 },
    },
    ...overrides,
  };
}

describe("handleInternalNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 403 when user is not a host or owner", async () => {
    await expect(
      handleInternalNote({
        internalNote: { id: -1, name: "Other", value: "Note" },
        booking: makeBooking() as never,
        userId: 999,
        teamId: 1,
      })
    ).rejects.toThrow(HttpError);
  });

  it("creates a custom note when internalNote.id is -1 and user is host", async () => {
    await handleInternalNote({
      internalNote: { id: -1, name: "Other", value: "My custom note" },
      booking: makeBooking() as never,
      userId: 100,
      teamId: 1,
    });

    expect(prisma.bookingInternalNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          text: "My custom note",
        }),
      })
    );
  });

  it("creates a preset note when internalNote.id is positive and user is owner", async () => {
    await handleInternalNote({
      internalNote: { id: 5, name: "Preset Note" },
      booking: makeBooking() as never,
      userId: 200,
      teamId: 1,
    });

    expect(prisma.internalNotePreset.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teamId: 1, id: 5 },
      })
    );
    expect(prisma.bookingInternalNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notePreset: { connect: { id: 5 } },
        }),
      })
    );
  });

  it("allows host users to add notes", async () => {
    await handleInternalNote({
      internalNote: { id: -1, name: "Other", value: "Host note" },
      booking: makeBooking() as never,
      userId: 100,
      teamId: 1,
    });

    expect(prisma.bookingInternalNote.create).toHaveBeenCalled();
  });

  it("allows event type owner to add notes", async () => {
    await handleInternalNote({
      internalNote: { id: -1, name: "Other", value: "Owner note" },
      booking: makeBooking() as never,
      userId: 200,
      teamId: 1,
    });

    expect(prisma.bookingInternalNote.create).toHaveBeenCalled();
  });

  it("throws when preset note is not found for the team", async () => {
    vi.mocked(prisma.internalNotePreset.findFirstOrThrow).mockRejectedValue(new Error("Record not found"));

    await expect(
      handleInternalNote({
        internalNote: { id: 999, name: "Missing Preset" },
        booking: makeBooking() as never,
        userId: 100,
        teamId: 1,
      })
    ).rejects.toThrow("Record not found");
  });
});
