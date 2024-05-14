import type { useEventReturnType } from "@calcom/features/bookings/Booker/utils/event";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import { Button, UserAvatarGroupWithOrg } from "@calcom/ui";

interface IInstantBookingProps {
  onConnectNow: () => void;
  event: NonNullable<useEventReturnType["data"]>;
}

export const InstantBooking = ({ onConnectNow, event }: IInstantBookingProps) => {
  const { t } = useLocale();

  return (
    <div className=" bg-default border-subtle mx-2 block items-center gap-3 rounded-xl border p-[6px] text-sm shadow-sm delay-1000 sm:flex">
      <div className="flex items-center gap-3 ps-1">
        <div className="relative">
          <UserAvatarGroupWithOrg
            size="sm"
            className="border-muted"
            organization={{
              slug: event.entity.orgSlug,
              name: event.entity.name || "",
            }}
            users={event.schedulingType !== SchedulingType.ROUND_ROBIN ? event.users : []}
          />
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
