import { useGetTheme } from "@calcom/lib/hooks/useTheme";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { useHasTeamPlan } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";
import type { ReactNode } from "react";

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
  children: ReactNode;
  isParentLoading?: ReactNode;
  plan: "team" | "enterprise";
}) {
  const { resolvedTheme } = useGetTheme();
  const { isPending, hasTeamPlan } = useHasTeamPlan();
  const { data } = trpc.viewer.teams.getUpgradeable.useQuery();
  const imageSrc = `${background}${resolvedTheme === "dark" ? "-dark" : ""}.jpg`;

  const hasEnterprisePlan = false;
  //const { isPending , hasEnterprisePlan } = useHasEnterprisePlan();

  const hasUnpublishedTeam = !!data?.[0];

  if (plan === "team" && (hasTeamPlan || hasUnpublishedTeam)) return <>{children}</>;

  if (plan === "enterprise" && hasEnterprisePlan) return <>{children}</>;

  if (isPending) return <>{isParentLoading}</>;

  return (
    <>
      <div className="relative flex min-h-[295px] w-full items-center justify-between overflow-hidden rounded-lg pb-10">
        <picture className="absolute min-h-full w-full rounded-lg object-cover">
          {" "}
          <source srcSet={imageSrc} media="(prefers-color-scheme: dark)" />
          <img
            className="absolute min-h-full w-full select-none rounded-lg object-cover object-left md:object-[45%_30%] lg:object-center"
            src={imageSrc}
            loading="lazy"
            alt={title}
          />
        </picture>
        <div className="relative my-4 w-full px-4 pb-4 sm:px-8 md:px-8 lg:px-14">
          <h1 className={classNames("font-cal mt-4 text-2xl sm:text-3xl")}>{title}</h1>
          <p className={classNames("mb-8 mt-4 max-w-sm text-sm sm:text-base")}>{description}</p>
          {buttons}
        </div>
      </div>

      <div className="mt-4 grid-cols-3 md:grid md:gap-4">
        {features.map((feature) => (
          <div key={feature.title} className="bg-cal-muted mb-4 min-h-[180px] w-full rounded-md  p-8 md:mb-0">
            {feature.icon}
            <h2 className="font-cal text-emphasis mt-4 text-lg">{feature.title}</h2>
            <p className="text-default">{feature.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}
