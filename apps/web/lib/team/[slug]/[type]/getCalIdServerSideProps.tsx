import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import logger from "@calcom/lib/logger";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { BookingStatus, RedirectType } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const log = logger.getSubLogger({ prefix: ["team/[slug]/[type]"] });

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

function hasApiV2RouteInEnv() {
  return Boolean(process.env.NEXT_PUBLIC_API_V2_URL);
}

export const getCalIdServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;
  const session = await getServerSession({ req });

  try {
    const { slug: teamSlug, type: meetingSlug } = paramsSchema.parse(params);
    const { rescheduleUid, isInstantMeeting: queryIsInstantMeeting } = query;
    const allowRescheduleForCancelledBooking = query.allowRescheduleForCancelledBooking === "true";

    const redirect = await getTemporaryOrgRedirect({
      slugs: teamSlug,
      redirectType: RedirectType.Team,
      eventTypeSlug: meetingSlug,
      currentQuery: context.query,
    });

    if (redirect) {
      return redirect;
    }

    const allCalIdTeams = await prisma.calIdTeam.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            eventTypes: true,
          },
        },
      },
      take: 10,
    });

    const calIdTeam = await getCalIdTeamWithEventsData(teamSlug, meetingSlug);

    if (calIdTeam && (!calIdTeam.eventTypes || calIdTeam.eventTypes.length === 0)) {
      const allEventTypes = await prisma.eventType.findMany({
        where: {
          calIdTeam: {
            slug: teamSlug,
          },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          hidden: true,
        },
      });
    }

    if (!calIdTeam || !calIdTeam.eventTypes?.[0]) {
      return { notFound: true } as const;
    }

    const eventData = calIdTeam.eventTypes[0];

    if (rescheduleUid && eventData.disableRescheduling) {
      return { redirect: { destination: `/booking/${rescheduleUid}`, permanent: false } };
    }

    const eventTypeId = eventData.id;
    const eventHostsUserData = await getUsersData(
      calIdTeam.isTeamPrivate,
      eventTypeId,
      eventData.hosts.map((h) => h.user)
    );

    let booking: GetBookingType | null = null;
    if (rescheduleUid) {
      booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);

      if (
        booking?.status === BookingStatus.CANCELLED &&
        !allowRescheduleForCancelledBooking &&
        !eventData.allowReschedulingCancelledBookings
      ) {
        return {
          redirect: {
            permanent: false,
            destination: `/team/${teamSlug}/${meetingSlug}`,
          },
        };
      }
    }

    const fromRedirectOfNonOrgLink = context.query.orgRedirection === "true";
    const isUnpublished = !calIdTeam.slug;

    const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
    const crmContactOwnerRecordType = query["cal.crmContactOwnerRecordType"];
    const crmAppSlugParam = query["cal.crmAppSlug"];
    const crmRecordIdParam = query["cal.crmRecordId"];

    // Handle string[] type from query params
    let teamMemberEmail = Array.isArray(crmContactOwnerEmail)
      ? crmContactOwnerEmail[0]
      : crmContactOwnerEmail;

    let crmOwnerRecordType = Array.isArray(crmContactOwnerRecordType)
      ? crmContactOwnerRecordType[0]
      : crmContactOwnerRecordType;

    let crmAppSlug = Array.isArray(crmAppSlugParam) ? crmAppSlugParam[0] : crmAppSlugParam;
    let crmRecordId = Array.isArray(crmRecordIdParam) ? crmRecordIdParam[0] : crmRecordIdParam;

    if (!teamMemberEmail || !crmOwnerRecordType || !crmAppSlug) {
      const { getTeamMemberEmailForResponseOrContactUsingUrlQuery } = await import(
        "@calcom/lib/server/getTeamMemberEmailFromCrm"
      );
      const {
        email,
        recordType,
        crmAppSlug: crmAppSlugQuery,
        recordId,
      } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
        query,
        eventData,
      });

      teamMemberEmail = email ?? undefined;
      crmOwnerRecordType = recordType ?? undefined;
      crmAppSlug = crmAppSlugQuery ?? undefined;
      crmRecordId = recordId ?? undefined;
    }

    const featureRepo = new FeaturesRepository();
    const teamHasApiV2Route = await featureRepo.checkIfCalIdTeamHasFeature(
      calIdTeam.id,
      "use-api-v2-for-team-slots"
    );
    const useApiV2 = teamHasApiV2Route && hasApiV2RouteInEnv();

    const props = {
      useApiV2,
      eventData: {
        eventTypeId,
        entity: {
          fromRedirectOfNonOrgLink,
          considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
          orgSlug: null, // CalIdTeams don't have org context
          teamSlug: calIdTeam.slug ?? null,
          name: calIdTeam.name,
        },
        length: eventData.length,
        metadata: EventTypeMetaDataSchema.parse(eventData.metadata),
        profile: {
          image: getPlaceholderAvatar(calIdTeam.logoUrl, calIdTeam.name),
          name: calIdTeam.name,
          username: null, // CalIdTeams don't have username context
        },
        title: eventData.title,
        users: eventHostsUserData,
        subsetOfUsers: eventHostsUserData,
        hidden: eventData.hidden,
        interfaceLanguage: eventData.interfaceLanguage,
        schedulingType: eventData.schedulingType,
        length: eventData.length,
        description: null, // CalIdTeams don't have descriptions in this context
        locations: [],
        currency: null,
        requiresConfirmation: false,
        recurringEvent: null,
        price: 0,
        isDynamic: false,
        fieldTranslations: [],
        autoTranslateDescriptionEnabled: false,
      },
      booking,
      user: teamSlug,
      teamId: calIdTeam.id,
      slug: meetingSlug,
      isBrandingHidden: shouldHideBrandingForTeamEvent({
        eventTypeId: eventData.id,
        team: {
          isPrivate: calIdTeam.isTeamPrivate,
          hideBranding: calIdTeam.hideTeamBranding,
          parent: null,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      }),
      isInstantMeeting: eventData && queryIsInstantMeeting ? true : false,
      themeBasis: calIdTeam.slug,
      orgBannerUrl: calIdTeam.bannerUrl ?? "",
      teamMemberEmail,
      crmOwnerRecordType,
      crmAppSlug,
      crmRecordId,
      isSEOIndexable: true,
    };

    return {
      props,
    };
  } catch (error) {
    throw error;
  }
};

const getCalIdTeamWithEventsData = async (teamSlug: string, meetingSlug: string) => {
  try {
    const result = await prisma.calIdTeam.findFirst({
      where: {
        slug: teamSlug,
      },
      select: {
        id: true,
        isTeamPrivate: true,
        hideTeamBranding: true,
        logoUrl: true,
        name: true,
        slug: true,
        bannerUrl: true,
        eventTypes: {
          where: {
            slug: meetingSlug,
          },
          select: {
            id: true,
            title: true,
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
      },
    });

    return result;
  } catch (error) {
    throw error;
  }
};

const getUsersData = async (
  isPrivateTeam: boolean,
  eventTypeId: number,
  users: Pick<User, "username" | "name">[]
) => {
  if (!isPrivateTeam && users.length > 0) {
    return users
      .filter((user) => user.username)
      .map((user) => ({
        username: user.username ?? "",
        name: user.name ?? "",
      }));
  }
  if (!isPrivateTeam && users.length === 0) {
    const { users: data } = await prisma.eventType.findUniqueOrThrow({
      where: { id: eventTypeId },
      select: {
        users: {
          take: 1,
          select: {
            username: true,
            name: true,
          },
        },
      },
    });

    return data.length > 0
      ? [
          {
            username: data[0].username ?? "",
            name: data[0].name ?? "",
          },
        ]
      : [];
  }

  return [];
};
