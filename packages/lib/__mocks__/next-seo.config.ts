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
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));
