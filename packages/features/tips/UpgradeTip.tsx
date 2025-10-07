import type { ReactNode } from "react";

import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { trpc } from "@calcom/trpc";
import classNames from "@calcom/ui/classNames";

export function UpgradeTip({
  title,
  description,
  background,
  features,
  buttons,
  isParentLoading,
  children,
  plan,
}: {
  title: string;
  description: string;
  /* overwrite EmptyScreen text */
  background: string;
  features: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  /** Children renders when the user is in a team */
  children: ReactNode;
  isParentLoading?: ReactNode;
  plan: "team" | "enterprise";
}) {
  const { resolvedTheme } = useGetTheme();
  const { isPending, hasTeamPlan } = useHasTeamPlan();
  const { data } = trpc.viewer.teams.getUpgradeable.useQuery();
  const imageSrc = `${background}${resolvedTheme === "dark" ? "-dark" : ""}.jpg`;

  const hasEnterprisePlan = false;
  // const { isPending , hasEnterprisePlan } = useHasEnterprisePlan();

  const hasUnpublishedTeam = !!data?.[0];

  if (plan === "team" && (hasTeamPlan || hasUnpublishedTeam)) return <>{children}</>;
  if (plan === "enterprise" && hasEnterprisePlan) return <>{children}</>;
  if (isPending) return <>{isParentLoading}</>;

  return (
    <>
      {/* Hero section */}
      <div className="relative flex min-h-[320px] w-full flex-col items-start justify-center overflow-hidden rounded-2xl p-6 sm:p-10">
        <picture className="absolute inset-0 h-full w-full rounded-2xl object-cover">
          <source srcSet={imageSrc} media="(prefers-color-scheme: dark)" />
          <img
            className="absolute inset-0 h-full w-full select-none rounded-2xl object-cover object-left md:object-center"
            src={imageSrc}
            loading="lazy"
            alt={title}
          />
        </picture>

        {/* Optional dark overlay for readability */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Text and buttons */}
        <div className="relative my-6 px-6 pb-8 sm:px-14 sm:pb-12">
          <h1 className={classNames("font-cal mt-4 text-3xl text-white")}>{title}</h1>
          <p className={classNames("mb-8 mt-4 max-w-sm text-gray-100")}>{description}</p>
          {buttons}
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-6 grid-cols-3 md:grid md:gap-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-muted mb-4 min-h-[180px] w-full rounded-md p-6 sm:p-8 md:mb-0">
            {feature.icon}
            <h2 className="font-cal text-emphasis mt-4 text-lg">{feature.title}</h2>
            <p className="text-default">{feature.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
