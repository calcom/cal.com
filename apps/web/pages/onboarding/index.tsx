import { GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import Head from "next/head";
import { useState } from "react";

import { User } from "@calcom/prisma/client";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import { StepCard } from "./components/StepCard";
import { Steps } from "./components/Steps";
import { ConnectedCalendars } from "./steps-views/ConnectCalendars";
import { SetupAvailability } from "./steps-views/SetupAvailability";
import { UserSettings } from "./steps-views/UserSettings";

interface IOnboardingPageProps {
  user: User;
}

const OnboardingPage = (props: IOnboardingPageProps) => {
  const { user } = props;
  const { t } = useTranslation();
  const steps = ["user_settings", "connected_calendar", "setup_availability", "user_profile"];
  const [currentStep, setCurrentStep] = useState(0);
  const goToStep = (newStep: number) => {
    setCurrentStep(newStep);
  };

  const headers = [
    {
      title: `${t("welcome_to_calcom")}!`,
      subtitle: ["We just need some basic info to get your profile setup."],
    },
    {
      title: `Connect your calendar`,
      subtitle: [
        "Connect your calendar to automatically check for busy times and new events as they’re scheduled.",
      ],
    },
    {
      title: "Set your availability",
      subtitle: [
        "Define ranges of time when you are available.",
        "You can customise all of this later in the availability page.",
      ],
    },
  ];

  return (
    <div className="dark:bg-brand dark:text-brand-contrast min-h-screen text-black" data-testid="onboarding">
      <Head>
        <title>Cal.com - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto px-4 py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <div className="mx-auto sm:max-w-lg">
              <header>
                <p className="font-cal mb-2 text-[28px] tracking-wider">
                  {headers[currentStep]?.title || "Undefined title"}
                </p>

                {headers[currentStep]?.subtitle.map((subtitle, index) => (
                  <p className="text-sm font-normal text-gray-500" key={index}>
                    {subtitle}
                  </p>
                ))}
              </header>
              <Steps maxSteps={steps.length} currentStep={currentStep} navigateToStep={goToStep} />
            </div>
            <StepCard>
              {steps[currentStep] === "user_settings" && (
                <UserSettings user={user} nextStep={() => goToStep(1)} />
              )}

              {steps[currentStep] === "connected_calendar" && (
                <ConnectedCalendars nextStep={() => goToStep(2)} />
              )}

              {steps[currentStep] === "setup_availability" && (
                <SetupAvailability nextStep={() => goToStep(3)} />
              )}
            </StepCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getSession(context);

  if (!session?.user?.id) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      timeZone: true,
      weekStart: true,
      hideBranding: true,
      theme: true,
      plan: true,
      brandColor: true,
      darkBrandColor: true,
      metadata: true,
      timeFormat: true,
      allowDynamicBooking: true,
    },
  });

  if (!user) {
    throw new Error("User from session not found");
  }

  return {
    props: {
      user: user,
    },
  };
};

export default OnboardingPage;
