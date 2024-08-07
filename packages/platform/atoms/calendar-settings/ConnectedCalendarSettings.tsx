import type { ReactNode } from "react";
import { Fragment } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui";

export const ConnectedCalendarSettings = (props: {
  isConnectedCalendarPresent: boolean;
  children: ReactNode;
  actions: ReactNode;
  errorMessage: ReactNode;
}) => {
  const { t } = useLocale();
  const { isConnectedCalendarPresent, children, actions, errorMessage } = props;

  return (
    <Fragment>
      {isConnectedCalendarPresent ? (
        <>{children}</>
      ) : (
        <Alert
          severity="warning"
          title={t("something_went_wrong")}
          message={errorMessage}
          iconClassName="h-10 w-10 ml-2 mr-1 mt-0.5"
          actions={actions}
        />
      )}
    </Fragment>
  );
};
