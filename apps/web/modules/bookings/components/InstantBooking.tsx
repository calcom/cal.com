import type { BookerEvent } from "@calcom/features/bookings/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { UserAvatarGroupWithOrg } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Tooltip } from "@calcom/ui/components/tooltip";

interface IInstantBookingProps {
  onConnectNow: () => void;
  event: Pick<BookerEvent, "entity" | "schedulingType"> & {
    subsetOfUsers: (Pick<User, "name" | "username" | "avatarUrl"> & { bookerUrl: string })[];
  };
  cooldownMs?: number;
}

export const InstantBooking = ({ onConnectNow, event, cooldownMs = 0 }: IInstantBookingProps) => {
  const { t } = useLocale();
  const disabled = cooldownMs > 0;

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
              logoUrl: event.entity.logoUrl ?? null,
            }}
            users={event.subsetOfUsers.slice(0, 2)}
            disableHref
          />
          <div className="border-muted absolute -bottom-0.5 -right-1 h-2 w-2 rounded-full border bg-green-500" />
        </div>
        <div>{t("dont_want_to_wait")}</div>
      </div>
      <div className="mt-2 flex items-center gap-3 sm:mt-0">
        {disabled ? (
          <Tooltip content={t("just_connected_description")}>
            <span className="inline-flex">
              <Button
                disabled={disabled}
                color="primary"
                onClick={() => {
                  onConnectNow();
                }}
                size="sm"
                className="w-full justify-center rounded-lg sm:w-auto">
                {t("connect_now")}
              </Button>
            </span>
          </Tooltip>
        ) : (
          <Button
            color="primary"
            onClick={() => {
              onConnectNow();
            }}
            size="sm"
            className="w-full justify-center rounded-lg sm:w-auto">
            {t("connect_now")}
          </Button>
        )}
      </div>
    </div>
  );
};
