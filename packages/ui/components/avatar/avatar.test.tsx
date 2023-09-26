/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import { Avatar } from "./Avatar";

describe("Tests for Avatar", () => {
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

  it("should not render the image initially", () => {
    render(<Avatar imageSrc="/test.jpg" alt={IMAGE_ALT_TEXT} />);
    image = screen.queryByRole("img");
    expect(image).not.toBeInTheDocument();
  });

  it("should render the image after it has loaded", async () => {
    render(<Avatar imageSrc="/test.jpg" alt={IMAGE_ALT_TEXT} />);
    image = await screen.findByRole("img");
    expect(image).toBeInTheDocument();
  });

  it("should have alt text on the image", async () => {
    render(<Avatar imageSrc="/test.jpg" alt={IMAGE_ALT_TEXT} />);
    image = await screen.findByAltText(IMAGE_ALT_TEXT);
    expect(image).toBeInTheDocument();
  });

  it("should render a link with avatar", async () => {
    await render(
      <Avatar imageSrc="/test.jpg" alt={IMAGE_ALT_TEXT} href="https://cal.com/stakeholder/peer.jpg" />
    );
    expect(screen.getByTestId("avatar-link")).toBeInTheDocument();
  });
});
