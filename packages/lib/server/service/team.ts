import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { prisma } from "@calcom/prisma";

export interface TeamWithEventTypes {
  id: number;
  isPrivate: boolean;
  hideBranding: boolean;
  logoUrl: string | null;
  name: string | null;
  slug: string | null;
  isOrganization: boolean;
  parent: {
    slug: string | null;
    name: string | null;
    bannerUrl: string | null;
    logoUrl: string | null;
    hideBranding: boolean;
    organizationSettings: {
      allowSEOIndexing: boolean;
    } | null;
  } | null;
  eventTypes: Array<{
    id: number;
    title: string;
    slug: string;
    isInstantEvent: boolean;
    schedulingType: string | null;
    metadata: any;
    length: number;
    hidden: boolean | null;
    disableCancelling: boolean | null;
    disableRescheduling: boolean | null;
    allowReschedulingCancelledBookings: boolean | null;
    interfaceLanguage: string | null;
    hosts: Array<{
      user: {
        name: string | null;
        username: string | null;
        email: string;
      };
    }>;
  }>;
  organizationSettings: {
    allowSEOIndexing: boolean;
  } | null;
}

export class TeamService {
  static async getTeamWithEventTypes(
    teamSlug: string,
    meetingSlug: string,
    orgSlug: string | null
  ): Promise<TeamWithEventTypes | null> {
    const team = await prisma.team.findFirst({
      where: {
        ...getSlugOrRequestedSlug(teamSlug),
        parent: orgSlug ? getSlugOrRequestedSlug(orgSlug) : null,
      },
      orderBy: {
        slug: { sort: "asc", nulls: "last" },
      },
      select: {
        id: true,
        isPrivate: true,
        hideBranding: true,
        parent: {
          select: {
            slug: true,
            name: true,
            bannerUrl: true,
            logoUrl: true,
            hideBranding: true,
            organizationSettings: {
              select: {
                allowSEOIndexing: true,
              },
            },
          },
        },
        logoUrl: true,
        name: true,
        slug: true,
        eventTypes: {
          where: {
            OR: [{ slug: meetingSlug }, { slug: { startsWith: `${meetingSlug}-team-id-` } }],
          },
          select: {
            id: true,
            title: true,
            slug: true,
            isInstantEvent: true,
            schedulingType: true,
            metadata: true,
            length: true,
            hidden: true,
            disableCancelling: true,
            disableRescheduling: true,
            allowReschedulingCancelledBookings: true,
            interfaceLanguage: true,
            hosts: {
              take: 3,
              select: {
                user: {
                  select: {
                    name: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        isOrganization: true,
        organizationSettings: {
          select: {
            allowSEOIndexing: true,
          },
        },
      },
    });

    return team;
  }
}
