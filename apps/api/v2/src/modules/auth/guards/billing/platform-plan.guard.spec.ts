import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { createMock } from "@golevelup/ts-jest";
import { ForbiddenException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

describe("PlatformPlanGuard", () => {
  let guard: PlatformPlanGuard;
  let reflector: Reflector;
  let organizationsRepository: OrganizationsRepository;
  let redisService: RedisService;

  const mockContext = createMockExecutionContext({
    params: { teamId: "1", orgId: "1" },
    user: { id: "1" },
  });

  beforeEach(async () => {
    reflector = new Reflector();
    organizationsRepository = createMock<OrganizationsRepository>();
    redisService = createMock<RedisService>({
      redis: {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(null),
      },
    });
    guard = new PlatformPlanGuard(reflector, organizationsRepository, redisService);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should return true", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("ESSENTIALS");
    jest.spyOn(organizationsRepository, "findByIdIncludeBilling").mockResolvedValue({
      isPlatform: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      platformBilling: {
        subscriptionId: "sub_123",
        plan: "SCALE",
      },
    });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
  });

  it("should throw ForbiddenException if the organization does not exist", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("ESSENTIALS");
    jest.spyOn(organizationsRepository, "findByIdIncludeBilling").mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it("should return true if the organization is not platform", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("ESSENTIALS");
    jest.spyOn(organizationsRepository, "findByIdIncludeBilling").mockResolvedValue({
      isPlatform: false,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      platformBilling: undefined,
    });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
  });

  it("should throw ForbiddenException if the organization has no subscription", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("ESSENTIALS");
    jest.spyOn(organizationsRepository, "findByIdIncludeBilling").mockResolvedValue({
      isPlatform: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      platformBilling: {
        subscriptionId: null,
        plan: "STARTER",
      },
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it("should throw ForbiddenException if the user has a lower plan than required", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("ESSENTIALS");
    jest.spyOn(organizationsRepository, "findByIdIncludeBilling").mockResolvedValue({
      isPlatform: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      platformBilling: {
        subscriptionId: "sub_123",
        plan: "STARTER",
      },
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it("should return true if the result is cached in Redis", async () => {
    jest.spyOn(reflector, "get").mockReturnValue("ESSENTIALS");
    jest.spyOn(redisService.redis, "get").mockResolvedValue(JSON.stringify(true));

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
  });

  function createMockExecutionContext(context: Record<string, string | object>): ExecutionContext {
    return createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          params: context.params,
          user: context.user,
        }),
      }),
    });
  }
});
