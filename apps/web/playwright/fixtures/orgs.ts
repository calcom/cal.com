import type { Page } from "@playwright/test";
import type { Team } from "@prisma/client";

import { prisma } from "@calcom/prisma";

const getRandomSlug = () => `org-${Math.random().toString(36).substring(7)}`;

// creates a user fixture instance and stores the collection
export const createOrgsFixture = (page: Page) => {
  const store = { orgs: [], page } as { orgs: Team[]; page: typeof page };
  return {
    create: async (opts: { name: string; slug?: string; requestedSlug?: string }) => {
      const org = await createOrgInDb({
        name: opts.name,
        slug: opts.slug || getRandomSlug(),
        requestedSlug: opts.requestedSlug,
      });
      store.orgs.push(org);
      return org;
    },
    get: () => store.orgs,
    deleteAll: async () => {
      await prisma.team.deleteMany({ where: { id: { in: store.orgs.map((org) => org.id) } } });
      store.orgs = [];
    },
    delete: async (id: number) => {
      await prisma.team.delete({ where: { id } });
      store.orgs = store.orgs.filter((b) => b.id !== id);
    },
  };
};

async function createOrgInDb({
  name,
  slug,
  requestedSlug,
}: {
  name: string;
  slug: string | null;
  requestedSlug?: string;
}) {
  return await prisma.team.create({
    data: {
      name: name,
      slug: slug,
      metadata: {
        isOrganization: true,
        ...(requestedSlug
          ? {
              requestedSlug,
            }
          : null),
      },
    },
  });
}
