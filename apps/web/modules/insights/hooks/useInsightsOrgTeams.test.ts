// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCtx, mockSession } = vi.hoisted(() => {
  return {
    mockCtx: {
      orgTeamsType: "yours" as string,
      setOrgTeamsType: (() => undefined) as ReturnType<typeof vi.fn>,
      setSelectedTeamId: (() => undefined) as ReturnType<typeof vi.fn>,
      selectedTeamId: undefined as number | undefined,
    },
    mockSession: {
      data: null as { user: { id: number; org?: { id: number; role: string } } } | null,
    },
  };
});

vi.mock("next-auth/react", () => ({
  useSession: () => mockSession,
}));

vi.mock("../components/context/InsightsOrgTeamsProvider", async () => {
  const React = await import("react");
  return {
    InsightsOrgTeamsContext: React.createContext(mockCtx),
  };
});

import { useInsightsOrgTeams } from "./useInsightsOrgTeams";

describe("useInsightsOrgTeams", () => {
  beforeEach(() => {
    mockCtx.orgTeamsType = "yours";
    mockCtx.selectedTeamId = undefined;
    mockCtx.setOrgTeamsType = vi.fn();
    mockCtx.setSelectedTeamId = vi.fn();
    mockSession.data = { user: { id: 1, org: { id: 100, role: "ADMIN" } } };
  });

  it("should return scope 'user' when orgTeamsType is 'yours'", () => {
    const { result } = renderHook(() => useInsightsOrgTeams());
    expect(result.current.scope).toBe("user");
    expect(result.current.userId).toBe(1);
    expect(result.current.teamId).toBeUndefined();
    expect(result.current.isAll).toBe(false);
  });

  it("should return scope 'org' and teamId as currentOrgId when orgTeamsType is 'org'", () => {
    mockCtx.orgTeamsType = "org";
    const { result } = renderHook(() => useInsightsOrgTeams());
    expect(result.current.scope).toBe("org");
    expect(result.current.isAll).toBe(true);
    expect(result.current.teamId).toBe(100);
    expect(result.current.userId).toBeUndefined();
  });

  it("should return scope 'team' and selectedTeamId when orgTeamsType is 'team'", () => {
    mockCtx.orgTeamsType = "team";
    mockCtx.selectedTeamId = 42;
    const { result } = renderHook(() => useInsightsOrgTeams());
    expect(result.current.scope).toBe("team");
    expect(result.current.teamId).toBe(42);
    expect(result.current.isAll).toBe(false);
    expect(result.current.userId).toBeUndefined();
  });

  it("should expose setOrgTeamsType and setSelectedTeamId from context", () => {
    const { result } = renderHook(() => useInsightsOrgTeams());
    expect(result.current.setOrgTeamsType).toBe(mockCtx.setOrgTeamsType);
    expect(result.current.setSelectedTeamId).toBe(mockCtx.setSelectedTeamId);
  });

  it("should return undefined userId when session has no user data and orgTeamsType is 'yours'", () => {
    mockSession.data = null;
    const { result } = renderHook(() => useInsightsOrgTeams());
    expect(result.current.userId).toBeUndefined();
  });
});
