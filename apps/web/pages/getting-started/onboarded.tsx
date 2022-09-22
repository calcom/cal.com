import { GetServerSidePropsContext } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { getSession } from "@calcom/lib/auth";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import prisma from "@lib/prisma";

// CUSTOM_CODE: Update Properties from App DB
const OnboardedPage = () => {
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    // Force reload to invalidate session
    window.location.replace("/");
  }, []);

  return (
    <div
      className="bg-sunny-100 dark:text-brand-contrast min-h-screen text-black"
      data-testid="onboarding"
      key={router.asPath}>
      <Head>
        <title>Cal.com - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex items-center justify-center p-4">
        <img
          src="https://mento-space.nyc3.digitaloceanspaces.com/logo.svg"
          alt="logo"
          width="100"
          height="40"
        />
      </div>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      completedOnboarding: true,
    },
  });
  if (!user) {
    throw new Error("User from session not found");
  }

  if (process.env?.NEXT_PUBLIC_MENTO_COACH_URL && process.env?.NEXT_PUBLIC_CALENDAR_KEY) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_MENTO_COACH_URL}/api/calendar/coach?email=${user?.email}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.NEXT_PUBLIC_CALENDAR_KEY,
        },
        body: JSON.stringify({ onboarded: true, username: user?.username }),
      });
    } catch (e) {
      console.error(e);
    }
  }

  const eventTypes = await prisma.eventType.findMany({
    where: {
      userId: user?.id,
    },
  });

  if (!eventTypes?.length) {
    await prisma.eventType.create({
      data: {
        title: "Mento Bi-Weekly Coaching session",
        slug: "coaching-session",
        eventName: "{HOST} & {ATTENDEE} | Mento coaching",
        description: "",
        locations: [{ type: "integrations:google:meet" }],
        recurringEvent: { freq: 2, count: 24, interval: 2 },
        length: 45,
        hidden: false,
        owner: { connect: { id: user?.id } },
        users: {
          connect: {
            id: user?.id,
          },
        },
        afterEventBuffer: 15,
        minimumBookingNotice: 1440,
        slotInterval: 60,
      },
    });
    await prisma.eventType.create({
      data: {
        title: "Mento Single Coaching Session",
        slug: "single-coaching-session",
        eventName: "{HOST} & {ATTENDEE} | Mento coaching",
        description: "",
        locations: [{ type: "integrations:google:meet" }],
        length: 45,
        hidden: false,
        owner: { connect: { id: user?.id } },
        users: {
          connect: {
            id: user?.id,
          },
        },
        afterEventBuffer: 15,
        minimumBookingNotice: 1440,
        slotInterval: 60,
      },
    });
  }

  return { props: {} };
};

export default OnboardedPage;
