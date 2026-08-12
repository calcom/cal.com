import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BookerReputation } from "@calcom/lib/bookerReputation";

import { ReputationBadge } from "./ReputationBadge";

// Mock useLocale so the badge renders the i18n KEY as its text (no i18n provider
// needed in the unit test). The real component uses @calcom/lib/hooks/useLocale.
vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, i18n: { language: "en" }, isLocaleReady: true }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ReputationBadge", () => {
  it("renders nothing when reputation is null (empty attendees)", () => {
    const { container } = render(<ReputationBadge reputation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the gray 'new_booker' band with no score when score is null (below min samples)", () => {
    const reputation: BookerReputation = {
      score: null,
      noShowCount: 0,
      totalCount: 2,
      isSuspiciousEmail: false,
    };
    render(<ReputationBadge reputation={reputation} />);
    const badge = screen.getByTestId("booker-reputation-badge-new");
    expect(badge).toHaveTextContent("new_booker");
    expect(screen.queryByTestId("booker-reputation-score")).toBeNull();
  });

  it("renders the green 'reliable' band with the numeric score", () => {
    const reputation: BookerReputation = {
      score: 90,
      noShowCount: 1,
      totalCount: 10,
      isSuspiciousEmail: false,
    };
    render(<ReputationBadge reputation={reputation} />);
    const badge = screen.getByTestId("booker-reputation-badge-reliable");
    expect(badge).toHaveTextContent("reliable");
    expect(screen.getByTestId("booker-reputation-score")).toHaveTextContent("· 90");
  });

  it("renders the orange 'occasional' band at the band boundary (score 70)", () => {
    const reputation: BookerReputation = {
      score: 70,
      noShowCount: 3,
      totalCount: 10,
      isSuspiciousEmail: false,
    };
    render(<ReputationBadge reputation={reputation} />);
    const badge = screen.getByTestId("booker-reputation-badge-occasional");
    expect(badge).toHaveTextContent("occasional_no_show");
    expect(screen.getByTestId("booker-reputation-score")).toHaveTextContent("· 70");
  });

  it("renders the red 'frequent' band below the occasional threshold", () => {
    const reputation: BookerReputation = {
      score: 50,
      noShowCount: 5,
      totalCount: 10,
      isSuspiciousEmail: false,
    };
    render(<ReputationBadge reputation={reputation} />);
    const badge = screen.getByTestId("booker-reputation-badge-frequent");
    expect(badge).toHaveTextContent("frequent_no_show");
    expect(screen.getByTestId("booker-reputation-score")).toHaveTextContent("· 50");
  });

  it("renders the green 'reliable' band exactly at RELIABLE_THRESHOLD (85)", () => {
    const reputation: BookerReputation = {
      score: 85,
      noShowCount: 3,
      totalCount: 20,
      isSuspiciousEmail: false,
    };
    render(<ReputationBadge reputation={reputation} />);
    expect(screen.getByTestId("booker-reputation-badge-reliable")).toBeInTheDocument();
  });
});