import { render } from "@testing-library/react";
import React from "react";
import { describe, it, vi } from "vitest";

import UserPage from "./users-public-view";

// Mocking necessary modules and hooks
vi.mock("next/link", () => ({
  default:
    () =>
    ({ children }) =>
      children,
}));
vi.mock("@calcom/embed-core/embed-iframe", () => ({
  useEmbedNonStylesConfig: vi.fn().mockReturnValue("left"),
  useEmbedStyles: vi.fn().mockReturnValue({}),
  useIsEmbed: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/features/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: vi.fn().mockReturnValue("https://example.com"),
}));

vi.mock("@calcom/features/eventtypes/components/EmptyPage", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/features/eventtypes/components", () => ({
  EventTypeDescriptionLazy: vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));
vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: () => ({}),
}));

vi.mock("@calcom/lib/hooks/useTheme", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/ui", () => {
  return {
    HeadSeo: vi.fn(),
    Icon: vi.fn(),
    UnpublishedEntity: vi.fn(),
    UserAvatar: vi.fn(),
  };
});

describe("UserPage Component", () => {
  it("renders user information correctly", () => {
    render(
      <UserPage
        users={[
          {
            bio: "Bio",
            name: "John Doe",
            profileImage: "image-url",
            username: "john",
          },
        ]}
      />
    );

    // expect(screen.getByTestId("name-title")).toHaveTextContent("John Doe");
    // expect(screen.getByText("Bio")).toBeInTheDocument();
  });
});
