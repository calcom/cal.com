import React, { Fragment, ReactNode } from "react";

import { List } from "@components/List";
import { Alert } from "@components/ui/Alert";
import Button from "@components/ui/Button";

import CalendarSwitch from "./CalendarSwitch";
import DisconnectIntegration from "./DisconnectIntegration";
import IntegrationListItem from "./IntegrationListItem";

type CalIntersection =
  | {
      calendars: {
        externalId: string;
        name: string;
        isSelected: boolean;
      }[];
      error?: never;
    }
  | {
      calendars?: never;
      error: {
        message: string;
      };
    };

type Props = {
  onChanged: (isOpen: boolean) => void | Promise<void>;
  connectedCalendars: (CalIntersection & {
    credentialId: number;
    integration: {
      type: string;
      imageSrc: string;
      title: string;
      children?: ReactNode;
    };
    primary?: { externalId: string } | undefined | null;
  })[];
};

const ConnectedCalendarsList = (props: Props): JSX.Element => {
  const { connectedCalendars, onChanged } = props;
  return (
    <List>
      {connectedCalendars.map((item) => (
        <Fragment key={item.credentialId}>
          {item.calendars ? (
            <IntegrationListItem
              {...item.integration}
              description={item.primary?.externalId || "No external Id"}
              actions={
                <DisconnectIntegration
                  id={item.credentialId}
                  render={(btnProps) => (
                    <Button {...btnProps} color="warn">
                      Disconnect
                    </Button>
                  )}
                  onOpenChange={onChanged}
                />
              }>
              <ul className="p-4 space-y-2">
                {item.calendars.map((cal) => (
                  <CalendarSwitch
                    key={cal.externalId}
                    externalId={cal.externalId}
                    title={cal.name}
                    type={item.integration.type}
                    defaultSelected={cal.isSelected}
                  />
                ))}
              </ul>
            </IntegrationListItem>
          ) : (
            <Alert
              severity="warning"
              title="Something went wrong"
              message={item.error?.message}
              actions={
                <DisconnectIntegration
                  id={item.credentialId}
                  render={(btnProps) => (
                    <Button {...btnProps} color="warn">
                      Disconnect
                    </Button>
                  )}
                  onOpenChange={onChanged}
                />
              }
            />
          )}
        </Fragment>
      ))}
    </List>
  );
};

export default ConnectedCalendarsList;
