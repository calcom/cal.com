import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { describe, expect, test } from "vitest";

import { saveToCreditBalance } from "./api/webhook/_checkout.session.completed";

describe("saveToCreditBalance", () => {
  test("updates existing credit balance when found", async () => {
    prismaMock.creditBalance.findUnique.mockResolvedValue({ id: "cb-1" });

    await saveToCreditBalance({ userId: 1, teamId: 1, nrOfCredits: 10 });

    expect(prismaMock.creditBalance.update).toHaveBeenCalledWith({
      where: { id: "cb-1" },
      data: { additionalCredits: { increment: 10 }, limitReachedAt: null },
    });
  });

  test("creates new credits balance with credits if no existing credit balance when found", async () => {
    prismaMock.creditBalance.findUnique.mockResolvedValue();

    await saveToCreditBalance({ userId: 1, teamId: 1, nrOfCredits: 10 });

    expect(prismaMock.creditBalance.create).toHaveBeenCalledWith({
      data: {
        teamId: 1,
        userId: undefined,
        additionalCredits: 10,
      },
    });

    await saveToCreditBalance({ userId: 1, teamId: null, nrOfCredits: 20 });

    expect(prismaMock.creditBalance.create).toHaveBeenCalledWith({
      data: {
        teamId: undefined,
        userId: 1,
        additionalCredits: 20,
      },
    });
  });
});
