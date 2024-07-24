import { Fragment } from "react";

import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { QueryCell } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { List } from "@calcom/ui";
import AppListCard from "@calcom/web/components/AppListCard";

import { useConnectedCalendars } from "../hooks/useConnectedCalendars";
import { AtomsWrapper } from "../src/components/atoms-wrapper";

export const CalendarSettings = () => {
  const { t } = useLocale();
  const query = useConnectedCalendars({});

  return (
    <AtomsWrapper>
      <div>
        <QueryCell
          query={query}
          success={({ data }) => {
            console.log(data.connectedCalendars, "this is the query data".toLocaleUpperCase());

            data.connectedCalendars.map((item) =>
              console.log(item, "each individual item".toLocaleUpperCase())
            );

            if (!data.connectedCalendars.length) {
              return null;
            }

            return (
              <div className="border-subtle mt-6 rounded-lg border">
                <div className="border-subtle border-b p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-emphasis text-base font-semibold leading-5">
                        {t("check_for_conflicts")}
                      </h4>
                      <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
                    </div>
                  </div>
                </div>
                <List noBorderTreatment className="p-6 pt-2">
                  {data.connectedCalendars.map((item) => (
                    <Fragment key={item.credentialId}>
                      {item.calendars ? (
                        <>
                          <AppListCard
                            slug={item.integration.slug}
                            title={item.integration.name}
                            logo={item.integration.logo}
                            description={item.primary?.email ?? item.integration.description}
                            className="border-subtle mt-4 rounded-lg border"
                            actions={
                              <div className="flex w-32 justify-end">
                                <DisconnectIntegration
                                  slug={item.integration.slug}
                                  credentialId={item.credentialId}
                                  trashIcon
                                  buttonProps={{ className: "border border-default" }}
                                />
                              </div>
                            }
                            shouldHighlight>
                            <div className="border-subtle border-t">
                              <>
                                <p className="text-subtle px-5 pt-4 text-sm">
                                  {t("toggle_calendars_conflict")}
                                </p>
                                <ul className="space-y-4 px-5 py-4">
                                  {item.calendars.map((cal) => (
                                    <CalendarSwitch
                                      key={cal.externalId}
                                      externalId={cal.externalId}
                                      title={cal.name || "Nameless calendar"}
                                      name={cal.name || "Nameless calendar"}
                                      type={item.integration.type}
                                      isChecked={cal.isSelected}
                                      destination={cal.primary ?? false}
                                      credentialId={cal.credentialId}
                                    />
                                  ))}
                                </ul>
                              </>
                            </div>
                          </AppListCard>
                        </>
                      ) : (
                        <>Something went wrong</>
                      )}
                    </Fragment>
                  ))}
                </List>
              </div>
            );
          }}
        />
      </div>
    </AtomsWrapper>
  );
};
