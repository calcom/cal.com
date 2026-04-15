vi.mock("@calcom/lib/next-seo.config", () => ({
  default: {
    headSeo: {
      siteName: "Cal.diy",
    },
    defaultNextSeo: {
      title: "Cal.diy",
      description: "Scheduling infrastructure for everyone.",
    },
  },
  seoConfig: {
    headSeo: {
      siteName: "Cal.diy",
    },
  },
  buildSeoMeta: vi.fn().mockReturnValue({}),
}));
