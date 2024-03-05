import { Trans } from "next-i18next";
import { useRouter } from "next/router";

import type { IOutOfOfficeData } from "@calcom/core/getUserAvailability";
import { classNames } from "@calcom/lib";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

interface IOutOfOfficeInSlotsProps {
  date: string;
  fromUser?: IOutOfOfficeData["anyDate"]["fromUser"];
  toUser?: IOutOfOfficeData["anyDate"]["toUser"];
  emoji?: string;
  reason?: string;
  borderDashed?: boolean;
}

export const OutOfOfficeInSlots = (props: IOutOfOfficeInSlotsProps) => {
  const { t } = useLocale();
  const { fromUser, toUser, emoji = "🏝️", borderDashed = true, date } = props;
  const searchParams = useCompatSearchParams();
  const router = useRouter();

  if (!fromUser) return null;
  return (
    <div className="h-full pb-2">
      <div
        className={classNames(
          "z-10 flex h-full flex-col items-center justify-start rounded-md border bg-white px-4 py-4 dark:bg-transparent",
          borderDashed && "border-dashed"
        )}>
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gray-400">
          <span className="h-11 text-center text-3xl">{emoji}</span>
        </div>
        <div className="space-y-2 text-center">
          <p className="mt-2 text-base font-bold">
            {t("ooo_user_is_ooo", { displayName: fromUser.displayName })}
          </p>

          {fromUser?.displayName && toUser?.displayName && (
            <p className="text-center text-sm">
              <Trans
                i18nKey="ooo_slots_returning"
                values={{ displayName: toUser.displayName }}
                default="<1>{{ displayName }}</1> can take their meetings while they are away."
                components={[<strong key="username">username</strong>]}
              />
            </p>
          )}
        </div>
        {toUser?.id && (
          <Button
            className="mt-8 max-w-[90%]"
            variant="button"
            color="secondary"
            onClick={() => {
              // grab current dates and query params from URL

              const month = searchParams.get("month");
              const layout = searchParams.get("layout");
              const targetDate = searchParams.get("date") || date;
              // go to the booking page with the selected user and correct search params
              // @TODO: should we make an api or server function to automatically generate the correct URL using user id considering orgs

              router.push(`/${toUser.username}?month=${month}&layout=${layout}&date=${targetDate}`);
            }}>
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
              {t("ooo_slots_book_with", { displayName: toUser.displayName })}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};
