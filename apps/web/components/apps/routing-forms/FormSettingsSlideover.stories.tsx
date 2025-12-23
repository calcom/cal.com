import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { Button } from "@calcom/ui/components/button";

import { FormSettingsSlideover } from "./FormSettingsSlideover";

const meta = {
  title: "Components/Apps/RoutingForms/FormSettingsSlideover",
  component: FormSettingsSlideover,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FormSettingsSlideover>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock form data
const mockFormData: RoutingFormWithResponseCount = {
  id: "form-123",
  name: "Customer Feedback Form",
  description: "A form to gather customer feedback and route to appropriate teams",
  fields: [],
  routes: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
  position: 0,
  userId: 1,
  teamId: 1,
  disabled: false,
  settings: {
    sendUpdatesTo: [],
    sendToAll: false,
    emailOwnerOnSubmission: false,
  },
  routers: [
    {
      id: "router-1",
      name: "Sales Router",
      description: "Routes to sales team",
    },
    {
      id: "router-2",
      name: "Support Router",
      description: "Routes to support team",
    },
  ],
  connectedForms: [
    {
      id: "form-456",
      name: "Lead Qualification",
      description: "Connected qualification form",
    },
  ],
  teamMembers: [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      avatarUrl: null,
      defaultScheduleId: null,
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      avatarUrl: null,
      defaultScheduleId: null,
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob@example.com",
      avatarUrl: null,
      defaultScheduleId: null,
    },
  ],
  team: {
    slug: "example-team",
    name: "Example Team",
  },
  _count: {
    responses: 42,
  },
};

// Mock form data without team
const mockPersonalFormData: RoutingFormWithResponseCount = {
  id: "form-789",
  name: "Personal Form",
  description: "A personal routing form",
  fields: [],
  routes: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
  position: 0,
  userId: 1,
  teamId: null,
  disabled: false,
  settings: {
    sendUpdatesTo: [],
    sendToAll: false,
    emailOwnerOnSubmission: false,
  },
  routers: [],
  connectedForms: [],
  teamMembers: [],
  team: null,
  _count: {
    responses: 5,
  },
};

// Mock form data without routers or connected forms
const mockMinimalFormData: RoutingFormWithResponseCount = {
  id: "form-minimal",
  name: "Minimal Form",
  description: "",
  fields: [],
  routes: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
  position: 0,
  userId: 1,
  teamId: 1,
  disabled: false,
  settings: {
    sendUpdatesTo: [],
    sendToAll: false,
    emailOwnerOnSubmission: false,
  },
  routers: [],
  connectedForms: [],
  teamMembers: [
    {
      id: 1,
      name: "Admin User",
      email: "admin@example.com",
      avatarUrl: null,
      defaultScheduleId: null,
    },
  ],
  team: {
    slug: "minimal-team",
    name: "Minimal Team",
  },
  _count: {
    responses: 0,
  },
};

// Wrapper component to handle state
function FormSettingsSlideoverWrapper({
  formData,
  defaultOpen = false,
}: {
  formData: RoutingFormWithResponseCount;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hookForm = useForm<RoutingFormWithResponseCount>({
    defaultValues: formData,
  });

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Form Settings</Button>
      <FormSettingsSlideover
        form={formData}
        hookForm={hookForm}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        appUrl="/apps/routing-forms"
      />
    </div>
  );
}

// Default story with team form
export const Default: Story = {
  render: () => <FormSettingsSlideoverWrapper formData={mockFormData} />,
};

// Story with slideover open by default
export const OpenByDefault: Story = {
  render: () => <FormSettingsSlideoverWrapper formData={mockFormData} defaultOpen={true} />,
};

// Personal form without team
export const PersonalForm: Story = {
  render: () => <FormSettingsSlideoverWrapper formData={mockPersonalFormData} />,
};

// Personal form open by default
export const PersonalFormOpen: Story = {
  render: () => <FormSettingsSlideoverWrapper formData={mockPersonalFormData} defaultOpen={true} />,
};

// Minimal form without routers or connected forms
export const MinimalForm: Story = {
  render: () => <FormSettingsSlideoverWrapper formData={mockMinimalFormData} />,
};

// Minimal form open by default
export const MinimalFormOpen: Story = {
  render: () => <FormSettingsSlideoverWrapper formData={mockMinimalFormData} defaultOpen={true} />,
};

// Form with pre-selected team members
export const WithSelectedMembers: Story = {
  render: () => {
    const formWithSelectedMembers = {
      ...mockFormData,
      settings: {
        sendUpdatesTo: [1, 2],
        sendToAll: false,
        emailOwnerOnSubmission: false,
      },
    };
    return <FormSettingsSlideoverWrapper formData={formWithSelectedMembers} defaultOpen={true} />;
  },
};

// Form with "send to all" enabled
export const SendToAllEnabled: Story = {
  render: () => {
    const formWithSendToAll = {
      ...mockFormData,
      settings: {
        sendUpdatesTo: [],
        sendToAll: true,
        emailOwnerOnSubmission: false,
      },
    };
    return <FormSettingsSlideoverWrapper formData={formWithSendToAll} defaultOpen={true} />;
  },
};

// Personal form with email owner enabled
export const EmailOwnerEnabled: Story = {
  render: () => {
    const formWithEmailOwner = {
      ...mockPersonalFormData,
      settings: {
        sendUpdatesTo: [],
        sendToAll: false,
        emailOwnerOnSubmission: true,
      },
    };
    return <FormSettingsSlideoverWrapper formData={formWithEmailOwner} defaultOpen={true} />;
  },
};

// Form with many routers
export const ManyRouters: Story = {
  render: () => {
    const formWithManyRouters = {
      ...mockFormData,
      routers: [
        { id: "router-1", name: "Sales Router", description: "Routes to sales team" },
        { id: "router-2", name: "Support Router", description: "Routes to support team" },
        { id: "router-3", name: "Marketing Router", description: "Routes to marketing team" },
        { id: "router-4", name: "Product Router", description: "Routes to product team" },
        { id: "router-5", name: "Engineering Router", description: "Routes to engineering team" },
      ],
    };
    return <FormSettingsSlideoverWrapper formData={formWithManyRouters} defaultOpen={true} />;
  },
};

// Form with many connected forms
export const ManyConnectedForms: Story = {
  render: () => {
    const formWithManyConnected = {
      ...mockFormData,
      connectedForms: [
        { id: "form-1", name: "Lead Qualification", description: "Qualification form" },
        { id: "form-2", name: "Product Interest", description: "Product interest form" },
        { id: "form-3", name: "Feedback Survey", description: "Customer feedback" },
        { id: "form-4", name: "Support Ticket", description: "Support form" },
      ],
    };
    return <FormSettingsSlideoverWrapper formData={formWithManyConnected} defaultOpen={true} />;
  },
};

// Form with long description
export const LongDescription: Story = {
  render: () => {
    const formWithLongDescription = {
      ...mockFormData,
      description:
        "This is a comprehensive customer feedback form designed to gather detailed information about user experience, product satisfaction, feature requests, and overall sentiment. It includes multiple sections covering different aspects of the customer journey and routes responses to appropriate teams based on the feedback type and urgency level. The form is used across multiple departments and integrates with our CRM system.",
    };
    return <FormSettingsSlideoverWrapper formData={formWithLongDescription} defaultOpen={true} />;
  },
};

// Form with many team members
export const ManyTeamMembers: Story = {
  render: () => {
    const formWithManyMembers = {
      ...mockFormData,
      teamMembers: [
        { id: 1, name: "John Doe", email: "john@example.com", avatarUrl: null, defaultScheduleId: null },
        {
          id: 2,
          name: "Jane Smith",
          email: "jane@example.com",
          avatarUrl: null,
          defaultScheduleId: null,
        },
        {
          id: 3,
          name: "Bob Johnson",
          email: "bob@example.com",
          avatarUrl: null,
          defaultScheduleId: null,
        },
        {
          id: 4,
          name: "Alice Williams",
          email: "alice@example.com",
          avatarUrl: null,
          defaultScheduleId: null,
        },
        {
          id: 5,
          name: "Charlie Brown",
          email: "charlie@example.com",
          avatarUrl: null,
          defaultScheduleId: null,
        },
        { id: 6, name: "Diana Ross", email: "diana@example.com", avatarUrl: null, defaultScheduleId: null },
        {
          id: 7,
          name: "Edward Norton",
          email: "edward@example.com",
          avatarUrl: null,
          defaultScheduleId: null,
        },
        {
          id: 8,
          name: "Fiona Apple",
          email: "fiona@example.com",
          avatarUrl: null,
          defaultScheduleId: null,
        },
      ],
    };
    return <FormSettingsSlideoverWrapper formData={formWithManyMembers} defaultOpen={true} />;
  },
};
