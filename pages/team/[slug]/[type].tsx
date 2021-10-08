import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { asStringOrNull } from "@lib/asStringOrNull";
import { extractLocaleInfo } from "@lib/core/i18n/i18n.utils";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import AvailabilityPage from "@components/booking/pages/AvailabilityPage";

export type AvailabilityTeamPageProps = inferSSRProps<typeof getServerSideProps>;

export default function TeamType(props: AvailabilityTeamPageProps) {
  return <AvailabilityPage {...props} />;
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const locale = await extractLocaleInfo(context.req);
  const slugParam = asStringOrNull(context.query.slug);
  const typeParam = asStringOrNull(context.query.type);
  const dateParam = asStringOrNull(context.query.date);

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
          periodStartDate: true,
          periodEndDate: true,
        },
      },
    },
  });

  if (!team || team.eventTypes.length != 1) {
    return {
      notFound: true,
    };
  }

  const [eventType] = team.eventTypes;

  type Availability = typeof eventType["availability"];
  const getWorkingHours = (availability: Availability) => (availability?.length ? availability : null);
  const workingHours = getWorkingHours(eventType.availability) || [];

  workingHours.sort((a, b) => a.startTime - b.startTime);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
  });

  return {
    props: {
      localeProp: locale,
      profile: {
        name: team.name,
        slug: team.slug,
        image: team.logo || null,
        theme: null,
      },
      date: dateParam,
      eventType: eventTypeObject,
      workingHours,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
