import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppListCard } from "./AppListCard";

vi.mock("@calcom/lib/defaultAvatarImage", () => ({
  getPlaceholderAvatar: (avatar: string | undefined, name: string) => avatar || `/placeholder/${name}`,
}));

describe("AppListCard", () => {
  const defaultProps = {
    title: "Google Calendar",
    description: "Sync your events with Google Calendar",
  };

  it("renders title", () => {
    render(<AppListCard {...defaultProps} />);
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<AppListCard {...defaultProps} />);
    expect(screen.getByText("Sync your events with Google Calendar")).toBeInTheDocument();
  });

  it("renders logo when provided", () => {
    render(<AppListCard {...defaultProps} logo="/google-calendar.png" />);
    const img = screen.getByAltText("Google Calendar logo");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/google-calendar.png");
  });

  it("does not render logo when not provided", () => {
    render(<AppListCard {...defaultProps} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders default badge when isDefault is true", () => {
    render(<AppListCard {...defaultProps} isDefault />);
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("renders template badge when isTemplate is true", () => {
    render(<AppListCard {...defaultProps} isTemplate />);
    expect(screen.getByText("Template")).toBeInTheDocument();
  });

  it("renders invalid credential warning", () => {
    render(<AppListCard {...defaultProps} invalidCredential />);
    expect(screen.getByText("invalid_credential")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(<AppListCard {...defaultProps} actions={<button>Configure</button>} />);
    expect(screen.getByText("Configure")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <AppListCard {...defaultProps}>
        <div>Child content</div>
      </AppListCard>
    );
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("applies highlight class when highlight is true", () => {
    const { container } = render(<AppListCard {...defaultProps} highlight />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("bg-yellow-100");
  });

  it("applies custom className", () => {
    const { container } = render(<AppListCard {...defaultProps} className="custom-card" />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("custom-card");
  });
});
