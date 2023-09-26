/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import { AvatarGroup } from "./AvatarGroup";

describe("Tests for AvatarGroup component", () => {
  const IMAGE_ALT_TEXT = "Fake Avatar";
  const DELAY = 300;
  let image: HTMLElement | null = null;
  const orignalGlobalImage = window.Image;

  beforeAll(() => {
    (window.Image as unknown) = class MockImage {
      onload: () => void = () => undefined;
      src = "";
      constructor() {
        setTimeout(() => {
          this.onload();
        }, DELAY);
        return this;
      }
    };
  });

  afterAll(() => {
    window.Image = orignalGlobalImage;
  });

  test("should render AvatarGroup", async () => {
    render(
      <AvatarGroup
        size="sm"
        items={[
          {
            image: "/test.jpg",
            alt: IMAGE_ALT_TEXT,
            title: "test",
            href: "https://cal.com/stakeholder/peer.jpg",
          },
          {
            image: "pic.jpg",
          },
          {
            image: "sample.jpg",
          },
        ]}
        truncateAfter={1}
      />
    );
    image = await screen.findByRole("img");
    expect(image).toBeInTheDocument();
    expect(screen.getByTestId("truncated-avatars")).toBeInTheDocument();
  });
});
