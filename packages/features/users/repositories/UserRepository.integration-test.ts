import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { UserRepository } from "./UserRepository";
import { getUserRepository } from "@calcom/features/di/containers/UserRepository";
import { IdentityProvider } from "@calcom/prisma/enums";
import bcrypt from "bcryptjs";

const testRunId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
const createdUserIds: number[] = [];

describe("UserRepository Integration Tests - Signup Methods", () => {
  let userRepository: UserRepository;

  async function cleanupTestUsers() {
    if (createdUserIds.length > 0) {
      await userRepository.deleteMany({ userIds: createdUserIds })
      createdUserIds.length = 0
    }
  }

  beforeAll(async () => {
    userRepository = getUserRepository();
  });

  afterEach(async () => {
    await cleanupTestUsers();
  });

  describe("upsertForSignup", () => {
    it("should create a new user when email doesn't exist", async () => {
      const testEmail = `signup-new-${testRunId}@example.com`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      const result = await userRepository.upsertForSignup({
        email: testEmail,
        username: `signupuser-${testRunId}`,
        hashedPassword,
        organizationId: null,
        emailVerified: new Date(Date.now()),
        identityProvider: IdentityProvider.CAL,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBeDefined();
      createdUserIds.push(result.id);

      const createdUser = await userRepository.findByEmail({ email: testEmail});

      expect(createdUser).not.toBeNull();
      expect(createdUser?.email).toBe(testEmail);
      expect(createdUser?.emailVerified).not.toBeNull();
    });

    it("should update existing user's credentials on upsert", async () => {
      const testEmail = `signup-update-${testRunId}@example.com`;
      const hashedPassword1 = await bcrypt.hash("password123", 10);
      const hashedPassword2 = await bcrypt.hash("newpassword456", 10);

      const user1 = await userRepository.upsertForSignup({
        email: testEmail,
        username: `user-${testRunId}`,
        hashedPassword: hashedPassword1,
        organizationId: null,
        emailVerified: new Date(Date.now() - 86400000),
        identityProvider: IdentityProvider.CAL,
      });
      createdUserIds.push(user1.id);

      const user2 = await userRepository.upsertForSignup({
        email: testEmail,
        username: `user-${testRunId}-updated`,
        hashedPassword: hashedPassword2,
        organizationId: null,
        emailVerified: new Date(),
        identityProvider: IdentityProvider.CAL,
      });

      expect(user2.id).toBe(user1.id);

      const updatedUser = await userRepository.findByEmailAndIncludeProfilesAndPassword({ email: testEmail});

      expect(updatedUser?.username).toBe(`user-${testRunId}-updated`);
      expect(updatedUser?.password?.hash).toBe(hashedPassword2);
    });

    it("should preserve user ID on upsert", async () => {
      const testEmail = `signup-preserve-${testRunId}@example.com`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      const user1 = await userRepository.upsertForSignup({
        email: testEmail,
        username: `user-${testRunId}-p1`,
        hashedPassword,
        organizationId: null,
        emailVerified: new Date(),
        identityProvider: IdentityProvider.CAL,
      });
      createdUserIds.push(user1.id);
      const initialId = user1.id;

      const user2 = await userRepository.upsertForSignup({
        email: testEmail,
        username: `user-${testRunId}-p2`,
        hashedPassword,
        organizationId: null,
        emailVerified: new Date(),
        identityProvider: IdentityProvider.CAL,
      });

      expect(user2.id).toBe(initialId);
    });

    it("should set email as verified on signup", async () => {
      const testEmail = `signup-verified-${testRunId}@example.com`;
      const hashedPassword = await bcrypt.hash("password123", 10);
      const verificationDate = new Date();

      const result = await userRepository.upsertForSignup({
        email: testEmail,
        username: `user-${testRunId}-v1`,
        hashedPassword,
        organizationId: null,
        emailVerified: verificationDate,
        identityProvider: IdentityProvider.CAL,
      });
      createdUserIds.push(result.id);

      const user = await userRepository.findByEmail({ email: testEmail });

      if (!user) {
        throw new Error("User was not found after signup");
      }

      expect(user?.emailVerified).not.toBeNull();
      expect(user?.emailVerified?.getTime()).toBe(verificationDate.getTime());
    });

    it("should create password record for new user", async () => {
      const testEmail = `signup-pwd-${testRunId}@example.com`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      const result = await userRepository.upsertForSignup({
        email: testEmail,
        username: `user-${testRunId}-pwd`,
        hashedPassword,
        organizationId: null,
        emailVerified: new Date(),
        identityProvider: IdentityProvider.CAL,
      });
      createdUserIds.push(result.id);

      const userWithPassword = await userRepository.findByEmailAndIncludeProfilesAndPassword({ email: testEmail })

       if (!userWithPassword) {
        throw new Error("User was not found after signup");
      }

      expect(userWithPassword?.password).not.toBeNull();
      expect(userWithPassword?.password?.hash).toBe(hashedPassword);
      expect(userWithPassword?.password?.userId).toBe(result.id);
    });

    it("should throw error on duplicate unique constraint if username exists", async () => {
      const testEmail1 = `signup-dup1-${testRunId}@example.com`;
      const testEmail2 = `signup-dup2-${testRunId}@example.com`;
      const duplicateUsername = `dupuser-${testRunId}`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      const user1 = await userRepository.upsertForSignup({
        email: testEmail1,
        username: duplicateUsername,
        hashedPassword,
        organizationId: null,
        emailVerified: new Date(),
        identityProvider: IdentityProvider.CAL,
      });
      createdUserIds.push(user1.id);

      await expect(
        userRepository.upsertForSignup({
          email: testEmail2,
          username: duplicateUsername,
          hashedPassword,
          organizationId: null,
          emailVerified: new Date(),
          identityProvider: IdentityProvider.CAL,
        })
      ).rejects.toThrow();
    });
  });

  describe("Integration: Individual Signup flow", () => {
  it("should complete full individual signup flow: check email, check username, then upsert", async () => {
    const testEmail = `flow-${testRunId}@example.com`;
    const testUsername = `flowuser-${testRunId}`;
    const hashedPassword = await bcrypt.hash("password123", 10);

    const existingUser = await userRepository.findByEmail({
      email: testEmail,
    });
    expect(existingUser).toBeNull();

    const usersWithUsername = await userRepository.findUsersByUsername({
      orgSlug: null,
      usernameList: [testUsername],
    });
    const usernameTaken = usersWithUsername.length > 0 ? usersWithUsername[0] : null;
    expect(usernameTaken).toBeNull();

    const signupResult = await userRepository.upsertForSignup({
      email: testEmail,
      username: testUsername,
      hashedPassword,
      organizationId: null,
      emailVerified: new Date(Date.now()),
      identityProvider: IdentityProvider.CAL,
    });
    createdUserIds.push(signupResult.id);

    expect(signupResult.id).toBeDefined();

    const userWithPassword = await userRepository.findByEmailAndIncludeProfilesAndPassword({ email: testEmail })

    if (!userWithPassword) {
      throw new Error("User was not found after signup");
    }

    expect(userWithPassword?.email).toBe(testEmail);
    expect(userWithPassword?.username).toBe(testUsername);
    expect(userWithPassword?.password).not.toBeNull();

    const userWithOrganizationId = await userRepository.getUserOrganizationAndTeams({ userId: userWithPassword.id});

    expect(userWithOrganizationId?.organizationId).toBeNull();
  });
});
});
