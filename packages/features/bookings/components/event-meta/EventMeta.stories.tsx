import type { Meta, StoryObj } from "@storybook/react";
import type { PublicEvent } from "bookings/types";
import type { ComponentProps } from "react";

import { Examples, Example, VariantsTable, VariantRow } from "@calcom/storybook/components";

import { EventDetails } from "./Details";
import { EventMembers } from "./Members";
import { EventTitle } from "./Title";
import { mockEvent } from "./event.mock";

type StoryArgs = ComponentProps<typeof EventDetails>;

const meta: Meta<StoryArgs> = {
  component: EventDetails,
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
  title: "Features/Events/Meta",
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const ExampleStory: Story = {
  name: "Examples",
  render: () => (
    <Examples title="Combined event meta block">
      <div style={{ maxWidth: 300 }}>
        <Example title="Event Title">
          <EventTitle>{mockEvent.title}</EventTitle>
        </Example>
        <Example title="Event Details">
          <EventDetails event={mockEvent} />
        </Example>
      </div>
    </Examples>
  ),
};

export const AllVariants: Story = {
  name: "All variants",
  render: () => (
    <VariantsTable titles={["Event Meta Components"]} columnMinWidth={150}>
      <VariantRow variant="">
        <div style={{ maxWidth: 300 }}>
          <EventMembers
            users={mockEvent.users}
            schedulingType="COLLECTIVE"
            entity={{ isUnpublished: false, name: "Example", orgSlug: null }}
            // TODO remove type assertion
            profile={{ weekStart: "Sunday" } as PublicEvent["profile"]}
          />
          <EventTitle>Quick catch-up</EventTitle>
          <EventDetails event={mockEvent} />
        </div>
      </VariantRow>
    </VariantsTable>
  ),
};
