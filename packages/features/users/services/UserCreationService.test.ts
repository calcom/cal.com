import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { hashPassword } from "@calcom/lib/auth/hashPassword";
import { CreationSource } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { UserCreationService } from "./UserCreationService";

vi.mock("@calcom/lib/auth/hashPassword", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller", () => ({
  checkIfEmailIsBlockedInWatchlistController: vi.fn().mockResolvedValue(false),
}));

const mockUserRepository = {
  create: vi.fn(),
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
});
