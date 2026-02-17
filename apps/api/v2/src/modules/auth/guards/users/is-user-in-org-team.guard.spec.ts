import { createMock } from "@golevelup/ts-jest";
import { BadRequestException, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { IsUserInOrgTeam } from "./is-user-in-org-team.guard";

const mockFindOrgTeamUser = jest.fn();

jest.mock("@/modules/organizations/index/organizations.repository", () => ({
  OrganizationsRepository: jest.fn().mockImplementation(() => ({
    findOrgTeamUser: mockFindOrgTeamUser,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OrganizationsRepository } = require("@/modules/organizations/index/organizations.repository");

describe("IsUserInOrgTeam", () => {
  let guard: IsUserInOrgTeam;

  beforeEach(() => {
    mockFindOrgTeamUser.mockReset();
    guard = new IsUserInOrgTeam(new OrganizationsRepository());
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should throw BadRequestException for non-numeric userId", async () => {
    const mockContext = createMockExecutionContext({
      orgId: "132913",
      teamId: "1",
      userId: "[object Object]",
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - Invalid userId: '[object Object]' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for non-numeric orgId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "abc", teamId: "1", userId: "123" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - Invalid orgId: 'abc' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for non-numeric teamId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", teamId: "xyz", userId: "123" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - Invalid teamId: 'xyz' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for zero userId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", teamId: "1", userId: "0" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - Invalid userId: '0' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw BadRequestException for negative teamId", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", teamId: "-5", userId: "123" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(BadRequestException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - Invalid teamId: '-5' is not a valid number. Please provide a number that is larger than 0."
    );
  });

  it("should throw ForbiddenException when userId is missing", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", teamId: "1" });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - No user id found in request params."
    );
  });

  it("should throw ForbiddenException when user is not in org team", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", teamId: "1", userId: "999" });
    mockFindOrgTeamUser.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      "IsUserInOrgTeam - user with id=(999) is not part of the team with id=(1) in the organization with id=(132913)"
    );
  });

  it("should return true when user is in org team", async () => {
    const mockContext = createMockExecutionContext({ orgId: "132913", teamId: "1", userId: "42" });
    mockFindOrgTeamUser.mockResolvedValue({ id: 42 });

    await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    expect(mockFindOrgTeamUser).toHaveBeenCalledWith(132913, 1, 42);
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
