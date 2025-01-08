import { render, waitFor } from "@testing-library/react";
import type { NextSeoProps } from "next-seo";
import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";
import { usePathname } from "next/navigation";
import { vi } from "vitest";

import { CAL_URL } from "@calcom/lib/constants";

import type { HeadSeoProps } from "./HeadSeo";
import HeadSeo from "./HeadSeo";

vi.mock("next/navigation", () => {
  return {
    usePathname: vi.fn(),
  };
});
vi.mock("@calcom/lib/constants", () => {
  return {
    SEO_IMG_DEFAULT: "",
    SEO_IMG_OGIMG: "",
    APP_NAME: "Cal.com",
    CAL_URL: "http://cal.com",
  };
});
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
      return <div id="mocked-next-seo" {...mockedProps} />;
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
      const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
      expect(mockedNextSeoEl?.getAttribute("canonical")).toEqual(basicProps.canonical);
      expect(mockedNextSeoEl?.getAttribute("description")).toEqual(basicProps.description);
      expect(mockedNextSeoEl?.getAttribute("site_name")).toEqual(basicProps.siteName);
      expect(mockedNextSeoEl?.getAttribute("image")).toContain("constructGenericImage");
    });
  });

  describe("Canonical Url", () => {
    test("Should provide `canonical` prop to NextSeo derived from `origin` prop if provided", async () => {
      const props = {
        title: "Test Title",
        description: "Test Description",
        origin: "http://acme.cal.local",
        siteName: "Cal.com",
      };
      vi.mocked(usePathname).mockReturnValue("/mocked-path");
      const { container } = render(<HeadSeo {...props} />);
      await waitFor(async () => {
        const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
        expect(mockedNextSeoEl?.getAttribute("canonical")).toEqual(`${props.origin}/mocked-path`);
        expect(mockedNextSeoEl?.getAttribute("description")).toEqual(props.description);
        expect(mockedNextSeoEl?.getAttribute("site_name")).toEqual(props.siteName);
        expect(mockedNextSeoEl?.getAttribute("image")).toContain("constructGenericImage");
      });
    });
    test("Should provide `canonical` prop to NextSeo derived from `CAL_URL` prop if origin not provided", async () => {
      const props = {
        title: "Test Title",
        description: "Test Description",
        siteName: "Cal.com",
      };
      vi.mocked(usePathname).mockReturnValue("/mocked-path");
      const { container } = render(<HeadSeo {...props} />);
      await waitFor(async () => {
        const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
        expect(mockedNextSeoEl?.getAttribute("canonical")).toEqual(`${CAL_URL}/mocked-path`);
        expect(mockedNextSeoEl?.getAttribute("description")).toEqual(props.description);
        expect(mockedNextSeoEl?.getAttribute("site_name")).toEqual(props.siteName);
        expect(mockedNextSeoEl?.getAttribute("image")).toContain("constructGenericImage");
      });
    });
    test("Should provide `canonical` prop to NextSeo from canonical prop if provided", async () => {
      const props = {
        title: "Test Title",
        description: "Test Description",
        siteName: "Cal.com",
        origin: "http://acme.cal.local",
        canonical: "http://acme.cal.local/some-path",
      };
      vi.mocked(usePathname).mockReturnValue("/mocked-path");
      const { container } = render(<HeadSeo {...props} />);
      await waitFor(async () => {
        const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
        expect(mockedNextSeoEl?.getAttribute("canonical")).toEqual(props.canonical);
        expect(mockedNextSeoEl?.getAttribute("description")).toEqual(props.description);
        expect(mockedNextSeoEl?.getAttribute("site_name")).toEqual(props.siteName);
        expect(mockedNextSeoEl?.getAttribute("image")).toContain("constructGenericImage");
      });
    });
  });

  test("Should render title with brand", async () => {
    const { container } = render(<HeadSeo {...basicProps} />);
    await waitFor(async () => {
      const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
      expect(mockedNextSeoEl?.getAttribute("title")).toEqual(`${basicProps.title} | Cal.com`);
    });
  });

  test("Should render title without brand", async () => {
    const { container } = render(<HeadSeo {...basicProps} isBrandingHidden />);
    await waitFor(async () => {
      const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
      expect(mockedNextSeoEl?.getAttribute("title")).toEqual(`${basicProps.title}`);
    });
  });

  test("Should render with app props", async () => {
    const { container } = render(<HeadSeo {...basicProps} app={{} as HeadSeoProps["app"]} />);
    await waitFor(async () => {
      const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
      expect(mockedNextSeoEl?.getAttribute("image")).toContain("constructAppImage");
    });
  });

  test("Should render with meeting props", async () => {
    const { container } = render(<HeadSeo {...basicProps} meeting={{} as HeadSeoProps["meeting"]} />);
    await waitFor(async () => {
      const mockedNextSeoEl = container.querySelector("#mocked-next-seo");
      expect(mockedNextSeoEl?.getAttribute("image")).toContain("constructMeetingImage");
    });
  });
});
