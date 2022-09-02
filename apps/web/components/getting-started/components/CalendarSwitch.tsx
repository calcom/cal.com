import { useMutation } from "react-query";

import showToast from "@calcom/lib/notification";

import { Switch } from "./Switch";

interface ICalendarSwitchProps {
  title: string;
  externalId: string;
  type: string;
  isChecked: boolean;
  name: string;
}
const CalendarSwitch = (props: ICalendarSwitchProps) => {
  // const utils = trpc.useContext();
  const { title, externalId, type, isChecked, name } = props;

  const mutation = useMutation<
    unknown,
    unknown,
    {
      isOn: boolean;
    }
  >(
    async ({ isOn }) => {
      const body = {
        integration: type,
        externalId: externalId,
      };
      console.log({ body });
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
        // await utils.invalidateQueries(["viewer.integrations"]);
      },
      onError() {
        showToast(`Something went wrong when toggling "${title}""`, "error");
      },
    }
  );
  return (
    <div className="flex flex-row items-center">
      <div className="flex px-2 py-1">
        <Switch
          id={externalId}
          defaultSelected={isChecked}
          onCheckedChange={(isOn: boolean) => {
            mutation.mutate({ isOn });
          }}
        />
      </div>
      <label className="text-sm" htmlFor={externalId}>
        {name}
      </label>
    </div>
  );
};

export { CalendarSwitch };
