import { render, waitFor } from "@testing-library/react";
import type { NextSeoProps } from "next-seo";
import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";
import { vi } from "vitest";

import type { HeadSeoProps } from "./HeadSeo";
import HeadSeo from "./HeadSeo";

vi.mock("next-seo", () => {
  return {
    NextSeo: (props: NextSeoProps) => {
      const { images, ...restOpenGraph } = props.openGraph as OpenGraph & { images: Array<{ url: string }> };
      const mockedProps = {
        ...restOpenGraph,
        canonical: props.canonical,
        image: images[0].url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
      return <title {...mockedProps} />;
    },
  };
});

vi.mock("@calcom/lib/OgImages", async () => {
  return {
    constructAppImage() {
      return "constructAppImage";
    },
    constructGenericImage() {
      return "constructGenericImage";
    },
    constructMeetingImage() {
      return "constructMeetingImage";
    },
  };
});

const basicProps = {
  image: "image.png",
  siteName: "calcomsite",
  url: "calcom.com",
  canonical: "test canonical",
  title: "Test Title",
  description: "Test Description",
};

describe("Tests for HeadSeo component", () => {
  test("Should render mocked NextSeo", async () => {
    const { container } = render(<HeadSeo {...basicProps} />);
    await waitFor(async () => {
      const titleEl = container.querySelector("title");
      expect(titleEl?.getAttribute("canonical")).toEqual(basicProps.canonical);
      expect(titleEl?.getAttribute("description")).toEqual(basicProps.description);
      expect(titleEl?.getAttribute("site_name")).toEqual(basicProps.siteName);
      expect(titleEl?.getAttribute("image")).toContain("constructGenericImage");
    });
  });

  test("Should render title with brand", async () => {
    const { container } = render(<HeadSeo {...basicProps} />);
    await waitFor(async () => {
      const titleEl = container.querySelector("title");
      expect(titleEl?.getAttribute("title")).toEqual(`${basicProps.title} | Cal.com`);
    });
  });

  test("Should render title without brand", async () => {
    const { container } = render(<HeadSeo {...basicProps} isBrandingHidden />);
    await waitFor(async () => {
      const titleEl = container.querySelector("title");
      expect(titleEl?.getAttribute("title")).toEqual(`${basicProps.title}`);
    });
  });

  test("Should render with app props", async () => {
    const { container } = render(<HeadSeo {...basicProps} app={{} as HeadSeoProps["app"]} />);
    await waitFor(async () => {
      const titleEl = container.querySelector("title");
      expect(titleEl?.getAttribute("image")).toContain("constructAppImage");
    });
  });

  test("Should render with meeting props", async () => {
    const { container } = render(<HeadSeo {...basicProps} meeting={{} as HeadSeoProps["meeting"]} />);
    await waitFor(async () => {
      const titleEl = container.querySelector("title");
      expect(titleEl?.getAttribute("image")).toContain("constructMeetingImage");
    });
  });
});
