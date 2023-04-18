import { useMemo } from "react";
import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";
import { useHasPaidPlan } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import isCalcom from "@calcom/lib/isCalcom";
import { EmptyScreen } from "@calcom/ui";
import { FiUsers } from "@calcom/ui/components/icon";

export function UpgradeTip({
  dark,
  title,
  description,
  background,
  features,
  buttons,
  isParentLoading,
  children,
}: {
  dark?: boolean;
  title: string;
  description: string;
  background: string;
  features: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  /**Chldren renders when the user is in a team */
  children: JSX.Element;
  isParentLoading?: ReactNode;
}) {
  const { t } = useLocale();
  const { isLoading, hasPaidPlan } = useHasPaidPlan();

  if (hasPaidPlan) return children;

  if (isParentLoading || isLoading) return <>{isParentLoading}</>;

  if (!isCalcom)
    return <EmptyScreen Icon={FiUsers} headline={title} description={description} buttonRaw={buttons} />;

  return (
    <>
      <div className="-mt-10 rtl:ml-4 sm:mt-0 md:rtl:ml-0 lg:-mt-6">
        <div
          className="flex w-full justify-between overflow-hidden rounded-lg pt-4 pb-10 md:min-h-[295px] md:pt-10"
          style={{
            background: `url(${background})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}>
          <div className="mt-3 px-8 sm:px-14">
            <h1 className={classNames("font-cal text-3xl", dark && "text-white")}>{t(title)}</h1>
            <p className={classNames("my-4 max-w-sm", dark ? "text-white" : "text-gray-600")}>
              {t(description)}
            </p>
            {buttons}
          </div>
        </div>

        <div className="mt-4 grid-cols-3 md:grid md:gap-4">
          {features.map((feature) => (
            <div key={feature.title} className="mb-4 min-h-[180px] w-full rounded-md bg-gray-50 p-8 md:mb-0">
              {feature.icon}
              <h2 className="font-cal mt-4 text-lg">{feature.title}</h2>
              <p className="text-gray-700">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
