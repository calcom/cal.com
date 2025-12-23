import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createEventTypeInput } from "@calcom/features/eventtypes/lib/types";
import type { CreateEventTypeFormValues } from "@calcom/features/eventtypes/hooks/useCreateEventType";
import { Button } from "@calcom/ui/components/button";

import CreateEventTypeForm from "./CreateEventTypeForm";

const meta = {
  component: CreateEventTypeForm,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateEventTypeForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const FormWrapper = ({
  isManagedEventType = false,
  isPending = false,
  pageSlug = "johndoe",
  urlPrefix = "https://cal.com",
  defaultValues,
}: {
  isManagedEventType?: boolean;
  isPending?: boolean;
  pageSlug?: string;
  urlPrefix?: string;
  defaultValues?: Partial<CreateEventTypeFormValues>;
}) => {
  const form = useForm<CreateEventTypeFormValues>({
    defaultValues: {
      length: 15,
      title: "",
      slug: "",
      description: "",
      ...defaultValues,
    },
    resolver: zodResolver(createEventTypeInput),
  });

  const handleSubmit = (values: CreateEventTypeFormValues) => {
    console.log("Form submitted:", values);
    alert(`Event Type Created:\nTitle: ${values.title}\nSlug: ${values.slug}\nDuration: ${values.length} minutes`);
  };

  const SubmitButton = (isPending: boolean) => (
    <div className="flex justify-end">
      <Button type="submit" loading={isPending}>
        {isPending ? "Creating..." : "Create Event Type"}
      </Button>
    </div>
  );

  return (
    <CreateEventTypeForm
      form={form}
      isManagedEventType={isManagedEventType}
      handleSubmit={handleSubmit}
      pageSlug={pageSlug}
      isPending={isPending}
      urlPrefix={urlPrefix}
      SubmitButton={SubmitButton}
    />
  );
};

export const Default: Story = {
  render: () => <FormWrapper />,
};

export const WithDefaultValues: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        title: "Quick Chat",
        slug: "quick-chat",
        description: "A quick 15 minute chat to discuss your needs",
        length: 15,
      }}
    />
  ),
};

export const LongerDuration: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        title: "Initial Consultation",
        slug: "initial-consultation",
        description: "A comprehensive one-hour consultation to understand your requirements",
        length: 60,
      }}
    />
  ),
};

export const WithLongUrlPrefix: Story = {
  render: () => (
    <FormWrapper
      urlPrefix="https://very-long-organization-name.cal.com"
      pageSlug="user-with-long-name"
      defaultValues={{
        title: "Team Meeting",
        slug: "team-meeting",
        length: 30,
      }}
    />
  ),
};

export const ManagedEventType: Story = {
  render: () => (
    <FormWrapper
      isManagedEventType={true}
      defaultValues={{
        title: "Managed Event",
        slug: "managed-event",
        description: "This is a managed event type for the team",
        length: 30,
      }}
    />
  ),
};

export const LoadingState: Story = {
  render: () => (
    <FormWrapper
      isPending={true}
      defaultValues={{
        title: "Creating Event",
        slug: "creating-event",
        length: 30,
      }}
    />
  ),
};

export const ShortUrlPrefix: Story = {
  render: () => (
    <FormWrapper
      urlPrefix="cal.com"
      pageSlug="john"
      defaultValues={{
        title: "Quick Call",
        slug: "quick-call",
        length: 15,
      }}
    />
  ),
};

export const CustomPageSlug: Story = {
  render: () => (
    <FormWrapper
      pageSlug="sales-team"
      defaultValues={{
        title: "Sales Demo",
        slug: "sales-demo",
        description: "Schedule a demo with our sales team",
        length: 45,
      }}
    />
  ),
};

export const EmptyForm: Story = {
  render: () => <FormWrapper defaultValues={{}} />,
};

export const WithMarkdownDescription: Story = {
  render: () => (
    <FormWrapper
      defaultValues={{
        title: "Strategy Session",
        slug: "strategy-session",
        description: `## What to Expect

- In-depth discussion of your goals
- Strategic recommendations
- Action plan development

**Duration:** Flexible based on your needs`,
        length: 90,
      }}
    />
  ),
};

export const AllDurations: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-4">15 Minutes</h3>
        <FormWrapper
          defaultValues={{
            title: "Quick Check-in",
            slug: "quick-checkin",
            length: 15,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">30 Minutes</h3>
        <FormWrapper
          defaultValues={{
            title: "Standard Meeting",
            slug: "standard-meeting",
            length: 30,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">60 Minutes</h3>
        <FormWrapper
          defaultValues={{
            title: "Consultation",
            slug: "consultation",
            length: 60,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">120 Minutes</h3>
        <FormWrapper
          defaultValues={{
            title: "Workshop",
            slug: "workshop",
            length: 120,
          }}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};

export const DifferentEventTypes: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-4">Personal Event</h3>
        <FormWrapper
          defaultValues={{
            title: "Coffee Chat",
            slug: "coffee-chat",
            description: "Informal coffee chat",
            length: 30,
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-4">Managed Event</h3>
        <FormWrapper
          isManagedEventType={true}
          defaultValues={{
            title: "Team Sync",
            slug: "team-sync",
            description: "Team synchronization meeting",
            length: 45,
          }}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
};
