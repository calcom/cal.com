import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { UserStatsTable } from "./UserStatsTable";

vi.mock("@calcom/lib/getAvatarUrl", () => ({
  getUserAvatarUrl: vi.fn(() => "https://example.com/avatar.png"),
}));

describe("UserStatsTable", () => {
  const mockData = [
    {
      userId: 1,
      user: { id: 1, username: "alice", name: "Alice Smith", email: "alice@test.com", avatarUrl: "" },
      emailMd5: "abc",
      count: 42,
    },
    {
      userId: 2,
      user: { id: 2, username: "bob", name: "Bob Jones", email: "bob@test.com", avatarUrl: "" },
      emailMd5: "def",
      count: 18,
    },
  ];

  it("should render user names and counts", () => {
    render(<UserStatsTable data={mockData} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("should show empty state when data is empty", () => {
    render(<UserStatsTable data={[]} />);
    expect(screen.getByText("no_data_yet")).toBeInTheDocument();
  });

  it("should filter out items without user data", () => {
    const dataWithNull = [
      ...mockData,
      { userId: 3, user: null, emailMd5: "ghi", count: 5 },
    ];
    render(<UserStatsTable data={dataWithNull as never} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("should format decimal counts with one decimal place", () => {
    const decimalData = [
      {
        userId: 1,
        user: { id: 1, username: "alice", name: "Alice", email: "a@t.com", avatarUrl: "" },
        emailMd5: "abc",
        count: 4.567,
      },
    ];
    render(<UserStatsTable data={decimalData} />);
    expect(screen.getByText("4.6")).toBeInTheDocument();
  });
});
