import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

interface IInstantBookingProps {
  onConnectNow: () => void;
}
{
  /* TODO: max. show 4 people here */
  /* use AvatarGroup */
}

export const InstantBooking = ({ onConnectNow }: IInstantBookingProps) => {
  const { t } = useLocale();

  return (
    <div className=" bg-default border-subtle mx-2 block items-center gap-3 rounded-xl border p-[6px] text-sm shadow-sm delay-1000 sm:flex">
      <div className="flex items-center gap-3 ps-1">
        <div className="relative">
          <div className="border-muted absolute -bottom-0.5 -right-1 h-2 w-2 rounded-full border bg-green-500" />
        </div>
        <div>{t("dont_want_to_wait")}</div>
      </div>
      <div className="mt-2 sm:mt-0">
        <Button
          color="primary"
          onClick={() => {
            onConnectNow();
          }}
          size="sm"
          className="w-full justify-center rounded-lg sm:w-auto">
          {t("connect_now")}
        </Button>
      </div>
    </div>
  );
};
