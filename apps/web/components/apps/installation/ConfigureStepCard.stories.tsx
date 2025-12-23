import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";

import { ConfigureStepCard } from "./ConfigureStepCard";
import type { ConfigureStepCardProps } from "./ConfigureStepCard";

const meta = {
  title: "Apps/Installation/ConfigureStepCard",
  component: ConfigureStepCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ConfigureStepCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component to provide FormProvider and portal ref
const ConfigureStepCardWrapper = (props: ConfigureStepCardProps) => {
  const formPortalRef = useRef<HTMLDivElement>(null);
  const formMethods = useForm({
    defaultValues: {
      eventTypeGroups: props.eventTypeGroups,
    },
  });

  return (
    <FormProvider {...formMethods}>
      <div className="w-full max-w-2xl">
        <ConfigureStepCard {...props} formPortalRef={formPortalRef} />
        <div ref={formPortalRef} />
      </div>
    </FormProvider>
  );
};

const mockEventTypeGroups = [
  {
    image: "https://via.placeholder.com/40",
    slug: "john-doe",
    eventTypes: [
      {
        id: 1,
        title: "30 Min Meeting",
        slug: "30min",
        selected: true,
        metadata: {},
        locations: [
          {
            type: "integrations:google:meet",
            displayLocationPublicly: true,
          },
        ],
        bookingFields: [],
        seatsPerTimeSlot: null,
        team: null,
      },
      {
        id: 2,
        title: "60 Min Meeting",
        slug: "60min",
        selected: true,
        metadata: {},
        locations: [
          {
            type: "integrations:zoom",
            displayLocationPublicly: true,
          },
        ],
        bookingFields: [],
        seatsPerTimeSlot: null,
        team: null,
      },
    ],
  },
];

const mockEventTypeGroupsWithTeam = [
  {
    image: "https://via.placeholder.com/40",
    slug: "acme-team",
    eventTypes: [
      {
        id: 3,
        title: "Team Standup",
        slug: "team-standup",
        selected: true,
        metadata: {},
        locations: [
          {
            type: "integrations:google:meet",
            displayLocationPublicly: true,
          },
        ],
        bookingFields: [],
        seatsPerTimeSlot: null,
        team: {
          id: 1,
          slug: "acme-team",
          name: "Acme Team",
        },
      },
    ],
  },
];

const baseArgs: ConfigureStepCardProps = {
  slug: "google-meet",
  userName: "john-doe",
  categories: ["conferencing"],
  credentialId: 123,
  loading: false,
  isConferencing: true,
  formPortalRef: { current: null },
  eventTypeGroups: mockEventTypeGroups,
  setConfigureStep: () => {},
  handleSetUpLater: () => {
    console.log("Set up later clicked");
  },
};

export const Default: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: baseArgs,
};

export const ConferencingApp: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    slug: "zoom",
    isConferencing: true,
    categories: ["conferencing"],
  },
};

export const NonConferencingApp: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    slug: "google-calendar",
    isConferencing: false,
    categories: ["calendar"],
  },
};

export const WithTeamEventTypes: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    eventTypeGroups: mockEventTypeGroupsWithTeam,
  },
};

export const Loading: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    loading: true,
  },
};

export const MultipleGroups: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    eventTypeGroups: [
      ...mockEventTypeGroups,
      {
        image: "https://via.placeholder.com/40",
        slug: "jane-smith",
        eventTypes: [
          {
            id: 4,
            title: "Quick Chat",
            slug: "quick-chat",
            selected: true,
            metadata: {},
            locations: [
              {
                type: "integrations:zoom",
                displayLocationPublicly: true,
              },
            ],
            bookingFields: [],
            seatsPerTimeSlot: null,
            team: null,
          },
        ],
      },
    ],
  },
};

export const SingleEventType: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    eventTypeGroups: [
      {
        image: "https://via.placeholder.com/40",
        slug: "john-doe",
        eventTypes: [
          {
            id: 1,
            title: "30 Min Meeting",
            slug: "30min",
            selected: true,
            metadata: {},
            locations: [
              {
                type: "integrations:google:meet",
                displayLocationPublicly: true,
              },
            ],
            bookingFields: [],
            seatsPerTimeSlot: null,
            team: null,
          },
        ],
      },
    ],
  },
};

export const NoSelectedEventTypes: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    eventTypeGroups: [
      {
        image: "https://via.placeholder.com/40",
        slug: "john-doe",
        eventTypes: [
          {
            id: 1,
            title: "30 Min Meeting",
            slug: "30min",
            selected: false,
            metadata: {},
            locations: [],
            bookingFields: [],
            seatsPerTimeSlot: null,
            team: null,
          },
        ],
      },
    ],
  },
};

export const WithoutCredentialId: Story = {
  render: (args) => <ConfigureStepCardWrapper {...args} />,
  args: {
    ...baseArgs,
    credentialId: undefined,
  },
};
