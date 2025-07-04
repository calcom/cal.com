import type { Page } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import type { Team } from "@calcom/prisma/client";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const getRandomSlug = () => `org-${Math.random().toString(36).substring(7)}`;

// creates a user fixture instance and stores the collection
export const createOrgsFixture = (page: Page) => {
  const store = { orgs: [], page } as { orgs: Team[]; page: typeof page };
  return {
    create: async (opts: { name: string; slug?: string; requestedSlug?: string; isPrivate?: boolean }) => {
      const org = await createOrgInDb({
        name: opts.name,
        slug: opts.slug || getRandomSlug(),
        requestedSlug: opts.requestedSlug,
        isPrivate: opts.isPrivate,
      });
      const orgWithMetadata = {
        ...org,
        metadata: teamMetadataSchema.parse(org.metadata),
      };
      store.orgs.push(orgWithMetadata);
      return orgWithMetadata;
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

export async function createOrgInDb({
  name,
  slug,
  requestedSlug,
  isPrivate,
}: {
  name: string;
  slug: string | null;
  requestedSlug?: string;
  isPrivate?: boolean;
}) {
  return await prisma.team.create({
    data: {
      name: name,
      slug: slug,
      isOrganization: true,
      isPrivate: isPrivate,
      metadata: {
        ...(requestedSlug
          ? {
              requestedSlug,
            }
          : null),
      },
    },
    include: {
      organizationSettings: true,
    },
  });
}
