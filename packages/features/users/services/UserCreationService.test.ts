import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { CreationSource, IdentityProvider } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { UserCreationService } from "./UserCreationService";

vi.mock("@calcom/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@calcom/lib/availability", () => ({
  DEFAULT_SCHEDULE: [],
  getAvailabilityFromSchedule: vi
    .fn()
    .mockReturnValue([
      {
        days: [1, 2, 3, 4, 5],
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T17:00:00Z"),
      },
    ]),
}));

vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    generateProfileUid: vi.fn().mockReturnValue("mock-profile-uid"),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {},
  prisma: {},
}));

const mockUserRepository = {
  create: vi.fn(),
  upsert: vi.fn(),
  createInTransaction: vi.fn(),
  createMany: vi.fn(),
};

const mockUserData = {
  email: "test@example.com",
  username: "test",
  creationSource: CreationSource.WEBAPP,
};

vi.stubEnv("CALCOM_LICENSE_KEY", undefined);

describe("UserCreationService", () => {
  let service: UserCreationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserCreationService({
      userRepository: mockUserRepository as any,
    });
  });

  describe("createUser", () => {
    test("should create user", async () => {
      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: false,
        organizationId: null,
      });

      const user = await service.createUser({ data: mockUserData });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "test",
          locked: false,
          organizationId: null,
        })
      );

      expect(user).not.toHaveProperty("locked");
    });

    test("should lock user when email is in watchlist", async () => {
      vi.mocked(checkIfEmailIsBlockedInWatchlistController).mockResolvedValue(true);

      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: true,
        organizationId: null,
      });

      const user = await service.createUser({ data: mockUserData });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          locked: true,
        })
      );

      expect(user).not.toHaveProperty("locked");
    });

    test("should skip watchlist check when locked is explicitly provided", async () => {
      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: false,
        organizationId: null,
      });

      await service.createUser({ data: { ...mockUserData, locked: false } });

      expect(checkIfEmailIsBlockedInWatchlistController).not.toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ locked: false }));
    });

    test("should hash password when provided", async () => {
      const mockPassword = "password";
      vi.mocked(hashPassword).mockResolvedValue("hashed_password");

      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: false,
        organizationId: null,
      });

      const user = await service.createUser({
        data: { ...mockUserData, password: mockPassword },
      });

      expect(hashPassword).toHaveBeenCalledWith(mockPassword);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword: "hashed_password",
        })
      );

      expect(user).not.toHaveProperty("locked");
    });

    test("should slugify username", async () => {
      mockUserRepository.create.mockResolvedValue({
        username: "my-user-name",
        locked: false,
        organizationId: null,
      });

      await service.createUser({
        data: { ...mockUserData, username: "My User Name" },
      });

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: "my-user-name" })
      );
    });

    test("should pass abuseScore to repository", async () => {
      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: false,
        organizationId: null,
      });

      const abuseScore = {
        score: 75,
        abuseData: { flags: ["suspicious_email"], signals: [] },
      };

      await service.createUser({
        data: { ...mockUserData, locked: false, abuseScore },
      });

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ abuseScore }));
    });

    test("should pass metadata to repository", async () => {
      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: false,
        organizationId: null,
      });

      const metadata = { stripeCustomerId: "cus_123", checkoutSessionId: null };

      await service.createUser({
        data: { ...mockUserData, locked: false, metadata },
      });

      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({ metadata }));
    });

    test("should not pass password or locked fields to repository", async () => {
      vi.mocked(hashPassword).mockResolvedValue("hashed_pw");
      mockUserRepository.create.mockResolvedValue({
        username: "test",
        locked: false,
        organizationId: null,
      });

      await service.createUser({
        data: { ...mockUserData, password: "secret", locked: true },
      });

      const callArgs = mockUserRepository.create.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("password");
      expect(callArgs).toHaveProperty("locked", true);
      expect(callArgs).toHaveProperty("hashedPassword", "hashed_pw");
    });
  });

  describe("upsertUser", () => {
    test("should upsert user with hashed password and default schedule", async () => {
      vi.mocked(hashPassword).mockResolvedValue("hashed_upsert");
      mockUserRepository.upsert.mockResolvedValue({ id: 1 });

      await service.upsertUser({
        email: "test@example.com",
        createData: {
          ...mockUserData,
          password: "pass123",
          identityProvider: IdentityProvider.CAL,
          locked: false,
        },
        updateData: {
          username: "updated-test",
          identityProvider: IdentityProvider.CAL,
        },
      });

      expect(hashPassword).toHaveBeenCalledWith("pass123");
      expect(mockUserRepository.upsert).toHaveBeenCalledWith(
        { email: "test@example.com" },
        expect.objectContaining({
          username: "test",
          email: "test@example.com",
          hashedPassword: "hashed_upsert",
          locked: false,
          defaultSchedule: expect.objectContaining({
            name: "default_schedule_name",
            availability: expect.any(Array),
          }),
        }),
        expect.objectContaining({
          username: "updated-test",
          hashedPassword: "hashed_upsert",
        })
      );
    });

    test("should pass profile data when organizationId is provided", async () => {
      mockUserRepository.upsert.mockResolvedValue({ id: 1 });

      await service.upsertUser({
        email: "test@example.com",
        createData: {
          ...mockUserData,
          organizationId: 42,
          locked: false,
        },
        updateData: {},
      });

      expect(mockUserRepository.upsert).toHaveBeenCalledWith(
        { email: "test@example.com" },
        expect.objectContaining({
          organizationId: 42,
          profile: {
            username: "test",
            organizationId: 42,
            uid: "mock-profile-uid",
          },
        }),
        expect.any(Object)
      );
    });

    test("should not pass profile data when organizationId is null", async () => {
      mockUserRepository.upsert.mockResolvedValue({ id: 1 });

      await service.upsertUser({
        email: "test@example.com",
        createData: { ...mockUserData, locked: false },
        updateData: {},
      });

      const createArg = mockUserRepository.upsert.mock.calls[0][1];
      expect(createArg).not.toHaveProperty("profile");
    });

    test("should slugify usernames in both create and update data", async () => {
      mockUserRepository.upsert.mockResolvedValue({ id: 1 });

      await service.upsertUser({
        email: "test@example.com",
        createData: {
          ...mockUserData,
          username: "My User",
          locked: false,
        },
        updateData: {
          username: "Updated User",
        },
      });

      expect(mockUserRepository.upsert).toHaveBeenCalledWith(
        { email: "test@example.com" },
        expect.objectContaining({ username: "my-user" }),
        expect.objectContaining({ username: "updated-user" })
      );
    });

    test("should strip service-only fields from updateData", async () => {
      mockUserRepository.upsert.mockResolvedValue({ id: 1 });

      await service.upsertUser({
        email: "test@example.com",
        createData: { ...mockUserData, locked: false },
        updateData: {
          username: "test",
          locked: true,
          abuseScore: { score: 50, abuseData: {} },
        },
      });

      const updateArg = mockUserRepository.upsert.mock.calls[0][2];
      expect(updateArg).not.toHaveProperty("locked");
      expect(updateArg).not.toHaveProperty("abuseScore");
      expect(updateArg).not.toHaveProperty("password");
    });
  });

  describe("createUserInTransaction", () => {
    const mockTxClient = {} as any;

    test("should create user in transaction with hashed password and default schedule", async () => {
      vi.mocked(hashPassword).mockResolvedValue("hashed_tx");
      mockUserRepository.createInTransaction.mockResolvedValue({ id: 1 });

      await service.createUserInTransaction(mockTxClient, {
        data: { ...mockUserData, password: "txpass", locked: false },
      });

      expect(hashPassword).toHaveBeenCalledWith("txpass");
      expect(mockUserRepository.createInTransaction).toHaveBeenCalledWith(
        mockTxClient,
        expect.objectContaining({
          username: "test",
          hashedPassword: "hashed_tx",
          locked: false,
          organizationId: null,
          defaultSchedule: expect.objectContaining({
            name: "default_schedule_name",
            availability: expect.any(Array),
          }),
        })
      );
    });

    test("should not pass defaultSchedule for platform managed users", async () => {
      mockUserRepository.createInTransaction.mockResolvedValue({ id: 1 });

      await service.createUserInTransaction(mockTxClient, {
        data: { ...mockUserData, isPlatformManaged: true, locked: false },
      });

      const callArgs = mockUserRepository.createInTransaction.mock.calls[0][1];
      expect(callArgs).toHaveProperty("isPlatformManaged", true);
      expect(callArgs).not.toHaveProperty("defaultSchedule");
    });

    test("should pass profile data when organizationId is provided", async () => {
      mockUserRepository.createInTransaction.mockResolvedValue({ id: 1 });

      await service.createUserInTransaction(mockTxClient, {
        data: { ...mockUserData, organizationId: 10, locked: false },
      });

      expect(mockUserRepository.createInTransaction).toHaveBeenCalledWith(
        mockTxClient,
        expect.objectContaining({
          profile: {
            username: "test",
            organizationId: 10,
            uid: "mock-profile-uid",
          },
        })
      );
    });

    test("should not call watchlist check", async () => {
      mockUserRepository.createInTransaction.mockResolvedValue({ id: 1 });

      await service.createUserInTransaction(mockTxClient, {
        data: { ...mockUserData, locked: false },
      });

      expect(checkIfEmailIsBlockedInWatchlistController).not.toHaveBeenCalled();
    });
  });

  describe("createManyUsers", () => {
    test("should slugify usernames for all users", async () => {
      mockUserRepository.createMany.mockResolvedValue({ count: 2 });

      await service.createManyUsers({
        data: [
          { ...mockUserData, username: "User One", locked: false },
          { ...mockUserData, email: "two@example.com", username: "User Two", locked: false },
        ],
        skipDuplicates: true,
      });

      expect(mockUserRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ username: "user-one" }),
          expect.objectContaining({ username: "user-two" }),
        ]),
        { skipDuplicates: true }
      );
    });

    test("should strip service-only fields from all entries", async () => {
      mockUserRepository.createMany.mockResolvedValue({ count: 1 });

      await service.createManyUsers({
        data: [
          {
            ...mockUserData,
            password: "shouldbestripped",
            locked: true,
            abuseScore: { score: 10, abuseData: {} },
          },
        ],
      });

      const callData = mockUserRepository.createMany.mock.calls[0][0][0];
      expect(callData).not.toHaveProperty("password");
      expect(callData).not.toHaveProperty("locked");
      expect(callData).not.toHaveProperty("abuseScore");
    });
  });
});
