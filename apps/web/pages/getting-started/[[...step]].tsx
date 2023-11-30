import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useParamsWithFallback } from "@calcom/lib/hooks/useParamsWithFallback";
import prisma from "@calcom/prisma";
import { trpc } from "@calcom/trpc";
import { Button, StepCard, Steps } from "@calcom/ui";
import { Loader } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";
import { ConnectedCalendars } from "@components/getting-started/steps-views/ConnectCalendars";
import { ConnectedVideoStep } from "@components/getting-started/steps-views/ConnectedVideoStep";
import { SetupAvailability } from "@components/getting-started/steps-views/SetupAvailability";
import UserProfile from "@components/getting-started/steps-views/UserProfile";
import { UserSettings } from "@components/getting-started/steps-views/UserSettings";

import { ssrInit } from "@server/lib/ssr";

const INITIAL_STEP = "user-settings";
const steps = [
  "user-settings",
  "connected-calendar",
  "connected-video",
  "setup-availability",
  "user-profile",
] as const;

const stepTransform = (step: (typeof steps)[number]) => {
  const stepIndex = steps.indexOf(step);
  if (stepIndex > -1) {
    return steps[stepIndex];
  }
  return INITIAL_STEP;
};

const stepRouteSchema = z.object({
  step: z.array(z.enum(steps)).default([INITIAL_STEP]),
  from: z.string().optional(),
});

// TODO: Refactor how steps work to be contained in one array/object. Currently we have steps,initalsteps,headers etc. These can all be in one place
const OnboardingPage = () => {
  const pathname = usePathname();
  const params = useParamsWithFallback();
  const router = useRouter();
  const [user] = trpc.viewer.me.useSuspenseQuery();
  const { t } = useLocale();
  const result = stepRouteSchema.safeParse(params);
  const currentStep = result.success ? result.data.step[0] : INITIAL_STEP;
  const from = result.success ? result.data.from : "";

  const headers = [
    {
      title: `${t("welcome_to_cal_header", { appName: APP_NAME })}`,
      subtitle: [`${t("we_just_need_basic_info")}`, `${t("edit_form_later_subtitle")}`],
    },
    {
      title: `${t("connect_your_calendar")}`,
      subtitle: [`${t("connect_your_calendar_instructions")}`],
      skipText: `${t("connect_calendar_later")}`,
    },
    {
      title: `${t("connect_your_video_app")}`,
      subtitle: [`${t("connect_your_video_app_instructions")}`],
      skipText: `${t("set_up_later")}`,
    },
    {
      title: `${t("set_availability")}`,
      subtitle: [
        `${t("set_availability_getting_started_subtitle_1")}`,
        `${t("set_availability_getting_started_subtitle_2")}`,
      ],
    },
    {
      title: `${t("nearly_there")}`,
      subtitle: [`${t("nearly_there_instructions")}`],
    },
  ];

  // TODO: Add this in when we have solved the ability to move to tokens accept invite and note invitedto
  // Ability to accept other pending invites if any (low priority)
  // if (props.hasPendingInvites) {
  //   headers.unshift(
  //     props.hasPendingInvites && {
  //       title: `${t("email_no_user_invite_heading", { appName: APP_NAME })}`,
  //       subtitle: [], // TODO: come up with some subtitle text here
  //     }
  //   );
  // }

  const goToIndex = (index: number) => {
    const newStep = steps[index];
    router.push(`/getting-started/${stepTransform(newStep)}`);
  };

  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div
      className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen [--cal-brand-emphasis:#101010] [--cal-brand-subtle:9CA3AF] [--cal-brand:#111827] [--cal-brand-text:#FFFFFF] dark:[--cal-brand-emphasis:#e1e1e1] dark:[--cal-brand:white] dark:[--cal-brand-text:#000000]"
      data-testid="onboarding"
      key={pathname}>
      <Head>
        <title>{`${APP_NAME} - ${t("getting_started")}`}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto py-6 sm:px-4 md:py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mx-auto px-4 sm:max-w-[520px]">
              <header>
                <p className="font-cal mb-3 text-[28px] font-medium leading-7">
                  {headers[currentStepIndex]?.title || "Undefined title"}
                </p>

                {headers[currentStepIndex]?.subtitle.map((subtitle, index) => (
                  <p className="text-subtle font-sans text-sm font-normal" key={index}>
                    {subtitle}
                  </p>
                ))}
              </header>
              <Steps maxSteps={steps.length} currentStep={currentStepIndex + 1} navigateToStep={goToIndex} />
            </div>
            <StepCard>
              <Suspense fallback={<Loader />}>
                {currentStep === "user-settings" && (
                  <UserSettings nextStep={() => goToIndex(1)} hideUsername={from === "signup"} />
                )}
                {currentStep === "connected-calendar" && <ConnectedCalendars nextStep={() => goToIndex(2)} />}

                {currentStep === "connected-video" && <ConnectedVideoStep nextStep={() => goToIndex(3)} />}

                {currentStep === "setup-availability" && (
                  <SetupAvailability
                    nextStep={() => goToIndex(4)}
                    defaultScheduleId={user.defaultScheduleId}
                  />
                )}
                {currentStep === "user-profile" && <UserProfile />}
              </Suspense>
            </StepCard>

            {headers[currentStepIndex]?.skipText && (
              <div className="flex w-full flex-row justify-center">
                <Button
                  color="minimal"
                  data-testid="skip-step"
                  onClick={(event) => {
                    event.preventDefault();
                    goToIndex(currentStepIndex + 1);
                  }}
                  className="mt-8 cursor-pointer px-4 py-2 font-sans text-sm font-medium">
                  {headers[currentStepIndex]?.skipText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { req, res } = context;

  const session = await getServerSession({ req, res });

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const ssr = await ssrInit(context);

  await ssr.viewer.me.prefetch();

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      completedOnboarding: true,
      teams: {
        select: {
          accepted: true,
          team: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  if (user.completedOnboarding) {
    return { redirect: { permanent: false, destination: "/event-types" } };
  }
  const locale = await getLocale(context.req);

  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
      trpcState: ssr.dehydrate(),
      hasPendingInvites: user.teams.find((team) => team.accepted === false) ?? false,
    },
  };
};

OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
