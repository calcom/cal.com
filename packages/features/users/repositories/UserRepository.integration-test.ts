import { prisma } from "@calcom/prisma";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UserRepository } from "./UserRepository";

describe("UserRepository - checkIfEmailRequiresVerification (Integration Tests)", () => {
  const testEmailPrefix = `check-verif-test-${Date.now()}`;

  // Test user emails
  const verifiedRequiresVerifEmail = `${testEmailPrefix}-verified-req@example.com`;
  const verifiedNoVerifEmail = `${testEmailPrefix}-verified-noreq@example.com`;
  const unverifiedRequiresVerifEmail = `${testEmailPrefix}-unverified-req@example.com`;
  const lockedUserEmail = `${testEmailPrefix}-locked@example.com`;
  const secondaryVerifiedEmail = `${testEmailPrefix}-secondary-verified@example.com`;
  const secondaryUnverifiedEmail = `${testEmailPrefix}-secondary-unverified@example.com`;

  const createdUserIds: number[] = [];

  beforeAll(async () => {
    // 1. Verified user with requiresBookerEmailVerification = true
    const user1 = await prisma.user.create({
      data: {
        email: verifiedRequiresVerifEmail,
        username: `${testEmailPrefix}-verified-req`,
        emailVerified: new Date(),
        locked: false,
        requiresBookerEmailVerification: true,
      },
    });
    createdUserIds.push(user1.id);

    // 2. Verified user with requiresBookerEmailVerification = false
    const user2 = await prisma.user.create({
      data: {
        email: verifiedNoVerifEmail,
        username: `${testEmailPrefix}-verified-noreq`,
        emailVerified: new Date(),
        locked: false,
        requiresBookerEmailVerification: false,
      },
    });
    createdUserIds.push(user2.id);

    // 3. Unverified user with requiresBookerEmailVerification = true
    const user3 = await prisma.user.create({
      data: {
        email: unverifiedRequiresVerifEmail,
        username: `${testEmailPrefix}-unverified-req`,
        emailVerified: null,
        locked: false,
        requiresBookerEmailVerification: true,
      },
    });
    createdUserIds.push(user3.id);

    // 4. Locked user with requiresBookerEmailVerification = true
    const user4 = await prisma.user.create({
      data: {
        email: lockedUserEmail,
        username: `${testEmailPrefix}-locked`,
        emailVerified: new Date(),
        locked: true,
        requiresBookerEmailVerification: true,
      },
    });
    createdUserIds.push(user4.id);

    // 5. User with verified secondary email that requires verification
    const user5 = await prisma.user.create({
      data: {
        email: `${testEmailPrefix}-primary-for-secondary@example.com`,
        username: `${testEmailPrefix}-secondary-host`,
        emailVerified: new Date(),
        locked: false,
        requiresBookerEmailVerification: true,
      },
    });
    createdUserIds.push(user5.id);

    await prisma.secondaryEmail.create({
      data: {
        userId: user5.id,
        email: secondaryVerifiedEmail,
        emailVerified: new Date(),
      },
    });

    // 6. User with unverified secondary email
    await prisma.secondaryEmail.create({
      data: {
        userId: user5.id,
        email: secondaryUnverifiedEmail,
        emailVerified: null,
      },
    });
  });

  afterAll(async () => {
    // Clean up secondary emails first (FK constraint)
    await prisma.secondaryEmail.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  });

  it("returns true for a verified user who requires booker email verification", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({ email: verifiedRequiresVerifEmail });
    expect(result).toBe(true);
  });

  it("returns false for a verified user who does NOT require booker email verification", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({ email: verifiedNoVerifEmail });
    expect(result).toBe(false);
  });

  it("returns false for an unverified user even if requiresBookerEmailVerification is true", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({ email: unverifiedRequiresVerifEmail });
    expect(result).toBe(false);
  });

  it("returns false for a locked user even if verified and requiresBookerEmailVerification is true", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({ email: lockedUserEmail });
    expect(result).toBe(false);
  });

  it("returns false for a non-existent email", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({
      email: "totally-nonexistent-email-xyz@example.com",
    });
    expect(result).toBe(false);
  });

  it("returns true for a verified secondary email whose user requires verification", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({ email: secondaryVerifiedEmail });
    expect(result).toBe(true);
  });

  it("returns false for an unverified secondary email even if user requires verification", async () => {
    const repo = new UserRepository(prisma);
    const result = await repo.checkIfEmailRequiresVerification({ email: secondaryUnverifiedEmail });
    expect(result).toBe(false);
  });

  it("handles case-insensitive email matching", async () => {
    const repo = new UserRepository(prisma);
    const upperCaseEmail = verifiedRequiresVerifEmail.toUpperCase();
    const result = await repo.checkIfEmailRequiresVerification({ email: upperCaseEmail });
    expect(result).toBe(true);
  });
});
