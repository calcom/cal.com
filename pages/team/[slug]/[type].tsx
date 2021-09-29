import { Availability, EventType } from "@prisma/client";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import prisma from "@lib/prisma";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export default function TeamType(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <AvailabilityPage {...props} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const locale = await getOrSetUserLocaleFromHeaders(context.req);
  // get query params and typecast them to string
  // (would be even better to assert them instead of typecasting)
  const slugParam = asStringOrNull(context.query.slug);
  const typeParam = asStringOrNull(context.query.type);

  if (!slugParam || !typeParam) {
    throw new Error(`File is not named [idOrSlug]/[user]`);
  }

  const team = await prisma.team.findFirst({
    where: {
      slug: slugParam,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      eventTypes: {
        where: {
          slug: typeParam,
        },
        select: {
          id: true,
          users: {
            select: {
              id: true,
              name: true,
              avatar: true,
              username: true,
              timeZone: true,
            },
          },
          title: true,
          availability: true,
          description: true,
          length: true,
          schedulingType: true,
        },
      },
    },
  });

  if (!team || team.eventTypes.length != 1) {
    return {
      notFound: true,
    } as const;
  }

  const profile = {
    name: team.name,
    slug: team.slug,
    image: team.logo || null,
  };

  const eventType: EventType = team.eventTypes[0];

  const getWorkingHours = (providesAvailability: { availability: Availability[] }) =>
    providesAvailability.availability && providesAvailability.availability.length
      ? providesAvailability.availability
      : null;

  const workingHours = getWorkingHours(eventType) || [];
  workingHours.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  return {
    props: {
      localeProp: locale,
      profile,
      team,
      eventType: eventTypeObject,
      workingHours,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
