import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { RoutingForm } from "@calcom/app-store/routing-forms/types/types";

import { TestForm } from "./TestForm";

const meta = {
  title: "Components/Apps/RoutingForms/TestForm",
  component: TestForm,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TestForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock routing form with basic fields
const mockBasicForm: RoutingForm = {
  id: "test-form-1",
  name: "Contact Form",
  description: "A simple contact routing form",
  position: 0,
  routes: [
    {
      id: "route-1",
      action: {
        type: "eventTypeRedirectUrl",
        value: "https://cal.com/team/sales",
        eventTypeId: 1,
      },
      queryValue: {
        id: "query-1",
        type: "group",
      },
      isFallback: false,
    },
  ],
  fields: [
    {
      id: "field-1",
      type: "text",
      label: "Full Name",
      identifier: "name",
      required: true,
      placeholder: "Enter your full name",
      deleted: false,
    },
    {
      id: "field-2",
      type: "email",
      label: "Email Address",
      identifier: "email",
      required: true,
      placeholder: "you@example.com",
      deleted: false,
    },
    {
      id: "field-3",
      type: "textarea",
      label: "Message",
      identifier: "message",
      required: false,
      placeholder: "Tell us how we can help",
      deleted: false,
    },
  ],
  settings: {
    emailOwnerOnSubmission: false,
    sendUpdatesTo: [],
  },
  disabled: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  userId: 1,
  teamId: 1,
  connectedForms: [],
  routers: [],
  teamMembers: [],
  _count: {
    responses: 0,
  },
};

// Mock form with multiple choice fields
const mockFormWithChoices: RoutingForm = {
  ...mockBasicForm,
  id: "test-form-2",
  name: "Service Selection Form",
  description: "Form with radio and select fields",
  fields: [
    {
      id: "field-1",
      type: "text",
      label: "Company Name",
      identifier: "company",
      required: true,
      placeholder: "Your company",
      deleted: false,
    },
    {
      id: "field-2",
      type: "radio",
      label: "Service Type",
      identifier: "service_type",
      required: true,
      deleted: false,
      options: [
        { id: "opt-1", label: "Consulting", value: "consulting" },
        { id: "opt-2", label: "Development", value: "development" },
        { id: "opt-3", label: "Support", value: "support" },
      ],
    },
    {
      id: "field-3",
      type: "select",
      label: "Team Size",
      identifier: "team_size",
      required: true,
      deleted: false,
      options: [
        { id: "size-1", label: "1-10", value: "small" },
        { id: "size-2", label: "11-50", value: "medium" },
        { id: "size-3", label: "51+", value: "large" },
      ],
    },
  ],
};

// Mock form with multiselect
const mockFormWithMultiSelect: RoutingForm = {
  ...mockBasicForm,
  id: "test-form-3",
  name: "Interest Survey",
  description: "Form with multiselect field",
  fields: [
    {
      id: "field-1",
      type: "text",
      label: "Name",
      identifier: "name",
      required: true,
      placeholder: "Your name",
      deleted: false,
    },
    {
      id: "field-2",
      type: "multiselect",
      label: "Areas of Interest",
      identifier: "interests",
      required: true,
      deleted: false,
      options: [
        { id: "int-1", label: "Web Development", value: "web" },
        { id: "int-2", label: "Mobile Apps", value: "mobile" },
        { id: "int-3", label: "DevOps", value: "devops" },
        { id: "int-4", label: "AI/ML", value: "ai" },
      ],
    },
    {
      id: "field-3",
      type: "textarea",
      label: "Additional Comments",
      identifier: "comments",
      required: false,
      placeholder: "Any other information",
      deleted: false,
    },
  ],
};

// Mock form with phone field
const mockFormWithPhone: RoutingForm = {
  ...mockBasicForm,
  id: "test-form-4",
  name: "Contact Details Form",
  description: "Form with phone field",
  fields: [
    {
      id: "field-1",
      type: "text",
      label: "Full Name",
      identifier: "name",
      required: true,
      placeholder: "Enter your name",
      deleted: false,
    },
    {
      id: "field-2",
      type: "email",
      label: "Email",
      identifier: "email",
      required: true,
      placeholder: "you@example.com",
      deleted: false,
    },
    {
      id: "field-3",
      type: "phone",
      label: "Phone Number",
      identifier: "phone",
      required: true,
      placeholder: "+1 (555) 000-0000",
      deleted: false,
    },
  ],
};

// Default story with basic form
export const Default: Story = {
  args: {
    form: mockBasicForm,
    supportsTeamMembersMatchingLogic: false,
    isDialog: false,
    showRRData: false,
  },
};

// Story with form in dialog mode
export const DialogMode: Story = {
  args: {
    form: mockBasicForm,
    supportsTeamMembersMatchingLogic: false,
    isDialog: true,
    showRRData: false,
  },
};

// Story with team members matching logic enabled
export const WithTeamMembersMatching: Story = {
  args: {
    form: {
      ...mockBasicForm,
      team: {
        id: 1,
        name: "Sales Team",
        slug: "sales",
        parentId: 1,
      },
    },
    supportsTeamMembersMatchingLogic: true,
    isDialog: false,
    showRRData: false,
  },
};

// Story with multiple choice fields
export const WithChoiceFields: Story = {
  args: {
    form: mockFormWithChoices,
    supportsTeamMembersMatchingLogic: false,
    isDialog: false,
    showRRData: false,
  },
};

// Story with multiselect field
export const WithMultiSelectField: Story = {
  args: {
    form: mockFormWithMultiSelect,
    supportsTeamMembersMatchingLogic: false,
    isDialog: false,
    showRRData: false,
  },
};

// Story with phone field
export const WithPhoneField: Story = {
  args: {
    form: mockFormWithPhone,
    supportsTeamMembersMatchingLogic: false,
    isDialog: false,
    showRRData: false,
  },
};

// Story showing round robin data
export const ShowingRoundRobinData: Story = {
  args: {
    form: {
      ...mockBasicForm,
      team: {
        id: 1,
        name: "Support Team",
        slug: "support",
        parentId: 1,
      },
    },
    supportsTeamMembersMatchingLogic: true,
    isDialog: false,
    showRRData: true,
  },
};

// Story with custom footer renderer
export const WithCustomFooter: Story = {
  args: {
    form: mockBasicForm,
    supportsTeamMembersMatchingLogic: false,
    isDialog: true,
    showRRData: false,
    renderFooter: (onClose, onSubmit, isValid) => (
      <div className="flex gap-2 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!isValid}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Submit Form
        </button>
      </div>
    ),
  },
};

// Story with all optional fields
export const AllOptionalFields: Story = {
  args: {
    form: {
      ...mockBasicForm,
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name (Optional)",
          identifier: "name",
          required: false,
          placeholder: "Your name",
          deleted: false,
        },
        {
          id: "field-2",
          type: "email",
          label: "Email (Optional)",
          identifier: "email",
          required: false,
          placeholder: "you@example.com",
          deleted: false,
        },
        {
          id: "field-3",
          type: "textarea",
          label: "Comments (Optional)",
          identifier: "comments",
          required: false,
          placeholder: "Any feedback",
          deleted: false,
        },
      ],
    },
    supportsTeamMembersMatchingLogic: false,
    isDialog: false,
    showRRData: false,
  },
};
