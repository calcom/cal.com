import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { orgDomainConfig, getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[[team-booking-preview]]"] });

export type TeamBookingPreviewPageProps = {
  eventType: {
    id: number;
    title: string;
    description: string | null;
    length: number;
    slug: string;
    price: number;
    currency: string;
    requiresConfirmation: boolean;
    descriptionAsSafeHTML: string;
    schedulingType: string | null;
  };
  team: {
    id: number;
    name: string;
    slug: string | null;
    logoUrl: string | null;
    theme: string | null;
    brandColor: string;
    darkBrandColor: string;
    hideBranding: boolean;
  };
  entity: {
    logoUrl?: string | null;
    orgSlug?: string | null;
    name?: string | null;
  };
  isPreviewPage: boolean;
};

export const getTeamBookingPreviewProps = async (
  context: GetServerSidePropsContext
): Promise<TeamBookingPreviewPageProps> => {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const teamSlug = context.query.slug as string;
  const eventSlug = context.query.type as string;

  const dataFetchStart = Date.now();

  const eventType = await prisma.eventType.findFirst({
    where: {
      slug: eventSlug,
      team: getSlugOrRequestedSlug(teamSlug),
      ...(isValidOrgDomain && currentOrgDomain
        ? {
            team: {
              parent: {
                slug: currentOrgDomain,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      length: true,
      slug: true,
      price: true,
      currency: true,
      requiresConfirmation: true,
      schedulingType: true,
      hidden: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          theme: true,
          brandColor: true,
          darkBrandColor: true,
          hideBranding: true,
          parent: {
            select: {
              slug: true,
              name: true,
              logoUrl: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
  });

  if (!eventType || eventType.hidden || !eventType.team) {
    log.debug(`Team event type not found: ${teamSlug}/${eventSlug}`);
    return notFound();
  }

  const dataFetchEnd = Date.now();
  log.debug(`Team booking preview data fetch took: ${dataFetchEnd - dataFetchStart}ms`);

  const team = eventType.team;
  const orgParent = team.parent;

  return {
    eventType: {
      id: eventType.id,
      title: eventType.title,
      description: eventType.description,
      length: eventType.length,
      slug: eventType.slug,
      price: eventType.price,
      currency: eventType.currency,
      requiresConfirmation: eventType.requiresConfirmation,
      schedulingType: eventType.schedulingType,
      descriptionAsSafeHTML: markdownToSafeHTML(eventType.description) || "",
    },
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logoUrl,
      theme: team.theme,
      brandColor: team.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
      darkBrandColor: team.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
      hideBranding: team.hideBranding ?? false,
    },
    entity: {
      logoUrl: orgParent?.logoUrl || team.logoUrl,
      orgSlug: currentOrgDomain,
      name: orgParent?.name || team.name,
    },
    isPreviewPage: true,
  };
};
