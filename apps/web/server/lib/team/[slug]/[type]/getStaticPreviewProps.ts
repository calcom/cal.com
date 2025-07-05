import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { orgDomainConfig, getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[[team-booking-preview]]"] });

const querySchema = z.object({
  slug: z.string(),
  type: z.string(),
});

export type TeamBookingPreviewPageProps = {
  eventType: {
    title: string;
    description: string | null;
    length: number;
    slug: string;
    price: number;
    currency: string;
    requiresConfirmation: boolean;
    schedulingType: string | null;
  };
  team: {
    name: string;
    slug: string | null;
    logoUrl: string | null;
    theme: string | null;
  };
  organizationName: string | null;
  isSEOIndexable: boolean;
  eventData: {
    title: string;
    hidden: boolean;
    profile: {
      name: string;
      image: string;
    };
    users: Array<{
      name: string;
      username: string;
    }>;
    entity: {
      orgSlug: string | null;
    };
  };
  isBrandingHidden: boolean;
};

export const getTeamBookingPreviewProps = async (
  context: GetServerSidePropsContext
): Promise<TeamBookingPreviewPageProps> => {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const queryValidation = querySchema.safeParse(context.query);
  if (!queryValidation.success) {
    return notFound();
  }

  const { slug: teamSlug, type: eventSlug } = queryValidation.data;

  // First, get the team to obtain the teamId
  const team = await prisma.team.findFirst({
    where: {
      ...getSlugOrRequestedSlug(teamSlug),
      ...(isValidOrgDomain && currentOrgDomain
        ? {
            parent: {
              slug: currentOrgDomain,
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      theme: true,
      parent: {
        select: {
          name: true,
          organizationSettings: {
            select: {
              allowSEOIndexing: true,
            },
          },
        },
      },
      organizationSettings: {
        select: {
          allowSEOIndexing: true,
        },
      },
    },
  });

  if (!team) {
    log.debug(`Team not found: ${teamSlug}`);
    return notFound();
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      teamId_slug: {
        teamId: team.id,
        slug: eventSlug,
      },
    },
    select: {
      title: true,
      description: true,
      length: true,
      slug: true,
      price: true,
      currency: true,
      requiresConfirmation: true,
      schedulingType: true,
      hidden: true,
    },
  });

  if (!eventType || eventType.hidden) {
    log.debug(`Team event type not found or hidden: ${teamSlug}/${eventSlug}`);
    return notFound();
  }

  const orgParent = team.parent;

  // Determine SEO indexing for teams
  const allowSEOIndexing =
    isValidOrgDomain && currentOrgDomain
      ? orgParent?.organizationSettings?.allowSEOIndexing ?? false
      : team.organizationSettings?.allowSEOIndexing ?? true; // Default true for non-org teams

  return {
    eventType: {
      title: eventType.title,
      description: eventType.description,
      length: eventType.length,
      slug: eventType.slug,
      price: eventType.price,
      currency: eventType.currency,
      requiresConfirmation: eventType.requiresConfirmation,
      schedulingType: eventType.schedulingType,
    },
    team: {
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      theme: team.theme,
    },
    organizationName: orgParent?.name || team.name,
    isSEOIndexable: !!allowSEOIndexing,
    eventData: {
      title: eventType.title,
      hidden: eventType.hidden,
      profile: {
        name: team.name,
        image: team.logoUrl || "",
      },
      users: [],
      entity: {
        orgSlug: currentOrgDomain,
      },
    },
    isBrandingHidden: false,
  };
};
