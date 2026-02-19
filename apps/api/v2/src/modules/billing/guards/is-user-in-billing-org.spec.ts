import { createMock } from "@golevelup/ts-jest";
import { BadRequestException, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { IsUserInBillingOrg } from "./is-user-in-billing-org";

const mockFindOrgUser = jest.fn();

jest.mock("@/modules/organizations/index/organizations.repository", () => ({
  OrganizationsRepository: jest.fn().mockImplementation(() => ({
    findOrgUser: mockFindOrgUser,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OrganizationsRepository } = require("@/modules/organizations/index/organizations.repository");

describe("IsUserInBillingOrg", () => {
  let guard: IsUserInBillingOrg;

  beforeEach(() => {
    mockFindOrgUser.mockReset();
    guard = new IsUserInBillingOrg(new OrganizationsRepository());
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should throw BadRequestException for non-numeric teamId like 'undefined'", async () => {
    const mockContext = createMockExecutionContext({ teamId: "undefined" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - Invalid teamId: 'undefined' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for non-numeric teamId like 'abc'", async () => {
    const mockContext = createMockExecutionContext({ teamId: "abc" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - Invalid teamId: 'abc' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for float teamId", async () => {
    const mockContext = createMockExecutionContext({ teamId: "1.5" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - Invalid teamId: '1.5' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for zero teamId", async () => {
    const mockContext = createMockExecutionContext({ teamId: "0" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - Invalid teamId: '0' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for negative teamId", async () => {
    const mockContext = createMockExecutionContext({ teamId: "-1" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - Invalid teamId: '-1' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw ForbiddenException when userId is missing", async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { teamId: "123" },
          user: {},
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow("IsUserInBillingOrg - No user id found.");
  });

  it("should throw ForbiddenException when teamId is missing", async () => {
    const mockContext = createMockExecutionContext({});

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - No org id found in request params."
    );
  });

  it("should throw ForbiddenException when user is not in org", async () => {
    const mockContext = createMockExecutionContext({ teamId: "100" });
    mockFindOrgUser.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInBillingOrg - user with id=42 is not part of the organization with id=100."
    );
  });

  it("should return true when user is in org", async () => {
    const mockContext = createMockExecutionContext({ teamId: "100" });
    mockFindOrgUser.mockResolvedValue({ id: 42 });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    expect(mockFindOrgUser).toHaveBeenCalledWith(100, 42);
  });

  function createMockExecutionContext(
    params: Record<string, string>,
    userId: number | undefined = 42
  ): ExecutionContext {
    return createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          user: { id: userId },
        }),
      }),
    });
  }
});
