import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[[booking-preview]]"] });

export type BookingPreviewPageProps = {
  eventType: {
    title: string;
    description: string | null;
    length: number;
    slug: string;
    price: number;
    currency: string;
    requiresConfirmation: boolean;
  };
  profile: {
    name: string;
    image: string;
    username: string | null;
  };
  organizationName: string | null;
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
      title: true,
      description: true,
      length: true,
      slug: true,
      price: true,
      currency: true,
      requiresConfirmation: true,
      hidden: true,
      // Get minimal owner info
      owner: {
        select: {
          name: true,
          username: true,
          avatarUrl: true,
          profiles: {
            select: {
              organization: {
                select: {
                  name: true,
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
    log.debug("Event type not found");
    return notFound();
  }

  const owner = eventType.owner;
  if (!owner) {
    // Should never happen
    return notFound();
  }
  const organization = owner.profiles[0]?.organization || null;

  const profile = {
    name: owner.name || owner.username || "",
    image: getUserAvatarUrl({
      avatarUrl: owner.avatarUrl,
    }),
    username: owner.username,
  };

  return {
    eventType: {
      title: eventType.title,
      description: eventType.description,
      length: eventType.length,
      slug: eventType.slug,
      price: eventType.price,
      currency: eventType.currency,
      requiresConfirmation: eventType.requiresConfirmation,
    },
    profile,
    organizationName: organization?.name || null,
  };
};
