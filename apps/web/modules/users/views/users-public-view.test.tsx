import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

import UserPage from "./users-public-view";

function mockedUserPageComponentProps(props: Partial<React.ComponentProps<typeof UserPage>>) {
  return {
    trpcState: {
      mutations: [],
      queries: [],
    },
    themeBasis: "dark",
    safeBio: "My Bio",
    profile: {
      name: "John Doe",
      image: "john-profile-url",
      theme: "dark",
      brandColor: "red",
      darkBrandColor: "black",
      organization: { requestedSlug: "slug", slug: "slug", id: 1 },
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
  it("should render HeadSeo with correct props", () => {
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

    render(<UserPage {...mockData.props} />);
  });
});
