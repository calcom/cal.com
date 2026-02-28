import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnpublishedEntity } from "./UnpublishedEntity";

vi.mock("@calcom/lib/defaultAvatarImage", () => ({
  getPlaceholderAvatar: (avatar: string | undefined | null, name: string | undefined | null) =>
    avatar || `/placeholder/${name}`,
}));

describe("UnpublishedEntity", () => {
  it("renders with team slug", () => {
    render(<UnpublishedEntity teamSlug="my-team" name="My Team" />);
    expect(screen.getByText("team_is_unpublished")).toBeInTheDocument();
  });

  it("renders team description for team slug", () => {
    render(<UnpublishedEntity teamSlug="my-team" name="My Team" />);
    expect(screen.getByText("team_is_unpublished_description")).toBeInTheDocument();
  });

  it("renders org description for org slug", () => {
    render(<UnpublishedEntity orgSlug="my-org" name="My Org" />);
    expect(screen.getByText("org_is_unpublished_description")).toBeInTheDocument();
  });

  it("renders the entity name in headline", () => {
    render(<UnpublishedEntity teamSlug="team" name="Cool Team" />);
    expect(screen.getByText("team_is_unpublished")).toBeInTheDocument();
  });

  it("renders an avatar element", () => {
    const { container } = render(<UnpublishedEntity teamSlug="team" name="Team" />);
    const avatar = container.querySelector("[data-testid='empty-screen']");
    expect(avatar).toBeInTheDocument();
  });
});
