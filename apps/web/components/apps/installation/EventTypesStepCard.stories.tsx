import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormProvider, useForm } from "react-hook-form";

import { EventTypesStepCard } from "./EventTypesStepCard";
import type { TEventTypesForm } from "~/apps/installation/[[...step]]/step-view";

const meta = {
  title: "Components/Apps/Installation/EventTypesStepCard",
  component: EventTypesStepCard,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story, context) => {
      const methods = useForm<TEventTypesForm>({
        defaultValues: context.args.formDefaultValues || {
          eventTypeGroups: [],
        },
      });

      return (
        <FormProvider {...methods}>
          <div className="w-[600px]">
            <Story />
          </div>
        </FormProvider>
      );
    },
  ],
} satisfies Meta<typeof EventTypesStepCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockEventTypeGroups = [
  {
    teamId: undefined,
    userId: 1,
    slug: "user",
    name: "User",
    image: "",
    isOrganisation: false,
    eventTypes: [
      {
        id: 1,
        title: "30 Min Meeting",
        description: "A quick 30 minute meeting to discuss your project needs",
        slug: "30min",
        length: 30,
        selected: false,
        team: null,
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 0,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
      {
        id: 2,
        title: "60 Min Consultation",
        description: "An hour-long consultation for in-depth discussion about your requirements",
        slug: "60min",
        length: 60,
        selected: false,
        team: null,
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 1,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
      {
        id: 3,
        title: "Quick 15 Min Call",
        description: "",
        slug: "15min",
        length: 15,
        selected: false,
        team: null,
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 2,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
    ],
  },
];

const mockEventTypeGroupsWithMultipleDurations = [
  {
    teamId: undefined,
    userId: 1,
    slug: "user",
    name: "User",
    image: "",
    isOrganisation: false,
    eventTypes: [
      {
        id: 4,
        title: "Flexible Duration Meeting",
        description: "Choose from multiple duration options for this meeting",
        slug: "flexible",
        length: 30,
        selected: false,
        team: null,
        metadata: {
          multipleDuration: [15, 30, 45, 60],
        },
        schedulingType: null,
        requiresConfirmation: false,
        position: 0,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
    ],
  },
];

const mockEventTypeGroupsWithTeam = [
  {
    teamId: 10,
    userId: null,
    slug: "engineering-team",
    name: "Engineering Team",
    image: "https://cal.com/team-avatar.png",
    isOrganisation: false,
    eventTypes: [
      {
        id: 5,
        title: "Team Standup",
        description: "Daily team standup meeting",
        slug: "standup",
        length: 15,
        selected: false,
        team: {
          id: 10,
          name: "Engineering Team",
          slug: "engineering-team",
        },
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 0,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
      {
        id: 6,
        title: "Sprint Planning",
        description: "Bi-weekly sprint planning session",
        slug: "sprint-planning",
        length: 120,
        selected: false,
        team: {
          id: 10,
          name: "Engineering Team",
          slug: "engineering-team",
        },
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 1,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
    ],
  },
];

const mockEventTypeGroupsWithSelectedEvents = [
  {
    teamId: undefined,
    userId: 1,
    slug: "user",
    name: "User",
    image: "",
    isOrganisation: false,
    eventTypes: [
      {
        id: 1,
        title: "30 Min Meeting",
        description: "A quick 30 minute meeting to discuss your project needs",
        slug: "30min",
        length: 30,
        selected: true,
        team: null,
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 0,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
      {
        id: 2,
        title: "60 Min Consultation",
        description: "An hour-long consultation for in-depth discussion about your requirements",
        slug: "60min",
        length: 60,
        selected: true,
        team: null,
        metadata: {},
        schedulingType: null,
        requiresConfirmation: false,
        position: 1,
        destinationCalendar: null,
        calVideoSettings: null,
        locations: [],
      },
    ],
  },
];

const mockEmptyEventTypeGroup = [
  {
    teamId: 10,
    userId: null,
    slug: "new-team",
    name: "New Team",
    image: "",
    isOrganisation: false,
    eventTypes: [],
  },
];

export const Default: Story = {
  args: {
    userName: "johndoe",
    setConfigureStep: () => {},
    handleSetUpLater: () => {},
    formDefaultValues: {
      eventTypeGroups: mockEventTypeGroups,
    },
  },
};

export const WithSelectedEvents: Story = {
  args: {
    userName: "johndoe",
    setConfigureStep: () => {},
    handleSetUpLater: () => {},
    formDefaultValues: {
      eventTypeGroups: mockEventTypeGroupsWithSelectedEvents,
    },
  },
};

export const WithTeamEvents: Story = {
  args: {
    userName: "johndoe",
    setConfigureStep: () => {},
    handleSetUpLater: () => {},
    formDefaultValues: {
      eventTypeGroups: mockEventTypeGroupsWithTeam,
    },
  },
};

export const WithMultipleDurations: Story = {
  args: {
    userName: "johndoe",
    setConfigureStep: () => {},
    handleSetUpLater: () => {},
    formDefaultValues: {
      eventTypeGroups: mockEventTypeGroupsWithMultipleDurations,
    },
  },
};

export const WithEmptyTeam: Story = {
  args: {
    userName: "johndoe",
    setConfigureStep: () => {},
    handleSetUpLater: () => {},
    formDefaultValues: {
      eventTypeGroups: mockEmptyEventTypeGroup,
    },
  },
};

export const WithMultipleGroups: Story = {
  args: {
    userName: "johndoe",
    setConfigureStep: () => {},
    handleSetUpLater: () => {},
    formDefaultValues: {
      eventTypeGroups: [
        ...mockEventTypeGroups,
        ...mockEventTypeGroupsWithTeam,
      ],
    },
  },
};
