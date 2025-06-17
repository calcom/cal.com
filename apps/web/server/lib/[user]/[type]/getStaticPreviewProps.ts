import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { DEFAULT_DARK_BRAND_COLOR, DEFAULT_LIGHT_BRAND_COLOR } from "@calcom/lib/constants";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[[booking-preview]]"] });

export type BookingPreviewPageProps = {
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
  };
  profile: {
    name: string;
    image: string;
    theme: string | null;
    brandColor: string;
    darkBrandColor: string;
    organization: any;
    allowSEOIndexing: boolean;
    username: string | null;
  };
  entity: {
    logoUrl?: string | null;
    orgSlug?: string | null;
    name?: string | null;
  };
  isPreviewPage: boolean;
};

export const getBookingPreviewProps = async (
  context: GetServerSidePropsContext
): Promise<BookingPreviewPageProps> => {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const usernameList = getUsernameList(context.query.user as string);
  const eventSlug = context.query.type as string;

  if (usernameList.length > 1) {
    // Dynamic groups not supported in preview mode
    return notFound();
  }

  const dataFetchStart = Date.now();

  // Lightweight query - get event type and user info without availability data
  const eventType = await prisma.eventType.findFirst({
    where: {
      slug: eventSlug,
      users: {
        some: {
          username: usernameList[0],
          ...(isValidOrgDomain
            ? {
                profiles: {
                  some: {
                    organization: {
                      slug: currentOrgDomain,
                    },
                  },
                },
              }
            : {
                profiles: { none: {} },
              }),
        },
      },
      // Exclude team events in this handler
      team: null,
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
      hidden: true,
      // Get owner info but avoid heavy user queries
      owner: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          theme: true,
          brandColor: true,
          darkBrandColor: true,
          allowSEOIndexing: true,
          profiles: {
            select: {
              organization: {
                select: {
                  slug: true,
                  name: true,
                  logoUrl: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!eventType || eventType.hidden) {
    log.debug(`Event type not found: ${usernameList[0]}/${eventSlug}`);
    return notFound();
  }

  const dataFetchEnd = Date.now();
  log.debug(`Booking preview data fetch took: ${dataFetchEnd - dataFetchStart}ms`);

  const owner = eventType.owner!;
  const organization = owner.profiles[0]?.organization || null;

  const profile = {
    name: owner.name || owner.username || "",
    image: getUserAvatarUrl({
      avatarUrl: owner.avatarUrl,
    }),
    theme: owner.theme,
    brandColor: owner.brandColor ?? DEFAULT_LIGHT_BRAND_COLOR,
    darkBrandColor: owner.darkBrandColor ?? DEFAULT_DARK_BRAND_COLOR,
    allowSEOIndexing: owner.allowSEOIndexing ?? true,
    username: owner.username,
    organization,
  };

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
      descriptionAsSafeHTML: markdownToSafeHTML(eventType.description) || "",
    },
    profile,
    entity: {
      logoUrl: organization?.logoUrl,
      orgSlug: currentOrgDomain,
      name: organization?.name,
    },
    isPreviewPage: true,
  };
};
