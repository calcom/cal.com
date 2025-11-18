import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { processEventDataShared } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { shouldHideBrandingForTeamEvent } from "@calcom/lib/hideBranding";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { BookingStatus, RedirectType } from "@calcom/prisma/client";

import { getTemporaryOrgRedirect } from "@lib/getTemporaryOrgRedirect";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

function hasApiV2RouteInEnv() {
  return Boolean(process.env.NEXT_PUBLIC_API_V2_URL);
}

export const getCalIdServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, params, query } = context;

  const selectedTime = req.cookies["selectedTime"] || "";
  const slot = query.slot || "";
  if (slot && slot !== selectedTime) {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["host"];
    const pathname = `/team/${params?.slug}/${params?.type}`;

    // const originalUrl = resolvedUrl;
    const fullUrl = `${protocol}://${host}${pathname}`;
    if (fullUrl) {
      const url = new URL(fullUrl);
      url.searchParams.delete("slot");
      return {
        redirect: {
          permanent: false,
          destination: url.toString(),
        },
      };
    }
  }

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

    const calIdTeam = await getCalIdTeamWithEventsData(teamSlug, meetingSlug);

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

    if (eventData.schedulingType === "MANAGED") {
      return {
        redirect: {
          destination: `/team/${params?.slug}?members=1`,
          permanent: false,
        },
      } as const;
    }

    // Create a proper eventData object that matches getPublicEventSelect structure
    const eventDataForProcessing = {
      id: eventTypeId,
      title: eventData.title,
      description: eventData.description,
      interfaceLanguage: eventData.interfaceLanguage,
      eventName: eventData.title,
      slug: meetingSlug,
      isInstantEvent: eventData.isInstantEvent || false,
      instantMeetingParameters: eventData.instantMeetingParameters,
      aiPhoneCallConfig: null,
      schedulingType: eventData.schedulingType,
      length: eventData.length,
      locations: eventData.locations || [],
      customInputs: [],
      disableGuests: eventData.disableGuests,
      metadata: eventData.metadata,
      lockTimeZoneToggleOnBookingPage: eventData.lockTimeZoneToggleOnBookingPage,
      lockedTimeZone: eventData.lockedTimeZone,
      requiresConfirmation: eventData.requiresConfirmation,
      autoTranslateDescriptionEnabled: eventData.autoTranslateDescriptionEnabled,
      fieldTranslations: [],
      requiresBookerEmailVerification: eventData.requiresBookerEmailVerification,
      recurringEvent: eventData.recurringEvent,
      price: eventData.price,
      currency: eventData.currency,
      seatsPerTimeSlot: eventData.seatsPerTimeSlot,
      disableCancelling: eventData.disableCancelling || false,
      disableRescheduling: eventData.disableRescheduling || false,
      allowReschedulingCancelledBookings: eventData.allowReschedulingCancelledBookings || false,
      seatsShowAvailabilityCount: eventData.seatsShowAvailabilityCount,
      bookingFields: eventData.bookingFields,
      teamId: eventData.teamId,
      team: eventData.team,
      successRedirectUrl: eventData.successRedirectUrl,
      forwardParamsSuccessRedirect: eventData.forwardParamsSuccessRedirect,
      workflows: eventData.calIdWorkflows,
      hosts: eventHostsUserData.map((user) => ({
        user: {
          id: user.id,
          avatarUrl: user.avatarUrl,
          username: user.username,
          name: user.name,
          weekStart: user.weekStart,
          brandColor: user.brandColor,
          darkBrandColor: user.darkBrandColor,
          theme: user.theme,
          metadata: user.metadata,
          organization: user.organization,
          defaultScheduleId: user.defaultScheduleId,
        },
      })),
      owner: eventHostsUserData[0],
      schedule: {
        id: eventHostsUserData[0]?.defaultScheduleId,
        timeZone: "UTC",
      },
      instantMeetingSchedule: null,
      periodType: "UNLIMITED" as const,
      periodDays: eventData.periodDays,
      periodEndDate: eventData.periodEndDate,
      periodStartDate: eventData.periodStartDate,
      periodCountCalendarDays: eventData.periodCountCalendarDays,
      hidden: eventData.hidden,
      assignAllTeamMembers: eventData.assignAllTeamMembers,
      rescheduleWithSameRoundRobinHost: eventData.rescheduleWithSameRoundRobinHost,
    };

    // Process the eventData using the same function as getPublicEvent
    const processedEventData = await processEventDataShared({
      eventData: eventDataForProcessing as any,
      metadata: eventData.metadata as any,
      prisma,
    });

    const props = {
      useApiV2,
      eventData: {
        ...processedEventData,
        // Add missing properties that are expected by Booker component
        eventTypeId: eventTypeId,
        aiPhoneCallConfig: null,
        assignAllTeamMembers: false,
        disableCancelling: eventData.disableCancelling || false,
        disableRescheduling: eventData.disableRescheduling || false,
        allowReschedulingCancelledBookings: eventData.allowReschedulingCancelledBookings || false,
        entity: {
          fromRedirectOfNonOrgLink,
          considerUnpublished: isUnpublished && !fromRedirectOfNonOrgLink,
          orgSlug: null, // CalIdTeams don't have org context
          teamSlug: calIdTeam.slug ?? null,
          name: calIdTeam.name,
          hideProfileLink: false,
        },
        profile: {
          image: getPlaceholderAvatar(calIdTeam.logoUrl, calIdTeam.name),
          name: calIdTeam.name,
          username: null, // CalIdTeams don't have username context
          weekStart: "Sunday",
          brandColor: null,
          darkBrandColor: null,
          theme: null,
          bookerLayouts: null,
        },
        users: eventHostsUserData,
        subsetOfUsers: eventHostsUserData,
        subsetOfHosts: [],
        hosts: [],
        owner: null,
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
            locations: true,
            instantMeetingParameters: true,
            disableGuests: true,
            lockTimeZoneToggleOnBookingPage: true,
            lockedTimeZone: true,
            requiresConfirmation: true,
            autoTranslateDescriptionEnabled: true,
            requiresBookerEmailVerification: true,
            recurringEvent: true,
            price: true,
            currency: true,
            seatsPerTimeSlot: true,
            seatsShowAvailabilityCount: true,
            bookingFields: true,
            teamId: true,
            team: true,
            successRedirectUrl: true,
            forwardParamsSuccessRedirect: true,
            calIdWorkflows: true,
            hosts: {
              take: 3,
              select: {
                user: {
                  select: {
                    name: true,
                    username: true,
                    email: true,
                    avatarUrl: true,
                    weekStart: true,
                    brandColor: true,
                    darkBrandColor: true,
                    theme: true,
                    metadata: true,
                    organization: true,
                    defaultScheduleId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (result?.eventTypes[0].metadata?.apps?.stripe?.enabled) {
      const credential = await prisma.credential.findUnique({
        where: {
          id: result?.eventTypes[0].metadata.apps?.stripe?.credentialId,
        },
      });
      const isIndianStripeAccount = isPrismaObjOrUndefined(credential?.key)?.default_currency === "inr";

      if (isIndianStripeAccount) {
        result.eventTypes[0].metadata = Object.assign({}, result?.eventTypes[0].metadata, {
          billingAddressRequired: true,
        });
      }
    }

    return result;
  } catch (error) {
    throw error;
  }
};

const getUsersData = async (
  isPrivateTeam: boolean,
  eventTypeId: number,
  users: Pick<User, "username" | "name" | "avatarUrl" | "weekStart">[]
) => {
  if (!isPrivateTeam && users.length > 0) {
    return users
      .filter((user) => user.username)
      .map((user) => ({
        username: user.username ?? "",
        name: user.name ?? "",
        avatarUrl: user.avatarUrl ?? "",
        weekStart: user.weekStart,
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
            avatarUrl: true,
            weekStart: true,
            brandColor: true,
            darkBrandColor: true,
            theme: true,
            metadata: true,
            organization: true,
            defaultScheduleId: true,
          },
        },
      },
    });

    return data.length > 0
      ? [
          {
            username: data[0].username ?? "",
            name: data[0].name ?? "",
            weekStart: data[0].weekStart,
            avatarUrl: data[0].avatarUrl,
            // profile:data[0].profile,
            // bookerUrl:
          },
        ]
      : [];
  }

  return [];
};
