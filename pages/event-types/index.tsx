// TODO: replace headlessui with radix-ui
import { Prisma } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import React, { Fragment } from "react";

import { getSession } from "@lib/auth";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { ONBOARDING_NEXT_REDIRECT, shouldShowOnboarding } from "@lib/getting-started";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Shell from "@components/Shell";
import CreateNewEventDialog from "@components/eventtype/CreateNewEventDialog";
import EventTypeList from "@components/eventtype/EventTypeList";
import EventTypeListHeading from "@components/eventtype/EventTypeListHeading";
import { Alert } from "@components/ui/Alert";
import UserCalendarIllustration from "@components/ui/svg/UserCalendarIllustration";

export type EventTypesPageProps = inferSSRProps<typeof getServerSideProps>;

const EventTypesPage = (props: EventTypesPageProps) => {
  const { t } = useLocale();

  const CreateFirstEventTypeView = () => (
    <div className="md:py-20">
      <UserCalendarIllustration />
      <div className="block mx-auto text-center md:max-w-screen-sm">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">{t("new_event_type_heading")}</h3>
        <p className="mt-1 mb-2 text-md text-neutral-600">{t("new_event_type_description")}</p>
        <CreateNewEventDialog canAddEvents={props.canAddEvents} profiles={props.profiles} />
      </div>
    </div>
  );

  return (
    <div>
      <Head>
        <title>{t("event_types_page_title")}| Cal.com</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Shell
        heading={t("event_types_page_title")}
        subtitle={t("event_types_page_subtitle")}
        CTA={
          props.eventTypes.length !== 0 && (
            <CreateNewEventDialog canAddEvents={props.canAddEvents} profiles={props.profiles} />
          )
        }>
        {props.user.plan === "FREE" && !props.canAddEvents && (
          <Alert
            severity="warning"
            title={<>{t("plan_upgrade")}</>}
            message={
              <>
                {t("to_upgrade_go_to")}{" "}
                <a href={"https://cal.com/upgrade"} className="underline">
                  {"https://cal.com/upgrade"}
                </a>
              </>
            }
            className="my-4"
          />
        )}
        {props.eventTypes &&
          props.eventTypes.map((input) => (
            <Fragment key={input.profile?.slug}>
              {/* hide list heading when there is only one (current user) */}
              {(props.eventTypes.length !== 1 || input.teamId) && (
                <EventTypeListHeading
                  profile={input.profile}
                  membershipCount={input.metadata?.membershipCount}
                />
              )}
              <EventTypeList
                types={input.eventTypes}
                profile={input.profile}
                readOnly={input.metadata?.readOnly}
              />
            </Fragment>
          ))}

        {props.eventTypes.length === 0 && <CreateFirstEventTypeView />}
      </Shell>
    </div>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  const locale = await getOrSetUserLocaleFromHeaders(context.req);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  /**
   * This makes the select reusable and type safe.
   * @url https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/prisma-validator#using-the-prismavalidator
   * */
  const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
    id: true,
    title: true,
    description: true,
    length: true,
    schedulingType: true,
    slug: true,
    hidden: true,
    price: true,
    currency: true,
    users: {
      select: {
        id: true,
        avatar: true,
        name: true,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      avatar: true,
      completedOnboarding: true,
      createdDate: true,
      plan: true,
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              members: {
                select: {
                  userId: true,
                },
              },
              eventTypes: {
                select: eventTypeSelect,
              },
            },
          },
        },
      },
      eventTypes: {
        where: {
          team: null,
        },
        select: eventTypeSelect,
      },
    },
  });

  if (!user) {
    // this shouldn't happen
    return {
      redirect: {
        permanent: false,
        destination: "/auth/login",
      },
    };
  }

  if (
    shouldShowOnboarding({ completedOnboarding: user.completedOnboarding, createdDate: user.createdDate })
  ) {
    return ONBOARDING_NEXT_REDIRECT;
  }

  // backwards compatibility, TMP:
  const typesRaw = await prisma.eventType.findMany({
    where: {
      userId: session.user.id,
    },
    select: eventTypeSelect,
  });

  type EventTypeGroup = {
    teamId?: number | null;
    profile: {
      slug: typeof user["username"];
      name: typeof user["name"];
      image: typeof user["avatar"];
    };
    metadata: {
      membershipCount: number;
      readOnly: boolean;
    };
    eventTypes: (typeof user.eventTypes[number] & { $disabled?: boolean })[];
  };

  let eventTypeGroups: EventTypeGroup[] = [];
  const eventTypesHashMap = user.eventTypes.concat(typesRaw).reduce((hashMap, newItem) => {
    const oldItem = hashMap[newItem.id] || {};
    hashMap[newItem.id] = { ...oldItem, ...newItem };
    return hashMap;
  }, {} as Record<number, EventTypeGroup["eventTypes"][number]>);
  const mergedEventTypes = Object.values(eventTypesHashMap).map((et, index) => ({
    ...et,
    $disabled: user.plan === "FREE" && index > 0,
  }));

  eventTypeGroups.push({
    teamId: null,
    profile: {
      slug: user.username,
      name: user.name,
      image: user.avatar,
    },
    eventTypes: mergedEventTypes,
    metadata: {
      membershipCount: 1,
      readOnly: false,
    },
  });

  eventTypeGroups = ([] as EventTypeGroup[]).concat(
    eventTypeGroups,
    user.teams.map((membership) => ({
      teamId: membership.team.id,
      profile: {
        name: membership.team.name,
        image: membership.team.logo || "",
        slug: "team/" + membership.team.slug,
      },
      metadata: {
        membershipCount: membership.team.members.length,
        readOnly: membership.role !== "OWNER",
      },
      eventTypes: membership.team.eventTypes,
    }))
  );

  const userObj = Object.assign({}, user, {
    createdDate: user.createdDate.toString(),
  });

  const canAddEvents = user.plan !== "FREE" || eventTypeGroups[0].eventTypes.length < 1;

  return {
    props: {
      session,
      localeProp: locale,
      canAddEvents,
      user: userObj,
      // don't display event teams without event types,
      eventTypes: eventTypeGroups.filter((groupBy) => !!groupBy.eventTypes?.length),
      // so we can show a dropdown when the user has teams
      profiles: eventTypeGroups.map((group) => ({
        teamId: group.teamId,
        ...group.profile,
        ...group.metadata,
      })),
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

export default EventTypesPage;
