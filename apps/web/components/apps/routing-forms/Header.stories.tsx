import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FormProvider, useForm } from "react-hook-form";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";

import { FormActionsProvider } from "./FormActions";
import { Header } from "./Header";

const meta = {
  title: "Components/Apps/RoutingForms/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/apps/routing-forms/form-edit/cltest123",
      },
    },
  },
  decorators: [
    (Story, context) => {
      const methods = useForm<RoutingFormWithResponseCount>({
        defaultValues: context.args.routingForm,
      });

      return (
        <FormActionsProvider
          appUrl="/apps/routing-forms"
          newFormDialogState={null}
          setNewFormDialogState={fn()}>
          <FormProvider {...methods}>
            <div style={{ width: "100vw", maxWidth: "1400px" }}>
              <Story />
            </div>
          </FormProvider>
        </FormActionsProvider>
      );
    },
  ],
  args: {
    isSaving: false,
    appUrl: "/apps/routing-forms",
    setShowInfoLostDialog: fn(),
    setIsTestPreviewOpen: fn(),
    isTestPreviewOpen: false,
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

// Base mock form data
const baseMockForm: RoutingFormWithResponseCount = {
  id: "cltest123",
  name: "Customer Inquiry Form",
  description: "Route customers to the right team based on their inquiry type",
  disabled: false,
  userId: 1,
  teamId: null,
  position: 0,
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-20T14:30:00.000Z",
  routes: [
    {
      id: "route1",
      action: { type: "eventTypeRedirectUrl", value: "team/sales" },
      queryValue: {
        type: "group",
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "inquiry_type",
              operator: "equal",
              value: ["sales"],
              valueSrc: ["value"],
            },
          },
        },
      },
      isFallback: false,
    },
    {
      id: "fallback",
      action: { type: "eventTypeRedirectUrl", value: "team/general" },
      isFallback: true,
    },
  ],
  fields: [
    {
      id: "field1",
      type: "text",
      label: "Your Name",
      required: true,
    },
    {
      id: "field2",
      type: "email",
      label: "Email Address",
      required: true,
    },
    {
      id: "inquiry_type",
      type: "select",
      label: "Type of Inquiry",
      required: true,
      options: [
        { id: "opt1", label: "Sales" },
        { id: "opt2", label: "Support" },
        { id: "opt3", label: "General" },
      ],
    },
  ],
  settings: {
    emailOwnerOnSubmission: false,
    sendUpdatesTo: [],
  },
  connectedForms: [],
  routers: [],
  teamMembers: [],
  team: null,
  _count: {
    responses: 0,
  },
};

export const Default: Story = {
  args: {
    routingForm: baseMockForm,
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const WithLongName: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "This is a Very Long Form Name That Should Demonstrate How The Header Handles Text Truncation and Overflow",
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const SavingState: Story = {
  args: {
    routingForm: baseMockForm,
    isSaving: true,
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const PreviewOpen: Story = {
  args: {
    routingForm: baseMockForm,
    isTestPreviewOpen: true,
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const TeamForm: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "Team Sales Routing Form",
      teamId: 5,
      team: {
        slug: "sales-team",
        name: "Sales Team",
      },
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const WithManyResponses: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "Popular Contact Form",
      _count: {
        responses: 1247,
      },
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const ReadOnlyPermissions: Story = {
  args: {
    routingForm: baseMockForm,
    permissions: {
      canCreate: false,
      canRead: true,
      canEdit: false,
      canDelete: false,
    },
  },
};

export const CanEditOnly: Story = {
  args: {
    routingForm: baseMockForm,
    permissions: {
      canCreate: false,
      canRead: true,
      canEdit: true,
      canDelete: false,
    },
  },
};

export const DisabledForm: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "Inactive Form",
      disabled: true,
      description: "This form is currently disabled and not accepting responses",
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const ComplexFormWithManyFields: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "Advanced Lead Qualification",
      description: "Multi-step form to qualify leads and route them to the appropriate sales representative",
      fields: [
        {
          id: "field1",
          type: "text",
          label: "Company Name",
          required: true,
        },
        {
          id: "field2",
          type: "text",
          label: "Your Name",
          required: true,
        },
        {
          id: "field3",
          type: "email",
          label: "Work Email",
          required: true,
        },
        {
          id: "field4",
          type: "phone",
          label: "Phone Number",
          required: true,
        },
        {
          id: "field5",
          type: "select",
          label: "Company Size",
          required: true,
          options: [
            { id: "opt1", label: "1-10 employees" },
            { id: "opt2", label: "11-50 employees" },
            { id: "opt3", label: "51-200 employees" },
            { id: "opt4", label: "201-500 employees" },
            { id: "opt5", label: "500+ employees" },
          ],
        },
        {
          id: "field6",
          type: "multiselect",
          label: "Products of Interest",
          required: true,
          options: [
            { id: "prod1", label: "Platform" },
            { id: "prod2", label: "Enterprise" },
            { id: "prod3", label: "Teams" },
            { id: "prod4", label: "API" },
          ],
        },
      ],
      routes: [
        {
          id: "enterprise-route",
          action: { type: "eventTypeRedirectUrl", value: "team/enterprise-sales" },
          queryValue: {
            type: "group",
            children1: {
              rule1: {
                type: "rule",
                properties: {
                  field: "field5",
                  operator: "select_any_in",
                  value: ["opt4", "opt5"],
                  valueSrc: ["value"],
                },
              },
            },
          },
          isFallback: false,
        },
        {
          id: "fallback",
          action: { type: "eventTypeRedirectUrl", value: "team/general-sales" },
          isFallback: true,
        },
      ],
      _count: {
        responses: 892,
      },
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const ShortFormName: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "Form",
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const WithSpecialCharacters: Story = {
  args: {
    routingForm: {
      ...baseMockForm,
      name: "Form & Survey (2024) - Q1",
    },
    permissions: {
      canCreate: true,
      canRead: true,
      canEdit: true,
      canDelete: true,
    },
  },
};

export const SavingWithReadOnlyPermissions: Story = {
  args: {
    routingForm: baseMockForm,
    isSaving: true,
    permissions: {
      canCreate: false,
      canRead: true,
      canEdit: false,
      canDelete: false,
    },
  },
};
