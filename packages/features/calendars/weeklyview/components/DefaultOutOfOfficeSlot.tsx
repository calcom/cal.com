import type { OutOfOfficeRenderProps } from "@calcom/features/calendars/weeklyview/types/state";
import ServerTrans from "@calcom/lib/components/ServerTrans";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";

export function DefaultOutOfOfficeSlot(props: OutOfOfficeRenderProps) {
  const { t } = useLocale();
  const {
    fromUser,
    toUser,
    emoji = "\u{1F3DD}\uFE0F",
    reason,
    borderDashed = true,
    className,
    notes,
    showNotePublicly,
  } = props;

  const isHoliday = !fromUser && reason;

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
      </div>
    </div>
  );
}
