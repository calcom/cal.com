import type { Prisma } from "@calcom/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateProfileEmails } from "./updateProfileEmails";

const verifiedAt = new Date("2025-01-01");
const secondaryEmail = {
  findMany: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
};
const eventType = { updateMany: vi.fn() };
const tx = { secondaryEmail, eventType } as unknown as Prisma.TransactionClient;
const options = {
  tx,
  userId: 1,
  secondaryEmails: [],
  promotedEmail: { id: 10 },
  previousPrimaryEmail: "old@example.com",
  previousPrimaryEmailVerified: verifiedAt,
};

beforeEach(() => {
  vi.resetAllMocks();
  secondaryEmail.findMany.mockResolvedValue([
    { id: 10, email: "new@example.com", emailVerified: verifiedAt },
    { id: 20, email: "other@example.com", emailVerified: verifiedAt },
  ]);
});

describe("profile email persistence", () => {
  it("removes the old primary without deleting its event types", async () => {
    await updateProfileEmails({ ...options, removePreviousPrimaryEmail: true });
    expect(eventType.updateMany).toHaveBeenCalledWith({
      where: { secondaryEmailId: { in: [10] }, secondaryEmail: { userId: 1 } },
      data: { secondaryEmailId: null },
    });
    expect(secondaryEmail.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1, id: { in: [10] } },
    });
    expect(eventType.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      secondaryEmail.deleteMany.mock.invocationCallOrder[0]
    );
    expect(secondaryEmail.update).not.toHaveBeenCalled();
  });

  it.each([false, undefined])("retains the old primary when removal is %s", async (remove) => {
    await updateProfileEmails({ ...options, removePreviousPrimaryEmail: remove });
    expect(secondaryEmail.update).toHaveBeenCalledWith({
      where: { id: 10, userId: 1 },
      data: { email: "old@example.com", emailVerified: verifiedAt },
    });
    expect(eventType.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      secondaryEmail.update.mock.invocationCallOrder[0]
    );
    expect(secondaryEmail.deleteMany).not.toHaveBeenCalled();
  });

  it.each([
    false,
    true,
  ])("ignores duplicate dirty-form changes to the promoted record (%s)", async (isDeleted) => {
    await updateProfileEmails({
      ...options,
      secondaryEmails: [{ id: 10, email: "new@example.com", isDeleted }],
    });
    expect(secondaryEmail.update).toHaveBeenCalledTimes(1);
    expect(secondaryEmail.deleteMany).not.toHaveBeenCalled();
  });

  it("also detaches ordinary secondary email deletions before the cascade", async () => {
    await updateProfileEmails({
      ...options,
      promotedEmail: undefined,
      secondaryEmails: [{ id: 20, email: "other@example.com", isDeleted: true }],
    });
    expect(eventType.updateMany).toHaveBeenCalledWith({
      where: { secondaryEmailId: { in: [20] }, secondaryEmail: { userId: 1 } },
      data: { secondaryEmailId: null },
    });
    expect(eventType.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      secondaryEmail.deleteMany.mock.invocationCallOrder[0]
    );
  });

  it("leaves other notification overrides alone when promoting an email", async () => {
    await updateProfileEmails(options);
    expect(eventType.updateMany).toHaveBeenCalledWith({
      where: { secondaryEmailId: { in: [10] }, secondaryEmail: { userId: 1 } },
      data: { secondaryEmailId: null },
    });
  });

  it("does not promote or remove an old primary while verification is pending", async () => {
    await updateProfileEmails({ ...options, promotedEmail: undefined, removePreviousPrimaryEmail: true });
    expect(secondaryEmail.findMany).not.toHaveBeenCalled();
    expect(eventType.updateMany).not.toHaveBeenCalled();
    expect(secondaryEmail.deleteMany).not.toHaveBeenCalled();
  });

  it.each(["other@example.com", "edited@example.com"])("handles verification for %s", async (email) => {
    await updateProfileEmails({
      ...options,
      promotedEmail: undefined,
      secondaryEmails: [{ id: 20, email, isDeleted: false }],
    });
    expect(secondaryEmail.update).toHaveBeenCalledWith({
      where: { id: 20, userId: 1 },
      data: { email, emailVerified: email === "other@example.com" ? verifiedAt : null },
    });
  });

  it("rejects stale or foreign email edits before disconnecting event types", async () => {
    secondaryEmail.findMany.mockResolvedValue([]);
    await expect(updateProfileEmails(options)).rejects.toThrow("Secondary email no longer exists");
    expect(eventType.updateMany).not.toHaveBeenCalled();
    expect(secondaryEmail.update).not.toHaveBeenCalled();
  });

  it("does not delete an email if detachment fails", async () => {
    eventType.updateMany.mockRejectedValue(new Error("database failure"));
    await expect(updateProfileEmails({ ...options, removePreviousPrimaryEmail: true })).rejects.toThrow(
      "database failure"
    );
    expect(secondaryEmail.deleteMany).not.toHaveBeenCalled();
  });
});
