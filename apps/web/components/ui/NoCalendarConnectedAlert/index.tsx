import { useTranslation } from "next-i18next";
import { Trans } from "next-i18next";

import { trpc } from "@calcom/trpc/react";
// @TODO: alert v2
import { Alert } from "@calcom/ui/Alert";

import { LinkText } from "../LinkText";

const NoCalendarConnectedAlert = () => {
  const { t } = useTranslation();

  const query = trpc.viewer.connectedCalendars.useQuery();
  // We are not gonna show this alert till we fetch data from DB
  let defaultCalendarConnected = true;
  if (query.isSuccess && query.isFetched && query.data) {
    defaultCalendarConnected =
      query.data.connectedCalendars.length > 0 && query.data.destinationCalendar !== undefined;
  }
  return (
    <>
      {!defaultCalendarConnected && (
        <Alert
          severity="warning"
          className="mb-4"
          title={<>{t("missing_connected_calendar") as string}</>}
          message={
            <Trans i18nKey="connect_your_calendar_and_link">
              You can connect your calendar from
              <LinkText
                data-testid="no-calendar-connected-alert"
                href="/apps/categories/calendar"
                classNameChildren="underline">
                here
              </LinkText>
              .
            </Trans>
          }
        />
      )}
    </>
  );
};
export default NoCalendarConnectedAlert;
