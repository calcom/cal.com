import { createMock } from "@golevelup/ts-jest";
import { BadRequestException, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { IsUserInOrg } from "./is-user-in-org.guard";

const mockFindOrgUser = jest.fn();

jest.mock("@/modules/organizations/index/organizations.repository", () => ({
  OrganizationsRepository: jest.fn().mockImplementation(() => ({
    findOrgUser: mockFindOrgUser,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OrganizationsRepository } = require("@/modules/organizations/index/organizations.repository");

describe("IsUserInOrg", () => {
  let guard: IsUserInOrg;

  beforeEach(() => {
    mockFindOrgUser.mockReset();
    guard = new IsUserInOrg(new OrganizationsRepository());
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should throw BadRequestException for non-numeric userId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", userId: "[object Object]" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - Invalid userId: '[object Object]' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for non-numeric orgId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "abc", userId: "123" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - Invalid orgId: 'abc' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for float userId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", userId: "1.5" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - Invalid userId: '1.5' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for zero userId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", userId: "0" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - Invalid userId: '0' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for negative userId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", userId: "-1" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - Invalid userId: '-1' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw ForbiddenException when userId is missing", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - No user id found in request params."
    );
  });

  it("should throw ForbiddenException when user is not in org", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", userId: "999" });
    mockFindOrgUser.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrg - user with id=999 is not part of the organization with id=132913."
    );
  });

  it("should return true when user is in org", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", userId: "42" });
    mockFindOrgUser.mockResolvedValue({ id: 42 });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    expect(mockFindOrgUser).toHaveBeenCalledWith(132913, 42);
  });

  function createMockExecutionContext(params: Record<string, string>): ExecutionContext {
    return createMock<ExecutionContext>({
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          user: {},
        }),
      }),
    });
  }
});
