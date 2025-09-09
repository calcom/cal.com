// @ts-expect-error - vi is available in test environment
vi.mock("@calcom/lib/next-seo.config", () => ({
  default: {
    headSeo: {
      siteName: "Cal.com",
    },
    defaultNextSeo: {
      title: "Cal.com",
      description: "Scheduling infrastructure for everyone.",
    },
  },
  seoConfig: {
    headSeo: {
      siteName: "Cal.com",
    },
  },
  // @ts-expect-error - vi is available in test environment
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));
