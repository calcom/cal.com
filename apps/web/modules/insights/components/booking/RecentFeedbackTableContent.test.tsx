import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@calcom/lib/getAvatarUrl", () => ({
  getUserAvatarUrl: vi.fn(() => "https://example.com/avatar.png"),
}));

import { RecentFeedbackTableContent } from "./RecentFeedbackTableContent";

describe("RecentFeedbackTableContent", () => {
  it("should render user names and ratings", () => {
    const data = [
      {
        userId: 1,
        user: { name: "Alice Smith", id: 1, email: "alice@example.com", username: "alice", avatarUrl: "" },
        emailMd5: "abc123",
        rating: 5,
        feedback: "Excellent meeting!",
      },
      {
        userId: 2,
        user: { name: "Bob Jones", id: 2, email: "bob@example.com", username: "bob", avatarUrl: "" },
        emailMd5: "def456",
        rating: 3,
        feedback: "It was okay",
      },
    ];
    render(
      <TooltipProvider>
        <RecentFeedbackTableContent data={data} />
      </TooltipProvider>
    );
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should show empty screen when data is empty", () => {
    render(<RecentFeedbackTableContent data={[]} />);
    expect(screen.getByText("no_ratings")).toBeInTheDocument();
    expect(screen.getByText("no_ratings_description")).toBeInTheDocument();
  });

  it("should display feedback text with tooltip", () => {
    const data = [
      {
        userId: 1,
        user: { name: "Test User", id: 1, email: "test@example.com", username: "testuser", avatarUrl: "" },
        emailMd5: "abc123",
        rating: 4,
        feedback: "Very helpful session",
      },
    ];
    render(
      <TooltipProvider>
        <RecentFeedbackTableContent data={data} />
      </TooltipProvider>
    );
    expect(screen.getByText("Very helpful session")).toBeInTheDocument();
  });
});
