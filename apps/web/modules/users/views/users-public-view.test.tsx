import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

import UserPage from "./users-public-view";

vi.mock("@calcom/lib/constants", async () => {
  return await vi.importActual("@calcom/lib/constants");
});

vi.mock("@calcom/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: vi.fn(),
}));

vi.mock("@calcom/lib/hooks/useRouterQuery", () => ({
  useRouterQuery: vi.fn(),
}));

function mockedUserPageComponentProps(props: Partial<React.ComponentProps<typeof UserPage>>) {
  return {
    themeBasis: "dark",
    safeBio: "My Bio",
    profile: {
      name: "John Doe",
      image: "john-profile-url",
      theme: "dark",
      brandColor: "red",
      darkBrandColor: "black",
      organization: {
        requestedSlug: "slug",
        slug: "slug",
        id: 1,
        brandColor: null,
        darkBrandColor: null,
        theme: null,
      },
      allowSEOIndexing: true,
      username: "john",
    },
    users: [
      {
        name: "John Doe",
        username: "john",
        avatarUrl: "john-user-url",
        bio: "",
        verified: false,
        profile: {
          upId: "1",
          id: 1,
          username: "john",
          organizationId: null,
          organization: null,
        },
      },
    ],
    markdownStrippedBio: "My Bio",
    entity: {
      considerUnpublished: false,
      ...(props.entity ?? null),
    },
    eventTypes: [],
    isOrgSEOIndexable: false,
  } satisfies React.ComponentProps<typeof UserPage>;
}

describe("UserPage Component", () => {
  it("should render with no throw", () => {
    const mockData = {
      props: mockedUserPageComponentProps({
        entity: {
          considerUnpublished: false,
          orgSlug: "org1",
        },
      }),
    };

    vi.mocked(getOrgFullOrigin).mockImplementation((orgSlug: string | null) => {
      return `${orgSlug}.cal.local`;
    });

    vi.mocked(useRouterQuery).mockReturnValue({
      uid: "uid",
    });

    expect(() => render(<UserPage {...mockData.props} />)).not.toThrow();
  });

  it("should clamp long bio text and show toggle button", () => {
    const longBio = "<p>" + "This is a very long bio text. ".repeat(20) + "</p>";
    const mockData = {
      props: mockedUserPageComponentProps({
        entity: {
          considerUnpublished: false,
          orgSlug: "org1",
        },
      }),
    };
    mockData.props.safeBio = longBio;
    mockData.props.users[0].bio = longBio;

    vi.mocked(getOrgFullOrigin).mockImplementation((orgSlug: string | null) => {
      return `${orgSlug}.cal.local`;
    });

    vi.mocked(useRouterQuery).mockReturnValue({
      uid: "uid",
    });

    render(<UserPage {...mockData.props} />);

    const bioText = screen.getByText(/This is a very long bio text/);
    expect(bioText).toBeInTheDocument();
    // The line-clamp-3 is on the container div wrapping the bio text
    expect(bioText.closest("div")).toHaveClass("line-clamp-3");
  });

  it("should not render bio section when bio is empty", () => {
    const mockData = {
      props: mockedUserPageComponentProps({
        entity: {
          considerUnpublished: false,
          orgSlug: "org1",
        },
      }),
    };
    mockData.props.safeBio = "";
    mockData.props.users[0].bio = "";

    vi.mocked(getOrgFullOrigin).mockImplementation((orgSlug: string | null) => {
      return `${orgSlug}.cal.local`;
    });

    vi.mocked(useRouterQuery).mockReturnValue({
      uid: "uid",
    });

    render(<UserPage {...mockData.props} />);

    const bioText = screen.queryByText("My Bio");
    expect(bioText).not.toBeInTheDocument();
  });
});
