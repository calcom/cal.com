import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";
import { useHasTeamPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { trpc } from "@calcom/trpc";

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
  /**Chldren renders when the user is in a team */
  children: JSX.Element;
  isParentLoading?: ReactNode;
  plan: "team" | "enterprise";
}) {
  const { activeTheme } = useGetTheme();
  const { t } = useLocale();
  const { isPending, hasTeamPlan } = useHasTeamPlan();
  const { data } = trpc.viewer.teams.getUpgradeable.useQuery();
  const imageSrc = `${background}${activeTheme === "dark" ? "-dark" : ""}.jpg`;

  const hasEnterprisePlan = false;
  //const { isPending , hasEnterprisePlan } = useHasEnterprisePlan();

  const hasUnpublishedTeam = !!data?.[0];

  if (plan === "team" && (hasTeamPlan || hasUnpublishedTeam)) return children;

  if (plan === "enterprise" && hasEnterprisePlan) return children;

  if (isPending) return <>{isParentLoading}</>;

  return (
    <>
      <div className="relative flex min-h-[295px] w-full items-center justify-between overflow-hidden rounded-lg pb-10">
        <picture className="absolute min-h-[295px] w-full rounded-lg object-cover">
          <source srcSet={imageSrc} media="(prefers-color-scheme: dark)" />
          <img
            className="absolute min-h-[295px] w-full select-none rounded-lg object-cover object-left md:object-center"
            src={imageSrc}
            loading="lazy"
            alt={title}
          />
        </picture>
        <div className="relative my-4 px-8 sm:px-14">
          <h1 className={classNames("font-cal text-3xl")}>{t(title)}</h1>
          <p className={classNames("mb-8 mt-4 max-w-sm")}>{t(description)}</p>
          {buttons}
        </div>
      </div>

      <div className="mt-4 grid-cols-3 md:grid md:gap-4">
        {features.map((feature) => (
          <div key={feature.title} className="bg-muted mb-4 min-h-[180px] w-full rounded-md  p-8 md:mb-0">
            {feature.icon}
            <h2 className="font-cal text-emphasis mt-4 text-lg">{feature.title}</h2>
            <p className="text-default">{feature.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
