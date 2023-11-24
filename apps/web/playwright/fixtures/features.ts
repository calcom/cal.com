import type { Page } from "@playwright/test";
import type { Feature } from "@prisma/client";

import { prisma } from "@calcom/prisma";

export const createFeatureFixture = (page: Page) => {
  const store = { features: [], page } as { features: Feature[]; page: typeof page };
  return {
    get: () => store.features,
    deleteAll: async () => {
      await prisma.feature.deleteMany({
        where: { slug: { in: store.features.map((feature) => feature.slug) } },
      });
      store.features = [];
    },
    delete: async (slug: string) => {
      await prisma.feature.delete({ where: { slug } });
      store.features = store.features.filter((b) => b.slug !== slug);
    },
    toggleFeature: async (slug: string) => {
      const feature = store.features.find((b) => b.slug === slug);
      if (feature) {
        const enabled = !feature.enabled;
        await prisma.feature.update({ where: { slug }, data: { enabled } });
        store.features = store.features.map((b) => (b.slug === slug ? { ...b, enabled } : b));
      }
    },
    set: async (slug: string, enabled: boolean) => {
      const feature = store.features.find((b) => b.slug === slug);
      if (feature) {
        await prisma.feature.update({ where: { slug }, data: { enabled } });
        store.features = store.features.map((b) => (b.slug === slug ? { ...b, enabled } : b));
      }
    },
  };
};
