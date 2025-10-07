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
  background: string;
  features: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  children: ReactNode;
  isParentLoading?: ReactNode;
  plan: "team" | "enterprise";
}) {
  const { resolvedTheme } = useGetTheme();
  const { isPending, hasTeamPlan } = useHasTeamPlan();
  const { data } = trpc.viewer.teams.getUpgradeable.useQuery();
  const imageSrc = `${background}${resolvedTheme === "dark" ? "-dark" : ""}.jpg`;

  const hasEnterprisePlan = false;
  const hasUnpublishedTeam = !!data?.[0];

  if (plan === "team" && (hasTeamPlan || hasUnpublishedTeam)) return <>{children}</>;
  if (plan === "enterprise" && hasEnterprisePlan) return <>{children}</>;
  if (isPending) return <>{isParentLoading}</>;

  return (
    <>
      {/* Hero Section */}
      <div className="relative flex min-h-[320px] w-full flex-col items-center justify-between overflow-hidden rounded-2xl pb-12 sm:flex-row sm:pb-16">
        <picture className="absolute inset-0 h-full w-full rounded-2xl object-cover">
          <source srcSet={imageSrc} media="(prefers-color-scheme: dark)" />
          <img
            className="absolute inset-0 h-full w-full select-none rounded-2xl object-cover object-left md:object-center"
            src={imageSrc}
            loading="lazy"
            alt={title}
          />
        </picture>

        {/* Text & Buttons */}
        <div className="relative z-10 my-6 w-full px-5 sm:px-14 md:max-w-[60%]">
          <h1 className={classNames("font-cal mt-2 text-2xl sm:text-3xl")}>{title}</h1>
          <p className={classNames("mb-6 mt-3 max-w-sm text-base sm:text-lg")}>{description}</p>

          <div className="flex flex-wrap gap-3 sm:gap-4">{buttons}</div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-6 grid-cols-3 gap-4 md:grid">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="bg-muted mb-4 min-h-[180px] w-full rounded-xl p-6 sm:p-8 md:mb-0">
            {feature.icon}
            <h2 className="font-cal text-emphasis mt-3 text-lg">{feature.title}</h2>
            <p className="text-default">{feature.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
