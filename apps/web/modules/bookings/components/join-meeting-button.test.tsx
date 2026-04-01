"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseJoinableLocation = vi.fn();
vi.mock("./useJoinableLocation", () => ({
  useJoinableLocation: (...args: unknown[]) => mockUseJoinableLocation(...args),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

import { showToast } from "@calcom/ui/components/toast";
import { JoinMeetingButton } from "./JoinMeetingButton";

describe("JoinMeetingButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
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

  it("renders dropdown trigger when showCopyAction is true", () => {
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
        showCopyAction
      />
    );
    expect(screen.getByTestId("join-meeting-copy-dropdown")).toBeInTheDocument();
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
        showCopyAction
      />
    );

    // Open the dropdown
    await userEvent.click(screen.getByTestId("join-meeting-copy-dropdown"));

    // Click the copy option
    const copyButton = await screen.findByText("copy_to_clipboard");
    await userEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://meet.google.com/abc-def-ghi");
    expect(showToast).toHaveBeenCalledWith("link_copied", "success");
  });
});
