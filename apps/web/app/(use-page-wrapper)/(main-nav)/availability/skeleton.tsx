"use client";

import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";

import SkeletonLoader from "@calcom/features/availability/components/SkeletonLoader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { AvailabilityCTA } from "~/availability/availability-view";

export default function AvailabilityLoader() {
  const { t } = useLocale();
  const toggleGroupOptions = [
    { value: "mine", label: t("my_availability") },
    { value: "team", label: t("team_availability") },
  ];

  return (
    <ShellMainAppDir
      heading={t("availability")}
      subtitle={t("configure_availability")}
      CTA={<AvailabilityCTA toggleGroupOptions={toggleGroupOptions} />}>
      <SkeletonLoader />
    </ShellMainAppDir>
  );
}
