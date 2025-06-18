import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { orgDomainConfig, getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[[team-booking-preview]]"] });

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
          name: true,
          slug: true,
          logoUrl: true,
          theme: true,
          parent: {
            select: {
              name: true,
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
  };
};
