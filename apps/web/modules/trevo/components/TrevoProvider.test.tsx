import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSession = vi.hoisted(() => vi.fn());
const mockInitTrevo = vi.hoisted(() => vi.fn());
const mockIdentifyTrevoUser = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ useSession: mockUseSession }));
vi.mock("../lib/trevo", () => ({
  initTrevo: mockInitTrevo,
  identifyTrevoUser: mockIdentifyTrevoUser,
}));

import { TrevoProvider } from "./TrevoProvider";

describe("TrevoProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders its children", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    const { getByText } = render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(getByText("child")).toBeTruthy();
  });

  it("initializes Trevo on mount", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(mockInitTrevo).toHaveBeenCalledTimes(1);
  });

  it("does not identify without a session", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(mockIdentifyTrevoUser).not.toHaveBeenCalled();
  });

  it("identifies the user once a session with a user id exists", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 42 } },
      status: "authenticated",
    });
    render(
      <TrevoProvider>
        <span>child</span>
      </TrevoProvider>
    );
    expect(mockIdentifyTrevoUser).toHaveBeenCalledWith("42");
  });
});
