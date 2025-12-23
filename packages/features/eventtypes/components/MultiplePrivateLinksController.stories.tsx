import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormProvider, useForm } from "react-hook-form";

import type { FormValues } from "@calcom/features/eventtypes/lib/types";

import { MultiplePrivateLinksController } from "./MultiplePrivateLinksController";

// Mock wrapper component to provide form context
const FormWrapper = ({
  children,
  defaultValues,
}: {
  children: React.ReactNode;
  defaultValues?: Partial<FormValues>;
}) => {
  const methods = useForm<FormValues>({
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [],
      ...defaultValues,
    } as FormValues,
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const meta = {
  component: MultiplePrivateLinksController,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    bookerUrl: {
      description: "The base URL for booking links",
      control: "text",
    },
    userTimeZone: {
      description: "User's timezone for link expiration calculations",
      control: "text",
    },
    team: {
      description: "Team information if this is a team event type",
      control: "object",
    },
  },
  decorators: [
    (Story, context) => (
      <div className="w-[800px]">
        <FormWrapper defaultValues={context.args.defaultValues}>
          <Story />
        </FormWrapper>
      </div>
    ),
  ],
} satisfies Meta<typeof MultiplePrivateLinksController>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [],
    } as Partial<FormValues>,
  },
};

export const WithExistingLinks: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "abc123def456",
          expiresAt: null,
          maxUsageCount: 1,
          usageCount: 0,
        },
        {
          link: "xyz789uvw012",
          expiresAt: null,
          maxUsageCount: 5,
          usageCount: 2,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithTimeBasedExpiration: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "time123exp456",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          maxUsageCount: null,
          usageCount: 0,
        },
        {
          link: "time789exp012",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          maxUsageCount: null,
          usageCount: 0,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithExpiredLinks: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "expired123old456",
          expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          maxUsageCount: null,
          usageCount: 0,
        },
        {
          link: "maxed789out012",
          expiresAt: null,
          maxUsageCount: 3,
          usageCount: 3,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithMixedLinks: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "active123link456",
          expiresAt: null,
          maxUsageCount: 1,
          usageCount: 0,
        },
        {
          link: "time789based012",
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          maxUsageCount: null,
          usageCount: 0,
        },
        {
          link: "multiple345uses678",
          expiresAt: null,
          maxUsageCount: 10,
          usageCount: 4,
        },
        {
          link: "expired901link234",
          expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          maxUsageCount: null,
          usageCount: 0,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithTeamEvent: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "Europe/London",
    team: {
      id: 100,
      name: "Engineering Team",
      slug: "engineering",
    } as any,
    defaultValues: {
      slug: "team-meeting",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "team123link456",
          expiresAt: null,
          maxUsageCount: 5,
          usageCount: 1,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithMultipleUsageCounts: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/Los_Angeles",
    team: undefined,
    defaultValues: {
      slug: "consultation",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "single123use456",
          expiresAt: null,
          maxUsageCount: 1,
          usageCount: 0,
        },
        {
          link: "five789uses012",
          expiresAt: null,
          maxUsageCount: 5,
          usageCount: 0,
        },
        {
          link: "ten345uses678",
          expiresAt: null,
          maxUsageCount: 10,
          usageCount: 3,
        },
        {
          link: "hundred901uses234",
          expiresAt: null,
          maxUsageCount: 100,
          usageCount: 42,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithPartiallyUsedLinks: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "Asia/Tokyo",
    team: undefined,
    defaultValues: {
      slug: "webinar",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "almost123full456",
          expiresAt: null,
          maxUsageCount: 5,
          usageCount: 4,
        },
        {
          link: "half789used012",
          expiresAt: null,
          maxUsageCount: 10,
          usageCount: 5,
        },
        {
          link: "barely345used678",
          expiresAt: null,
          maxUsageCount: 20,
          usageCount: 2,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const WithCustomBookerUrl: Story = {
  args: {
    bookerUrl: "https://custom-domain.example.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "meeting",
      users: [{ id: 1 }],
      multiplePrivateLinks: [
        {
          link: "custom123domain456",
          expiresAt: null,
          maxUsageCount: 3,
          usageCount: 0,
        },
      ],
    } as Partial<FormValues>,
  },
};

export const Empty: Story = {
  args: {
    bookerUrl: "https://cal.com",
    userTimeZone: "America/New_York",
    team: undefined,
    defaultValues: {
      slug: "30min",
      users: [{ id: 1 }],
      multiplePrivateLinks: [],
    } as Partial<FormValues>,
  },
};
