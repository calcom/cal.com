import { UserCalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";

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
    delegationCredentialId: string | null;
  }[];
}

const ConnectedCalendarItem = (prop: IConnectedCalendarItem) => {
  const { name, logo, externalId, calendars, integrationType } = prop;

  return (
    <>
      <div className="flex flex-row items-center p-4">
        <img src={logo} alt={name} className="m-1 h-8 w-8" />
        <div className="mx-4">
          <p className="font-sans text-sm font-bold leading-5">
            {name}
            {/* Temporarily removed till we use it on another place */}
            {/* <span className="mx-1 rounded-[4px] bg-cal-success py-[2px] px-[6px] font-sans text-xs font-medium text-green-600">
              {t("default")}
            </span> */}
          </p>
          <div className="fle-row flex">
            <span
              title={externalId}
              className="max-w-44 text-subtle mt-1 overflow-hidden text-ellipsis whitespace-nowrap font-sans text-sm">
              {externalId}{" "}
            </span>
          </div>
        </div>
        {/* Temporarily removed */}
        {/* <Button
          color="minimal"
          type="button"
          className="ml-auto flex rounded-md border border-subtle py-[10x] px-4 font-sans text-sm">
          {t("edit")}
        </Button> */}
      </div>
      <div className="border-subtle h-px w-full border-b" />
      <div>
        <ul className="p-4">
          {calendars?.map((calendar, i) => (
            <UserCalendarSwitch
              credentialId={calendar.credentialId}
              key={calendar.externalId}
              externalId={calendar.externalId}
              title={calendar.name || "Nameless Calendar"}
              name={calendar.name || "Nameless Calendar"}
              type={integrationType}
              isChecked={calendar.isSelected}
              isLastItemInList={i === calendars.length - 1}
              delegationCredentialId={calendar.delegationCredentialId}
            />
          ))}
        </ul>
      </div>
    </>
  );
};

export { ConnectedCalendarItem };
