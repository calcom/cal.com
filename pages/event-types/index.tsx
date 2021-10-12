import { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import React, { Fragment } from "react";

import { QueryCell } from "@lib/QueryCell";
import { getSession } from "@lib/auth";
import { getOrSetUserLocaleFromHeaders } from "@lib/core/i18n/i18n.utils";
import { ONBOARDING_NEXT_REDIRECT, shouldShowOnboarding } from "@lib/getting-started";
import { useLocale } from "@lib/hooks/useLocale";
import prisma from "@lib/prisma";
import { trpc } from "@lib/trpc";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import Shell from "@components/Shell";
import CreateFirstEventTypeView from "@components/eventtype/CreateFirstEventTypeView";
import CreateNewEventDialog from "@components/eventtype/CreateNewEventDialog";
import EventTypeList from "@components/eventtype/EventTypeList";
import EventTypeListHeading from "@components/eventtype/EventTypeListHeading";
import { Alert } from "@components/ui/Alert";

export type EventTypesPageProps = inferSSRProps<typeof getServerSideProps>;

const EventTypesPage = () => {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.eventTypes"]);

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
          query.data &&
          query.data.eventTypes.length !== 0 && (
            <CreateNewEventDialog canAddEvents={query.data.canAddEvents} profiles={query.data.profiles} />
          )
        }>
        <QueryCell
          query={query}
          success={({ data }) => (
            <>
              {data.user.plan === "FREE" && !data.canAddEvents && (
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
              {data.eventTypes &&
                data.eventTypes.map((input) => (
                  <Fragment key={input.profile.slug}>
                    {/* hide list heading when there is only one (current user) */}
                    {(data.eventTypes.length !== 1 || input.teamId) && (
                      <EventTypeListHeading
                        profile={input.profile}
                        membershipCount={input.metadata.membershipCount}
                      />
                    )}
                    <EventTypeList
                      types={input.eventTypes}
                      profile={input.profile}
                      readOnly={input.metadata.readOnly}
                    />
                  </Fragment>
                ))}

              {data.eventTypes.length === 0 && (
                <CreateFirstEventTypeView profiles={data.profiles} canAddEvents={data.canAddEvents} />
              )}
            </>
          )}
        />
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

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      completedOnboarding: true,
      createdDate: true,
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

  return {
    props: {
      session,
      localeProp: locale,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

export default EventTypesPage;
