import { DotsHorizontalIcon } from "@heroicons/react/solid";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { CalendarSwitch } from "./CalendarSwitch";

interface IConnectedCalendarItem {
  name: string;
  logo: string;
  externalId?: string;
  integrationType: string;
  calendars?: {
    primary: true | null;
    isSelected: boolean;
    credentialId: number;
    name?: string | undefined;
    readOnly?: boolean | undefined;
    userId?: number | undefined;
    integration?: string | undefined;
    externalId: string;
  }[];
}

const ConnectedCalendarItem = (prop: IConnectedCalendarItem) => {
  const { name, logo, externalId, calendars, integrationType } = prop;
  const { t } = useLocale();
  return (
    <>
      <div className="flex flex-row items-center p-4">
        <img src={logo} alt={name} className="h-8 w-8" />
        <div className="mx-4">
          <p className="text-sm font-bold">{name}</p>
          <div className="fle-row flex">
            <span
              title={externalId}
              className="max-w-44 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-500">
              {externalId}{" "}
            </span>
            <span className="mx-1 rounded-md bg-green-100 py-[2px] px-[6px] text-xs text-green-600">
              {t("default")}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="ml-auto flex h-9 w-9 rounded-md border border-gray-200 text-sm font-bold">
          <DotsHorizontalIcon className="m-auto h-4 w-4" />
        </button>
      </div>
      <div className="h-[1px] w-full border-b border-gray-200" />
      <div>
        <ul className="space-y-1 p-3">
          {calendars?.map((calendar) => (
            <CalendarSwitch
              key={calendar.externalId}
              externalId={calendar.externalId}
              title={calendar.name || "Nameless Calendar"}
              name={calendar.name || "Nameless Calendar"}
              type={integrationType}
              isChecked={calendar.isSelected}
            />
          ))}
        </ul>
      </div>
    </>
  );
};

export { ConnectedCalendarItem };
