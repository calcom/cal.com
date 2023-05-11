import { ArrowRightIcon } from "@heroicons/react/solid";

import classNames from "@calcom/lib/classNames";
import { trpc } from "@calcom/trpc/react";
import { SkeletonAvatar, SkeletonText, SkeletonButton, List } from "@calcom/ui";

import { CalendarItem } from "../components/CalendarItem";

interface ConnectedAppStepProps {
  nextStep: () => void;
}

const ConnectedVideoStep = (props: ConnectedAppStepProps) => {
  const { nextStep } = props;
  const { data: queryConnectedVideoApps, isLoading } = trpc.viewer.integrations.useQuery({
    variant: "conferencing",
    onlyInstalled: false,
  });
  // const { t } = useLocale();

  const disabledNextButton = false === undefined;
  return (
    <>
      {!isLoading && (
        <List className="bg-default  border-subtle divide-subtle scroll-bar mx-1 max-h-[45vh] divide-y !overflow-y-scroll rounded-md border p-0 sm:mx-0">
          {queryConnectedVideoApps?.items &&
            queryConnectedVideoApps?.items.map((item) => (
              <li key={item.name}>
                {item.name && item.logo && (
                  <CalendarItem
                    type={item.type}
                    title={item.name}
                    description={item.description}
                    logo={item.logo}
                  />
                )}
              </li>
            ))}
        </List>
      )}

      {isLoading && (
        <ul className="bg-default divide-subtle border-subtle divide-y rounded-md border p-0 dark:bg-black">
          {[0, 0, 0, 0].map((_item, index) => {
            return (
              <li className="flex w-full flex-row justify-center border-b-0 py-6" key={index}>
                <SkeletonAvatar className="mx-6 h-8 w-8 px-4" />
                <SkeletonText className="ml-1 mr-4 mt-3 h-5 w-full" />
                <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        data-testid="save-calendar-button"
        className={classNames(
          "text-inverted mt-8 flex w-full flex-row justify-center rounded-md border border-black bg-black p-2 text-center text-sm",
          disabledNextButton ? "cursor-not-allowed opacity-20" : ""
        )}
        onClick={() => nextStep()}
        disabled={disabledNextButton}>
        {/* {firstCalendar ? `${t("continue")}` : `${t("next_step_text")}`} */}
        <ArrowRightIcon className="ml-2 h-4 w-4 self-center" aria-hidden="true" />
      </button>
    </>
  );
};

export { ConnectedVideoStep };
