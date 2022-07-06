import { useTranslation } from "next-i18next";
import Head from "next/head";

import classNames from "@calcom/lib/classNames";

import { StepCard } from "./components/StepCard";
import { Steps } from "./components/Steps";

const OnboardingPage = () => {
  const { t } = useTranslation();
  const steps = ["user_settings", "connect_calendar", "setup_availability", "user_profile"];
  const currentStep = 0;
  const goToStep = () => {
    console.log("go to step");
  };
  return (
    <div className="dark:bg-brand dark:text-brand-contrast min-h-screen text-black" data-testid="onboarding">
      <Head>
        <title>Cal.com - {t("getting_started")}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        style={{
          border: "1px solid red",
          height: "500px",
        }}>
        <div className="mx-auto px-4 py-24">
          <article className="relative">
            <section className="space-y-4 sm:mx-auto sm:w-full sm:max-w-lg">
              <header>
                <p className="font-cal mb-2 text-[28px] tracking-wider">{t("welcome_to_calcom")}!</p>
                <p className="text-sm font-normal text-gray-500">
                  We just need some basic info to get your profile setup.
                </p>
                <p className="text-sm font-normal text-gray-500">You’ll be able to edit this later.</p>
              </header>
              <Steps maxSteps={steps.length} currentStep={currentStep} navigateToStep={goToStep} />
              <StepCard>
                <p>Hola</p>
              </StepCard>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
