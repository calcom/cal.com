import Link from "next/link";
import { Fragment } from "react";

import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { classNames } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Badge, ListItem, ListItemText, ListItemTitle, List } from "@calcom/ui";

import AdditionalCalendarSelector from "@components/apps/AdditionalCalendarSelector";

type fn = ({
  isOn,
  credentialId,
  externalId,
  type,
  title,
}: {
  title: string;
  isOn: boolean;
  credentialId: number;
  externalId: string;
  type: string;
}) => Promise<void>;
type fnw = ({
  isOn,
  credentialId,
  externalId,
  type,
  title,
}: {
  title: string;
  isOn: boolean;
  credentialId: number;
  externalId: string;
  type: string;
}) => void;

type CalendarListCustomProps = {
  data: any;
  isForm?: boolean;
  onCalendarRemove: (id: number) => void;
  onCalendarSwitchToggle: fn | fnw;
};
// const ta = trpc.viewer.connectedCalendars.useQuery();
// type query = typeof ta.data;
const CalendarListCustom = ({
  data,
  onCalendarRemove,
  isForm = false,
  onCalendarSwitchToggle,
}: CalendarListCustomProps) => {
  const { t } = useLocale();
  console.log("data", data);
  return (
    <div>
      <div className="border-subtle mt-8 flex items-center  justify-between rounded-t-lg border px-4 py-6 sm:px-6">
        <div>
          <h4 className="text-emphasis text-base font-semibold leading-5">{t("check_for_conflicts")}</h4>
          <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
        </div>
        {!isForm && <AdditionalCalendarSelector isLoading={false} />}
      </div>
      <List
        className={`border-subtle flex flex-col gap-6 border border-t-0 p-6 ${
          isForm ? "border-b-0" : "rounded-b-lg"
        }`}
        noBorderTreatment>
        {data?.connectedCalendars.map((item) => (
          <Fragment key={item.credentialId}>
            {item.error && item.error.message && (
              <Alert
                severity="warning"
                key={item.credentialId}
                title={t("calendar_connection_fail")}
                message={item.error.message}
                className="mb-4 mt-4"
                actions={
                  <>
                    {/* @TODO: add a reconnect button, that calls add api and delete old credential */}
                    <DisconnectIntegration
                      onClick={() => onCalendarRemove(item.credentialId)}
                      credentialId={item.credentialId}
                      trashIcon
                      //   onSuccess={() => query.refetch()}
                      buttonProps={{
                        className: "border border-default py-[2px]",
                        color: "secondary",
                      }}
                    />
                  </>
                }
              />
            )}
            {item?.error === undefined && item.calendars && !item?.removed && (
              <ListItem className="flex-col rounded-lg">
                <div className="flex w-full flex-1 items-center space-x-3 p-4 rtl:space-x-reverse">
                  {
                    // eslint-disable-next-line @next/next/no-img-element
                    item.integration.logo && (
                      <img
                        className={classNames(
                          "h-10 w-10",
                          item.integration.logo.includes("-dark") && "dark:invert"
                        )}
                        src={item.integration.logo}
                        alt={item.integration.title}
                      />
                    )
                  }
                  <div className="flex-grow truncate pl-2">
                    <ListItemTitle component="h3" className="mb-1 space-x-2 rtl:space-x-reverse">
                      <Link href={`/apps/${item.integration.slug}`}>
                        {item.integration.name || item.integration.title}
                      </Link>
                      {data?.destinationCalendar?.credentialId === item.credentialId && (
                        <Badge variant="green">Default</Badge>
                      )}
                    </ListItemTitle>
                    <ListItemText component="p">{item.integration.description}</ListItemText>
                  </div>
                  <div>
                    <DisconnectIntegration
                      onClick={() => onCalendarRemove(item.credentialId)}
                      trashIcon
                      credentialId={item.credentialId}
                      buttonProps={{ className: "border border-default" }}
                    />
                  </div>
                </div>
                <div className="border-subtle w-full border-t">
                  <p className="text-subtle px-2 pt-4 text-sm">{t("toggle_calendars_conflict")}</p>
                  <ul className="space-y-4 p-4">
                    {item.calendars.map((cal) => (
                      <CalendarSwitch
                        key={cal.externalId}
                        // credentialId={cal.credentialId}
                        onCheckedChange={async () =>
                          await onCalendarSwitchToggle({
                            credentialId: cal.credentialId,
                            externalId: cal.externalId,
                            type: item.integration.type,
                            title: cal.name || "Nameless calendar",
                            isOn: !(
                              cal.isSelected ||
                              (!isForm && cal.externalId === data?.destinationCalendar?.externalId)
                            ),
                          })
                        }
                        externalId={cal.externalId}
                        title={cal.name || "Nameless calendar"}
                        name={cal.name || "Nameless calendar"}
                        // type={item.integration.type}
                        isChecked={
                          cal.isSelected ||
                          (!isForm && cal.externalId === data?.destinationCalendar?.externalId)
                        }
                      />
                    ))}
                  </ul>
                </div>
              </ListItem>
            )}
          </Fragment>
        ))}
      </List>
    </div>
  );
};
export default CalendarListCustom;
