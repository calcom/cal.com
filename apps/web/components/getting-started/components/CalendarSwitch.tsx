import { useMutation } from "@tanstack/react-query";

import { trpc } from "@calcom/trpc/react";
import { showToast, Switch } from "@calcom/ui";

import classNames from "@lib/classNames";

interface ICalendarSwitchProps {
  title: string;
  externalId: string;
  type: string;
  isChecked: boolean;
  name: string;
  isLastItemInList?: boolean;
}
const CalendarSwitch = (props: ICalendarSwitchProps) => {
  const { title, externalId, type, isChecked, name, isLastItemInList = false } = props;
  const utils = trpc.useContext();
  const mutation = useMutation<
    unknown,
    unknown,
    {
      isOn: boolean;
    }
  >(
    async ({ isOn }: { isOn: boolean }) => {
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
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      } else {
        const res = await fetch("/api/availability/calendar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      }
    },
    {
      async onSettled() {
        await utils.viewer.integrations.invalidate();
      },
      onError() {
        showToast(`Something went wrong when toggling "${title}""`, "error");
      },
    }
  );
  return (
    <div className={classNames("flex flex-row items-center", !isLastItemInList ? "mb-4" : "")}>
      <div className="flex pl-2">
        <Switch
          id={externalId}
          defaultChecked={isChecked}
          onCheckedChange={(isOn: boolean) => {
            mutation.mutate({ isOn });
          }}
        />
      </div>
      <label className="ml-3 text-sm font-medium leading-5" htmlFor={externalId}>
        {name}
      </label>
    </div>
  );
};

export { CalendarSwitch };
