import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { HeadSeo } from "@calcom/ui";

import UserPage from "./users-public-view";

describe("UserPage Component", () => {
  it("renders HeadSeo correctly", () => {
    const mockData = {
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
      hidden: false,
      users: [
        {
          name: "John Doe",
          username: "john",
          avatarUrl: "john-user-url",
          bio: "",
          verified: false,
          profile: {},
        },
      ],
      fakeOrigin: "http://example.com",
      markdownStrippedBio: "My Bio",
      entity: {
        considerUnpublished: false,
        orgSlug: "org1",
        name: "Org1",
        logoUrl: "Org1-logo",
      },
    };

    vi.mocked(getOrgFullOrigin).mockReturnValue(mockData.fakeOrigin);

    render(
      <UserPage
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        users={mockData.users}
        profile={mockData.profile}
        eventTypes={[]}
        markdownStrippedBio={mockData.markdownStrippedBio}
        entity={mockData.entity}
      />
    );

    expect(HeadSeo).toHaveBeenCalledWith(
      {
        origin: mockData.fakeOrigin,
        title: `${mockData.profile.name}`,
        description: `${mockData.markdownStrippedBio}`,
        meeting: {
          profile: {
            name: mockData.profile.name,
            image: mockData.users[0].avatarUrl,
          },
          title: mockData.markdownStrippedBio,
          users: [
            {
              name: mockData.users[0].name,
              username: mockData.users[0].username,
            },
          ],
        },
        nextSeoProps: {
          nofollow: !mockData.profile.allowSEOIndexing,
          noindex: !mockData.profile.allowSEOIndexing,
        },
      },
      {}
    );
  });
});
