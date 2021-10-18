import React, { ReactNode } from "react";

import { List } from "@components/List";
import Button from "@components/ui/Button";

import ConnectIntegration from "./ConnectIntegrations";
import IntegrationListItem from "./IntegrationListItem";

interface Props {
  calendars: {
    children?: ReactNode;
    description: string;
    imageSrc: string;
    title: string;
    type: string;
  }[];
}

const CalendarsList = (props: Props): JSX.Element => {
  const { calendars } = props;
  return (
    <List>
      {calendars.map((item) => (
        <IntegrationListItem
          key={item.title}
          {...item}
          actions={
            <ConnectIntegration
              type={item.type}
              render={(btnProps) => (
                <Button color="secondary" {...btnProps}>
                  Connect
                </Button>
              )}
            />
          }
        />
      ))}
    </List>
  );
};

export default CalendarsList;
