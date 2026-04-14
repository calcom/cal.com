"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseJoinableLocation = vi.fn();
vi.mock("./useJoinableLocation", () => ({
  useJoinableLocation: (...args: unknown[]) => mockUseJoinableLocation(...args),
}));

const mockCopyToClipboard = vi.fn();
vi.mock("@calcom/lib/hooks/useCopy", () => ({
  useCopy: () => ({
    isCopied: false,
    copyToClipboard: mockCopyToClipboard,
    resetCopyStatus: vi.fn(),
    fetchAndCopyToClipboard: vi.fn(),
  }),
}));

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

vi.mock("@calcom/ui/components/tooltip", () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="tooltip-wrapper" data-tooltip-content={String(content)}>
      {children}
    </div>
  ),
}));

import React from "react";
import { JoinMeetingButton } from "./JoinMeetingButton";

describe("JoinMeetingButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when location is not joinable", () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: false,
      locationToDisplay: null,
      provider: null,
      isLocationURL: false,
    });

    const { container } = render(
      <JoinMeetingButton location={null} metadata={null} bookingStatus="ACCEPTED" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders join button when location is joinable", () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: true,
      locationToDisplay: "https://meet.google.com/abc-def-ghi",
      provider: { label: "Google Meet", iconUrl: "/icon.png" },
      isLocationURL: true,
    });

    render(
      <JoinMeetingButton
        location="https://meet.google.com/abc-def-ghi"
        metadata={null}
        bookingStatus="ACCEPTED"
      />
    );
    expect(screen.getByText("join_event_location")).toBeInTheDocument();
  });

  it("does not render dropdown when showCopyAction is false", () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: true,
      locationToDisplay: "https://meet.google.com/abc-def-ghi",
      provider: { label: "Google Meet", iconUrl: "/icon.png" },
      isLocationURL: true,
    });

    render(
      <JoinMeetingButton
        location="https://meet.google.com/abc-def-ghi"
        metadata={null}
        bookingStatus="ACCEPTED"
        showCopyAction={false}
      />
    );
    expect(screen.queryByTestId("join-meeting-copy-dropdown")).not.toBeInTheDocument();
  });

  it("renders dropdown trigger by default", () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: true,
      locationToDisplay: "https://meet.google.com/abc-def-ghi",
      provider: { label: "Google Meet", iconUrl: "/icon.png" },
      isLocationURL: true,
    });

    render(
      <JoinMeetingButton
        location="https://meet.google.com/abc-def-ghi"
        metadata={null}
        bookingStatus="ACCEPTED"
      />
    );
    expect(screen.getByTestId("join-meeting-copy-dropdown")).toBeInTheDocument();
  });

  it("wraps only the join button in tooltip, not the chevron dropdown", () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: true,
      locationToDisplay: "https://meet.google.com/abc-def-ghi",
      provider: { label: "Google Meet", iconUrl: "/icon.png" },
      isLocationURL: true,
    });

    render(
      <JoinMeetingButton
        location="https://meet.google.com/abc-def-ghi"
        metadata={null}
        bookingStatus="ACCEPTED"
        tooltip="Join shortcut"
      />
    );

    const tooltipWrapper = screen.getByTestId("tooltip-wrapper");
    // The tooltip should wrap the join button
    expect(tooltipWrapper).toBeInTheDocument();
    expect(tooltipWrapper.querySelector("a")).toHaveTextContent("join_event_location");
    // The chevron dropdown should NOT be inside the tooltip wrapper
    expect(tooltipWrapper.querySelector('[data-testid="join-meeting-copy-dropdown"]')).not.toBeInTheDocument();
  });

  it("renders without tooltip when tooltip prop is not provided", () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: true,
      locationToDisplay: "https://meet.google.com/abc-def-ghi",
      provider: { label: "Google Meet", iconUrl: "/icon.png" },
      isLocationURL: true,
    });

    render(
      <JoinMeetingButton
        location="https://meet.google.com/abc-def-ghi"
        metadata={null}
        bookingStatus="ACCEPTED"
      />
    );

    expect(screen.queryByTestId("tooltip-wrapper")).not.toBeInTheDocument();
  });

  it("copies meeting link to clipboard when copy action is clicked", async () => {
    mockUseJoinableLocation.mockReturnValue({
      isJoinable: true,
      locationToDisplay: "https://meet.google.com/abc-def-ghi",
      provider: { label: "Google Meet", iconUrl: "/icon.png" },
      isLocationURL: true,
    });

    render(
      <JoinMeetingButton
        location="https://meet.google.com/abc-def-ghi"
        metadata={null}
        bookingStatus="ACCEPTED"
      />
    );

    // Open the dropdown
    await userEvent.click(screen.getByTestId("join-meeting-copy-dropdown"));

    // Click the copy option
    const copyButton = await screen.findByText("copy_to_clipboard");
    await userEvent.click(copyButton);

    expect(mockCopyToClipboard).toHaveBeenCalledWith("https://meet.google.com/abc-def-ghi", {
      onSuccess: expect.any(Function),
    });
  });
});
