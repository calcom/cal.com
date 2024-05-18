import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { getOrgFullOrigin } from "@calcom/ee/organizations/lib/orgDomains";
import { trpc } from "@calcom/trpc/react";
import { HeadSeo } from "@calcom/ui";

import { BookerSeo } from "./BookerSeo";

// Mocking necessary modules and hooks
vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      public: {
        event: {
          useQuery: vi.fn(),
        },
      },
    },
  },
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/ee/organizations/lib/orgDomains", () => ({
  getOrgFullOrigin: vi.fn(),
}));

// Mock HeadSeo component
vi.mock("@calcom/ui", () => ({
  HeadSeo: vi.fn(),
}));

describe("BookerSeo Component", () => {
  it("renders SEO tags correctly for a regular event", () => {
    const mockData = {
      event: {
        profile: { name: "John Doe", image: "image-url" },
        title: "30min",
        hidden: false,
        users: [{ name: "Jane Doe", username: "jane" }],
      },
      fakeOrigin: "http://example.com",
    };

    trpc.viewer.public.event.useQuery.mockReturnValueOnce({
      data: mockData.event,
    });

    vi.mocked(getOrgFullOrigin).mockReturnValue(mockData.fakeOrigin);

    render(
      <BookerSeo
        username="john"
        eventSlug="event-slug"
        rescheduleUid={undefined}
        entity={{ fromRedirectOfNonOrgLink: false }}
      />
    );

    expect(HeadSeo).toHaveBeenCalledWith(
      {
        origin: mockData.fakeOrigin,
        isBrandingHidden: undefined,
        // Don't know why we are adding space in the beginning
        title: ` ${mockData.event.title} | ${mockData.event.profile.name}`,
        description: ` ${mockData.event.title}`,
        meeting: {
          profile: {
            name: mockData.event.profile.name,
            image: mockData.event.profile.image,
          },
          title: mockData.event.title,
          users: [
            {
              name: mockData.event.users[0].name,
              username: mockData.event.users[0].username,
            },
          ],
        },
        nextSeoProps: {
          nofollow: true,
          noindex: true,
        },
      },
      {}
    );
  });
});
