import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui";
import { CalendarSwitchComponent } from "@calcom/ui";

export type ICalendarSwitchProps = {
  title: string;
  externalId: string;
  type: string;
  isChecked: boolean;
  name: string;
  isLastItemInList?: boolean;
  destination?: boolean;
  credentialId: number;
};

const CalendarSwitch = (props: ICalendarSwitchProps) => {
  const isPlatform = useIsPlatform();

  return !isPlatform ? <WebCalendarSwitch {...props} /> : <></>;
};

const WebCalendarSwitch = (props: ICalendarSwitchProps) => {
  const { isChecked, title, credentialId, type, externalId } = props;
  const [checkedInternal, setCheckedInternal] = useState(isChecked);

  const utils = trpc.useContext();
  const { t } = useLocale();
  const mutation = useMutation({
    mutationFn: async ({ isOn }: { isOn: boolean }) => {
      const body = {
        integration: type,
        externalId: externalId,
      };

      if (isOn) {
        const res = await fetch("/api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...body, credentialId }),
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      } else {
        const res = await fetch(`/api/availability/calendar?${new URLSearchParams(body)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      }
    },
    async onSettled() {
      await utils.viewer.integrations.invalidate();
      await utils.viewer.connectedCalendars.invalidate();
    },
    onError() {
      setCheckedInternal(false);
      showToast(`Something went wrong when toggling "${title}"`, "error");
    },
  });

  return (
    <CalendarSwitchComponent
      {...props}
      isChecked={checkedInternal}
      isLoading={mutation.isPending}
      onCheckedChange={async (isOn: boolean) => {
        setCheckedInternal(isOn);
        await mutation.mutate({ isOn });
      }}
      translations={{
        spanText: t("adding_events_to"),
      }}
    />
  );
};

export { CalendarSwitch };
