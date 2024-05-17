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
  it.only("renders SEO tags correctly for a regular event", () => {
    const event = {
      profile: { name: "John Doe", image: "image-url" },
      title: "30min",
      hidden: false,
      users: [{ name: "Jane Doe", username: "jane" }],
    };
    trpc.viewer.public.event.useQuery.mockReturnValueOnce({
      data: event,
    });
    const fakeOrigin = "http://example.com";

    vi.mocked(getOrgFullOrigin).mockReturnValue(fakeOrigin);

    const { getByText, container } = render(
      <BookerSeo
        username="john"
        eventSlug="event-slug"
        rescheduleUid={undefined}
        entity={{ fromRedirectOfNonOrgLink: false }}
      />
    );

    expect(HeadSeo).toHaveBeenCalledWith(
      {
        origin: fakeOrigin,
        isBrandingHidden: undefined,
        title: ` ${event.title} | ${event.profile.name}`,
        description: ` ${event.title}`,
        meeting: {
          profile: {
            name: event.profile.name,
            image: event.profile.image,
          },
          title: event.title,
          users: [
            {
              name: event.users[0].name,
              username: event.users[0].username,
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
