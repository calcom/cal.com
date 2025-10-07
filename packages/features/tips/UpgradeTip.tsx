/**
 * UpgradeTip component
 * Displays the hero section promoting plan upgrades.
 * Adjusted padding and spacing to fix mobile layout issue (#24276).
 */
import type { ReactNode } from "react";

import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { trpc } from "@calcom/trpc";
import classNames from "@calcom/ui/classNames";

export function UpgradeTip({
  title,
  description,
  background,
  _features,
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
      {/* Fixed layout and spacing for hero card (mobile) */}
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

        <div className="relative my-6 px-6 pb-8 sm:px-14 sm:pb-12">
          <h1 className={classNames("font-cal mt-4 text-3xl")}>{title}</h1>
          <p className={classNames("mb-8 mt-4 max-w-sm")}>{description}</p>
          {buttons}
        </div>
      </div>
    </>
  );
}
