"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import AvailabilityPage, { AvailabilityCTA } from "~/availability/availability-view";

import { ShellMainAppDir } from "../ShellMainAppDir";

const Page = () => {
  const { t } = useLocale();
  return (
    <ShellMainAppDir
      heading={t("availability")}
      subtitle={t("configure_availability")}
      CTA={<AvailabilityCTA />}>
      <AvailabilityPage />
    </ShellMainAppDir>
  );
};

export default Page;
