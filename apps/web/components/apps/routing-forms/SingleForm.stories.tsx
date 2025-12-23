import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormProvider, useForm } from "react-hook-form";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";

import SingleForm from "./SingleForm";
import type { SingleFormComponentProps } from "./SingleForm";

const meta = {
  title: "Components/Apps/RoutingForms/SingleForm",
  component: SingleForm,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story, context) => {
      const methods = useForm<RoutingFormWithResponseCount>({
        defaultValues: context.args.form,
      });

      return (
        <FormProvider {...methods}>
          <div style={{ width: "100vw", height: "100vh", maxWidth: "1400px" }}>
            <Story />
          </div>
        </FormProvider>
      );
    },
  ],
} satisfies Meta<typeof SingleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock Page component
const MockPage = ({ form }: { form: RoutingFormWithResponseCount }) => (
  <div className="bg-default border-subtle rounded-md border p-6">
    <h2 className="text-emphasis mb-4 text-2xl font-semibold">{form.name}</h2>
    <p className="text-default mb-4">{form.description || "No description provided"}</p>
    <div className="text-muted text-sm">
      <p>Form ID: {form.id}</p>
      <p>Fields: {form.fields?.length || 0}</p>
      <p>Routes: {form.routes?.length || 0}</p>
      <p>Responses: {form._count.responses}</p>
    </div>
  </div>
);

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
      id: "route2",
      action: { type: "eventTypeRedirectUrl", value: "team/support" },
      queryValue: {
        type: "group",
        children1: {
          rule1: {
            type: "rule",
            properties: {
              field: "inquiry_type",
              operator: "equal",
              value: ["support"],
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
    {
      id: "field4",
      type: "textarea",
      label: "Message",
      required: false,
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

const baseProps: Omit<SingleFormComponentProps, "form"> = {
  appUrl: "/apps/routing-forms",
  Page: MockPage,
  enrichedWithUserProfileForm: {
    user: {
      id: 1,
      username: "johndoe",
      name: "John Doe",
    },
    team: null,
    nonOrgUsername: "johndoe",
    nonOrgTeamslug: null,
    userOrigin: "https://cal.com/johndoe",
    teamOrigin: null,
  },
  permissions: {
    canEditForm: true,
    canDeleteForm: true,
    canToggleForm: true,
  },
};

export const Default: Story = {
  args: {
    form: baseMockForm,
    ...baseProps,
  },
};

export const WithTeam: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Team Sales Inquiry Form",
      teamId: 5,
      team: {
        slug: "sales-team",
        name: "Sales Team",
      },
    },
    enrichedWithUserProfileForm: {
      ...baseProps.enrichedWithUserProfileForm,
      team: {
        id: 5,
        slug: "sales-team",
        name: "Sales Team",
      },
      nonOrgTeamslug: "sales-team",
      teamOrigin: "https://cal.com/team/sales-team",
    },
    ...baseProps,
  },
};

export const WithManyResponses: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Popular Contact Form",
      _count: {
        responses: 1247,
      },
    },
    ...baseProps,
  },
};

export const ComplexForm: Story = {
  args: {
    form: {
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
        {
          id: "field7",
          type: "select",
          label: "Budget Range",
          required: true,
          options: [
            { id: "budget1", label: "< $10,000" },
            { id: "budget2", label: "$10,000 - $50,000" },
            { id: "budget3", label: "$50,000 - $100,000" },
            { id: "budget4", label: "$100,000+" },
          ],
        },
        {
          id: "field8",
          type: "select",
          label: "Timeline",
          required: true,
          options: [
            { id: "time1", label: "Immediate (< 1 month)" },
            { id: "time2", label: "1-3 months" },
            { id: "time3", label: "3-6 months" },
            { id: "time4", label: "6+ months" },
          ],
        },
        {
          id: "field9",
          type: "textarea",
          label: "Additional Requirements",
          required: false,
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
          id: "smb-route",
          action: { type: "eventTypeRedirectUrl", value: "team/smb-sales" },
          queryValue: {
            type: "group",
            children1: {
              rule1: {
                type: "rule",
                properties: {
                  field: "field5",
                  operator: "select_any_in",
                  value: ["opt1", "opt2", "opt3"],
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
    ...baseProps,
  },
};

export const DisabledForm: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Inactive Form",
      disabled: true,
      description: "This form is currently disabled and not accepting responses",
    },
    ...baseProps,
  },
};

export const NoResponsesYet: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Brand New Form",
      description: "Just created, waiting for the first response",
      _count: {
        responses: 0,
      },
    },
    ...baseProps,
  },
};

export const MinimalForm: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Simple Contact Form",
      description: null,
      fields: [
        {
          id: "field1",
          type: "text",
          label: "Name",
          required: true,
        },
        {
          id: "field2",
          type: "email",
          label: "Email",
          required: true,
        },
      ],
      routes: [
        {
          id: "default",
          action: { type: "eventTypeRedirectUrl", value: "team/general" },
          isFallback: true,
        },
      ],
      _count: {
        responses: 23,
      },
    },
    ...baseProps,
  },
};

export const WithConnectedForms: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Multi-Form Router",
      description: "Routes to other routing forms based on user selection",
      connectedForms: [
        { id: "form1", name: "Sales Qualification", description: "Qualify sales leads" },
        { id: "form2", name: "Support Intake", description: "Technical support requests" },
        { id: "form3", name: "Partnership Inquiry", description: "Partnership opportunities" },
      ],
      routers: [
        { id: "router1", name: "Regional Router", description: "Routes by region" },
      ],
    },
    ...baseProps,
  },
};

export const WithTeamMembers: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Team Routing Form",
      description: "Routes inquiries to available team members",
      teamId: 10,
      team: {
        slug: "customer-success",
        name: "Customer Success Team",
      },
      teamMembers: [
        {
          id: 1,
          name: "Alice Johnson",
          email: "alice@example.com",
          avatarUrl: "https://i.pravatar.cc/150?img=1",
          defaultScheduleId: 1,
        },
        {
          id: 2,
          name: "Bob Smith",
          email: "bob@example.com",
          avatarUrl: "https://i.pravatar.cc/150?img=2",
          defaultScheduleId: 2,
        },
        {
          id: 3,
          name: "Carol Williams",
          email: "carol@example.com",
          avatarUrl: "https://i.pravatar.cc/150?img=3",
          defaultScheduleId: 3,
        },
      ],
    },
    ...baseProps,
  },
};

export const ReadOnlyPermissions: Story = {
  args: {
    form: baseMockForm,
    appUrl: "/apps/routing-forms",
    Page: MockPage,
    enrichedWithUserProfileForm: baseProps.enrichedWithUserProfileForm,
    permissions: {
      canEditForm: false,
      canDeleteForm: false,
      canToggleForm: false,
    },
  },
};

export const PartialPermissions: Story = {
  args: {
    form: baseMockForm,
    appUrl: "/apps/routing-forms",
    Page: MockPage,
    enrichedWithUserProfileForm: baseProps.enrichedWithUserProfileForm,
    permissions: {
      canEditForm: true,
      canDeleteForm: false,
      canToggleForm: true,
    },
  },
};

export const WithEmailNotifications: Story = {
  args: {
    form: {
      ...baseMockForm,
      name: "Form with Notifications",
      settings: {
        emailOwnerOnSubmission: true,
        sendUpdatesTo: ["admin@example.com", "team@example.com"],
      },
    },
    ...baseProps,
  },
};
