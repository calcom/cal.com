import { getSlugOrRequestedSlug } from "@calcom/features/ee/organizations/lib/orgDomains";
import { prisma } from "@calcom/prisma";

export type TeamWithEventTypes = Awaited<ReturnType<typeof TeamService.getTeamWithEventTypes>>;

export class TeamService {
  static async getTeamWithEventTypes(teamSlug: string, meetingSlug: string, orgSlug: string | null) {
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
        brandColor: true,
        darkBrandColor: true,
        theme: true,
        eventTypes: {
          where: {
            OR: [{ slug: meetingSlug }, { slug: { startsWith: `${meetingSlug}-team-id-` } }],
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            isInstantEvent: true,
            schedulingType: true,
            metadata: true,
            length: true,
            hidden: true,
            disableCancelling: true,
            disableRescheduling: true,
            allowReschedulingCancelledBookings: true,
            interfaceLanguage: true,
            instantMeetingParameters: true,
            bookingFields: true,
            customInputs: true,
            locations: true,
            price: true,
            currency: true,
            requiresConfirmation: true,
            requiresBookerEmailVerification: true,
            recurringEvent: true,
            seatsPerTimeSlot: true,
            seatsShowAttendees: true,
            seatsShowAvailabilityCount: true,
            hideOrganizerEmail: true,
            successRedirectUrl: true,
            forwardParamsSuccessRedirect: true,
            lockTimeZoneToggleOnBookingPage: true,
            autoTranslateDescriptionEnabled: true,
            fieldTranslations: {
              select: {
                translatedText: true,
                targetLocale: true,
                field: true,
              },
            },
            schedule: {
              select: {
                id: true,
                timeZone: true,
              },
            },
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
    if (!team) return null;
    return team;
  }
}
