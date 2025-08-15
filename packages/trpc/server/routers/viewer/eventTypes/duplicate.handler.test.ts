import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { TRPCError } from "@trpc/server";

import { duplicateHandler } from "./duplicate.handler";

vi.mock("@calcom/prisma", () => ({
  default: prismaMock,
}));
vi.mock("@calcom/lib/server/repository/eventTypeRepository");

describe("duplicateHandler", () => {
  const ctx = { user: { id: 1, profile: { id: 1 } } } as any;
  const input = { id: 123, slug: "test-event", title: "Test", description: "Test", length: 30, teamId: null };
  const eventType = { id: 123, userId: 1, teamId: null, users: [{ id: 1 }] };

  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.eventType.findUnique.mockResolvedValue(eventType);
  });

  it("should throw BAD_REQUEST in case of unique constraint violation", async () => {
    const { EventTypeRepository } = await import("@calcom/lib/server/repository/eventTypeRepository");
    vi.mocked(EventTypeRepository).mockImplementation(
      () =>
        ({
          create: vi.fn().mockRejectedValue(
            new PrismaClientKnownRequestError("Unique constraint failed", {
              code: "P2002",
              clientVersion: "mockedVersion",
            })
          ),
        } as any)
    );

    await expect(duplicateHandler({ ctx, input })).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message: "Unique constraint violation while creating a duplicate event.",
      })
    );
  });
});
