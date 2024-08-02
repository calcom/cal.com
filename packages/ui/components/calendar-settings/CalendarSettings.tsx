import Link from "next/link";
import type { ReactNode } from "react";
import { Fragment } from "react";

import { useIsPlatform } from "@calcom/atoms/monorepo";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { type ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import type { ButtonProps } from "@calcom/ui";
import { List, Alert } from "@calcom/ui";
import AppListCard from "@calcom/web/components/AppListCard";

type Props = {
  connectedCalendars: ConnectedDestinationCalendars["connectedCalendars"];
  additionalCalendarSelector?: JSX.Element;
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
};

export const CalendarSettings = (props: Props) => {
  const isPlatform = useIsPlatform();
  const { t } = useLocale();
  const { fromOnboarding, connectedCalendars, additionalCalendarSelector } = props;

  return (
    <div className="border-subtle mt-6 rounded-lg border">
      <div className="border-subtle border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-emphasis text-base font-semibold leading-5">{t("check_for_conflicts")}</h4>
            <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
          </div>
          <div className="flex flex-col xl:flex-row xl:space-x-5">
            {!!connectedCalendars.length && !isPlatform && (
              <div className="flex items-center">{additionalCalendarSelector}</div>
            )}
          </div>
        </div>
      </div>
      {/* pass in the list as child component  */}
      <List noBorderTreatment className="p-6 pt-2">
        {connectedCalendars.map((item) => (
          // this becomes a dumb component
          // need to add two children, one for disconnect integration and other for calendar switch type
          // Fragment becomes children prop and is extracted in ConnectedCalendarSettings
          <Fragment key={item.credentialId}>
            {item.calendars ? (
              <AppListCard
                shouldHighlight
                slug={item.integration.slug}
                title={item.integration.name}
                logo={!isPlatform ? item.integration.logo : `https://app.cal.com${item.integration.logo}`}
                description={item.primary?.email ?? item.integration.description}
                className="border-subtle mt-4 rounded-lg border"
                actions={
                  <div className="flex w-32 justify-end">
                    <DisconnectIntegration
                      slug={item.integration.slug}
                      credentialId={item.credentialId}
                      trashIcon
                      onSuccess={props.onChanged}
                      buttonProps={{ className: "border border-default" }}
                    />
                  </div>
                }>
                <div className="border-subtle border-t">
                  {!fromOnboarding && (
                    <>
                      <p className="text-subtle px-5 pt-4 text-sm">{t("toggle_calendars_conflict")}</p>
                      <ul className="space-y-4 px-5 py-4">
                        {item.calendars.map((cal) => {
                          console.log(cal, "calendarssssss", props.destinationCalendarId);

                          return (
                            // this can be passed in as children based on our wrapper, either platform calendar switch or web calendar switch
                            <CalendarSwitch
                              key={cal.externalId}
                              externalId={cal.externalId}
                              title={cal.name || "Nameless calendar"}
                              name={cal.name || "Nameless calendar"}
                              type={item.integration.type}
                              isChecked={cal.isSelected}
                              destination={cal.externalId === props.destinationCalendarId}
                              credentialId={cal.credentialId}
                            />
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              </AppListCard>
            ) : (
              <Alert
                severity="warning"
                title={t("something_went_wrong")}
                // this can be taken as a prope errorMessage
                message={
                  <span>
                    {!isPlatform ? (
                      <WebErrorMsg slug={item.integration.slug} name={item.integration.name} />
                    ) : (
                      t("calendar_error")
                    )}
                  </span>
                }
                iconClassName="h-10 w-10 ml-2 mr-1 mt-0.5"
                actions={
                  <div className="flex w-32 justify-end md:pr-1">
                    <DisconnectIntegration
                      credentialId={item.credentialId}
                      trashIcon
                      onSuccess={props.onChanged}
                      buttonProps={{ className: "border border-default" }}
                    />
                  </div>
                }
              />
            )}
          </Fragment>
        ))}
      </List>
    </div>
  );
};

const WebErrorMsg = (props: { slug: string; name: string }) => {
  const { t } = useLocale();

  return (
    <>
      <Link href={`/apps/${props.slug}`}>{props.name}</Link>: {t("calendar_error")}
    </>
  );
};

const ConnectedCalendarSettings = (props: { children: React.ReactNode }) => {
  // this is where the fragment is gonna be passed
  return <div>{props.children}</div>;
};

const ConnectedCalendarComponent = (props: {
  item: ConnectedDestinationCalendars["connectedCalendars"][number];
  destinationCalendarId?: string | undefined;
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  DisconnectIntegration: ReactNode;
}) => {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const { item, fromOnboarding } = props;

  return (
    <Fragment key={item.credentialId}>
      {item.calendars ? (
        <AppListCard
          shouldHighlight
          slug={item.integration.slug}
          title={item.integration.name}
          logo={!isPlatform ? item.integration.logo : `https://app.cal.com${item.integration.logo}`}
          description={item.primary?.email ?? item.integration.description}
          className="border-subtle mt-4 rounded-lg border"
          actions={
            <div className="flex w-32 justify-end">
              {props.DisconnectIntegration}
              {/* <ConnectedCalendarComponent.DisconnectIntegration />
                slug={item.integration.slug}
                credentialId={item.credentialId}
                trashIcon
                onSuccess={props.onChanged}
                buttonProps={{ className: "border border-default" }}
              /> */}
              <DisconnectIntegration
                slug={item.integration.slug}
                credentialId={item.credentialId}
                trashIcon
                onSuccess={props.onChanged}
                buttonProps={{ className: "border border-default" }}
              />
            </div>
          }>
          <div className="border-subtle border-t">
            {!fromOnboarding && (
              <>
                <p className="text-subtle px-5 pt-4 text-sm">{t("toggle_calendars_conflict")}</p>
                <ul className="space-y-4 px-5 py-4">
                  {item.calendars.map((cal) => {
                    console.log(cal, "calendarssssss", props.destinationCalendarId);

                    return (
                      // this can be passed in as children based on our wrapper, either platform calendar switch or web calendar switch
                      <div key={cal.externalId}>
                        <ConnectedCalendarComponent.CalendarSwitch
                          key={cal.externalId}
                          externalId={cal.externalId}
                          title={cal.name || "Nameless calendar"}
                          name={cal.name || "Nameless calendar"}
                          type={item.integration.type}
                          isChecked={cal.isSelected}
                          destination={cal.externalId === props.destinationCalendarId}
                          credentialId={cal.credentialId}
                        />
                        <CalendarSwitch
                          key={cal.externalId}
                          externalId={cal.externalId}
                          title={cal.name || "Nameless calendar"}
                          name={cal.name || "Nameless calendar"}
                          type={item.integration.type}
                          isChecked={cal.isSelected}
                          destination={cal.externalId === props.destinationCalendarId}
                          credentialId={cal.credentialId}
                        />
                      </div>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </AppListCard>
      ) : (
        <Alert severity="warning" title={t("something_went_wrong")} />
      )}
    </Fragment>
  );
};

const DisconnectIntegrationComponent = (props: {
  credentialId: number;
  label?: string;
  slug?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
  actions: JSX.Element;
}) => <div className="disconnect-integration" />;

const CalendarSwitchComponent = (props: ICalendarSwitchProps) => <div className="calendar-switch" />;

// ConnectedCalendarComponent.DisconnectIntegration = DisconnectIntegrationComponent;
// ConnectedCalendarComponent.CalendarSwitch = CalendarSwitchComponent;

ConnectedCalendarComponent.AppListCard = AppListCard;
// two app list card component
// one for platform
//  one for web
// render stuff inside the app list card based on wrapper
// pass in the item, or specific calendar
