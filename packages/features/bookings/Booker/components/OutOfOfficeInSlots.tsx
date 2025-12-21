import { useRouter } from "next/navigation";

import type { IOutOfOfficeData } from "@calcom/features/availability/lib/getUserAvailability";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";

interface IOutOfOfficeInSlotsProps {
  date: string;
  fromUser?: IOutOfOfficeData["anyDate"]["fromUser"];
  toUser?: IOutOfOfficeData["anyDate"]["toUser"];
  emoji?: string;
  reason?: string;
  notes?: string | null;
  showNotePublicly?: boolean;
  borderDashed?: boolean;
  className?: string;
}

export const OutOfOfficeInSlots = (props: IOutOfOfficeInSlotsProps) => {
  const { t } = useLocale();
  const {
    fromUser,
    toUser,
    emoji = "🏝️",
    reason,
    borderDashed = true,
    date,
    className,
    notes,
    showNotePublicly,
  } = props;
  const searchParams = useCompatSearchParams();

  const router = useRouter();

  // Check if this is a holiday (no fromUser but has reason)
  const isHoliday = !fromUser && reason;

  // For regular OOO, require fromUser (toUser is optional for redirect)
  // For holidays, we just need the reason
  if (!isHoliday && !fromUser) return null;
  return (
    <div className={classNames("relative h-full pb-5", className)}>
      <div
        className={classNames(
          "flex h-full flex-col items-center justify-start rounded-md border bg-white px-4 py-4 font-normal dark:bg-transparent",
          borderDashed && "border-dashed"
        )}>
        <div className="bg-emphasis flex h-14 w-14 flex-col items-center justify-center rounded-full">
          <span className="m-auto text-center text-lg">{emoji}</span>
        </div>
        <div className="stack-y-2 max-h-[300px] w-full overflow-y-auto text-center">
          {isHoliday ? (
            <>
              <p className="mt-2 text-base font-bold">{reason}</p>
              <p className="text-subtle text-center text-sm">{t("holiday_no_availability")}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-base font-bold">
                {t("ooo_user_is_ooo", { displayName: fromUser?.displayName })}
              </p>

              {notes && showNotePublicly && (
                <p className="text-subtle mt-2 max-h-[120px] overflow-y-auto break-words px-2 text-center text-sm italic">
                  {notes}
                </p>
              )}

              {fromUser?.displayName && toUser?.displayName && (
                <p className="text-center text-sm">
                  <ServerTrans
                    t={t}
                    i18nKey="ooo_slots_returning"
                    values={{ displayName: toUser.displayName }}
                    components={[<strong key="username">username</strong>]}
                  />
                </p>
              )}
            </>
          )}
        </div>
        {!isHoliday && toUser?.id && (
          <Button
            className="mt-8 max-w-[90%]"
            variant="button"
            color="secondary"
            onClick={() => {
              // grab current dates and query params from URL

              const month = searchParams.get("month");
              const layout = searchParams.get("layout");
              const targetDate = searchParams.get("date") || date;
              // go to the booking page with the selected user and correct search param
              // While being an org push will maintain the org context and just change the user in params
              router.push(
                `/${toUser.username}?${month ? `month=${month}&` : ""}date=${targetDate}${
                  layout ? `&layout=${layout}` : ""
                }`
              );
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
