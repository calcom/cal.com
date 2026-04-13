import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OAuthClientsAdminSkeleton } from "./oauth-clients-admin-skeleton";

describe("OAuthClientsAdminSkeleton", () => {
  it("should render without crashing", () => {
    const { container } = render(<OAuthClientsAdminSkeleton />);
    expect(container.querySelector("[data-slot='skeleton']")).toBeTruthy();
  });

  it("should render skeleton list items", () => {
    const { container } = render(<OAuthClientsAdminSkeleton />);
    const listItems = container.querySelectorAll("[data-slot='list-item']");
    expect(listItems.length).toBe(5);
  });

  it("should render a card container", () => {
    const { container } = render(<OAuthClientsAdminSkeleton />);
    expect(container.querySelector("[data-slot='card']")).toBeTruthy();
  });
});
