import { ComponentMeta } from "@storybook/react";

import { EventTypeListItem } from "@calcom/ui/v2";

export default {
  title: "Event Type List Item",
  component: EventTypeListItem,
} as ComponentMeta<typeof EventTypeListItem>;

const props = {
  length: 300,
  id: 1,
  title: "This is a mock eventType",
  slug: "pro",
  description: "This is a mock description",
  hidden: false,
  requiresConfirmation: true,
  schedulingType: null,
  price: 0,
  recurringEvent: {},
  currency: "usd",
};

export const Default = () => {
  return (
    <EventTypeListItem
      eventType={props}
      usersAvatars={[
        {
          alt: "Alt",
          image:
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1480&q=80",
        },
      ]}
    />
  );
};
