import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OAuthClientsSkeleton } from "./oauth-clients-skeleton";

describe("OAuthClientsSkeleton", () => {
  it("should render without crashing", () => {
    const { container } = render(<OAuthClientsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("should render skeleton elements", () => {
    const { container } = render(<OAuthClientsSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it("should render 3 skeleton client rows", () => {
    const { container } = render(<OAuthClientsSkeleton />);
    const rows = container.querySelectorAll('[data-slot="list-item"]');
    expect(rows.length).toBe(3);
  });
});
