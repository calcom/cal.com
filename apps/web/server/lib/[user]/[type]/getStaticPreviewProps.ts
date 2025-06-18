import type { GetServerSidePropsContext } from "next";
import { notFound } from "next/navigation";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { getUsernameList } from "@calcom/lib/defaultEvents";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[[user-booking-preview]]"] });

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
  profiles?: {
    name: string;
    image: string;
    username: string | null;
  }[];
  organizationName: string | null;
  isDynamicGroup: boolean;
  // Additional properties for metadata generation
  isSEOIndexable: boolean;
  eventData: {
    title: string;
    hidden: boolean;
    profile: {
      name: string;
      image: string;
    };
    subsetOfUsers: Array<{
      name: string;
      username: string;
    }>;
    entity: {
      orgSlug: string | null;
    };
  };
  isBrandingHidden: boolean;
};

export const getBookingPreviewProps = async (
  context: GetServerSidePropsContext
): Promise<BookingPreviewPageProps> => {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const usernameList = getUsernameList(context.query.user as string);
  const eventSlug = context.query.type as string;

  const isDynamicGroup = usernameList.length > 1;

  if (isDynamicGroup) {
    // Handle dynamic groups - fetch basic info for all users
    const users = await prisma.user.findMany({
      where: {
        username: { in: usernameList },
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
      select: {
        name: true,
        username: true,
        avatarUrl: true,
        allowSEOIndexing: true,
        profiles: {
          select: {
            organization: {
              select: {
                name: true,
                organizationSettings: {
                  select: {
                    allowSEOIndexing: true,
                  },
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (users.length === 0) {
      log.debug(`Dynamic group users not found: ${usernameList.join("+")}`);
      return notFound();
    }

    const profiles = users.map((user) => ({
      name: user.name || user.username || "",
      image: getUserAvatarUrl({
        avatarUrl: user.avatarUrl,
      }),
      username: user.username,
    }));

    // Use first user's organization for simplicity
    const organization = users[0]?.profiles[0]?.organization || null;

    // For dynamic groups, all users must allow SEO indexing
    const allowSEOIndexing =
      isValidOrgDomain && currentOrgDomain
        ? organization?.organizationSettings?.allowSEOIndexing
          ? users.every((user) => user.allowSEOIndexing)
          : false
        : users.every((user) => user.allowSEOIndexing);

    return {
      eventType: {
        title: `${eventSlug} with ${users.map((u) => u.name || u.username).join(", ")}`,
        description: `Group meeting with ${users.map((u) => u.name || u.username).join(", ")}`,
        length: 30, // Default length for dynamic groups
        slug: eventSlug,
        price: 0,
        currency: "USD",
        requiresConfirmation: false,
      },
      profile: profiles[0], // Primary profile (for backward compatibility)
      profiles,
      organizationName: organization?.name || null,
      isDynamicGroup: true,
      isSEOIndexable: allowSEOIndexing,
      eventData: {
        title: `${eventSlug} with ${users.map((u) => u.name || u.username).join(", ")}`,
        hidden: false,
        profile: profiles[0],
        subsetOfUsers: users.map((u) => ({
          name: u.name || u.username || "",
          username: u.username || "",
        })),
        entity: {
          orgSlug: currentOrgDomain,
        },
      },
      isBrandingHidden: false,
    };
  }

  // Single user logic (existing code)
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
          allowSEOIndexing: true,
          profiles: {
            select: {
              organization: {
                select: {
                  name: true,
                  organizationSettings: {
                    select: {
                      allowSEOIndexing: true,
                    },
                  },
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

  // Determine SEO indexing - same logic as getServerSideProps
  const allowSEOIndexing =
    isValidOrgDomain && currentOrgDomain
      ? organization?.organizationSettings?.allowSEOIndexing
        ? owner.allowSEOIndexing
        : false
      : owner.allowSEOIndexing;

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
    isDynamicGroup: false,
    isSEOIndexable: !!allowSEOIndexing,
    eventData: {
      title: eventType.title,
      hidden: false,
      profile,
      subsetOfUsers: [],
      entity: {
        orgSlug: currentOrgDomain,
      },
    },
    isBrandingHidden: false,
  };
};
