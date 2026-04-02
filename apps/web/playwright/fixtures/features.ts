import type { AppFlags } from "@calcom/features/flags/config";
import { prisma } from "@calcom/prisma";
import type { Feature } from "@calcom/prisma/client";
import type { Page } from "@playwright/test";

type FeatureSlugs = keyof AppFlags;

export const createFeatureFixture = (page: Page) => {
  const store = { features: [], page } as { features: Feature[]; page: typeof page };
  let initalFeatures: Feature[] = [];

  // IIF to add all features to store on creation
  return {
    init: async () => {
      const features = await prisma.feature.findMany();
      store.features = features;
      initalFeatures = features;
      return features;
    },
    getAll: () => store.features,
    get: (slug: FeatureSlugs) => store.features.find((b) => b.slug === slug),
    deleteAll: async () => {
      await prisma.feature.deleteMany({
        where: { slug: { in: store.features.map((feature) => feature.slug) } },
      });
      store.features = [];
    },
    delete: async (slug: FeatureSlugs) => {
      await prisma.feature.delete({ where: { slug } });
      store.features = store.features.filter((b) => b.slug !== slug);
    },
    toggleFeature: async (slug: FeatureSlugs) => {
      const feature = store.features.find((b) => b.slug === slug);
      if (feature) {
        const enabled = !feature.enabled;
        await prisma.feature.update({ where: { slug }, data: { enabled } });
        store.features = store.features.map((b) => (b.slug === slug ? { ...b, enabled } : b));
      }
    },
    set: async (slug: FeatureSlugs, enabled: boolean) => {
      const feature = store.features.find((b) => b.slug === slug);
      if (feature) {
        store.features = store.features.map((b) => (b.slug === slug ? { ...b, enabled } : b));
        await prisma.feature.update({ where: { slug }, data: { enabled } });
      }
    },
    reset: () => (store.features = initalFeatures),
  };
};
