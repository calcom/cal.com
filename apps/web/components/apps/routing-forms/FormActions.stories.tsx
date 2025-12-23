import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { FormAction, FormActionsDropdown, FormActionsProvider } from "./FormActions";
import type { NewFormDialogState } from "./FormActions";

type RoutingForm = {
  id: string;
  name: string;
  disabled: boolean;
  fields?: Array<{
    identifier?: string;
    id: string;
    type: string;
    label: string;
    routerId?: string | null;
  }>;
};

const mockRoutingForm: RoutingForm = {
  id: "form-123",
  name: "Customer Intake Form",
  disabled: false,
  fields: [
    {
      id: "field-1",
      identifier: "customer_name",
      type: "text",
      label: "Customer Name",
      routerId: null,
    },
    {
      id: "field-2",
      identifier: "email",
      type: "email",
      label: "Email Address",
      routerId: null,
    },
  ],
};

const mockDisabledForm: RoutingForm = {
  id: "form-456",
  name: "Disabled Form",
  disabled: true,
};

// Wrapper component to handle provider state
function FormActionsWrapper({ children }: { children: React.ReactNode }) {
  const [newFormDialogState, setNewFormDialogState] = useState<NewFormDialogState>(null);

  return (
    <FormActionsProvider
      appUrl="/routing-forms"
      newFormDialogState={newFormDialogState}
      setNewFormDialogState={setNewFormDialogState}>
      {children}
    </FormActionsProvider>
  );
}

const meta = {
  title: "Components/Apps/RoutingForms/FormActions",
  component: FormAction,
  parameters: {
    layout: "centered",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <FormActionsWrapper>
        <div style={{ padding: "20px" }}>
          <Story />
        </div>
      </FormActionsWrapper>
    ),
  ],
} satisfies Meta<typeof FormAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FormAction action="edit" routingForm={mockRoutingForm} color="primary">
      Edit Form
    </FormAction>
  ),
};

export const EditAction: Story = {
  render: () => (
    <FormAction action="edit" routingForm={mockRoutingForm} color="secondary" StartIcon="pencil">
      Edit
    </FormAction>
  ),
};

export const PreviewAction: Story = {
  render: () => (
    <FormAction action="preview" routingForm={mockRoutingForm} color="secondary" StartIcon="eye">
      Preview
    </FormAction>
  ),
};

export const CopyLinkAction: Story = {
  render: () => (
    <FormAction
      action="copyLink"
      routingForm={mockRoutingForm}
      color="secondary"
      StartIcon="link">
      Copy Link
    </FormAction>
  ),
};

export const DuplicateAction: Story = {
  render: () => (
    <FormAction
      action="duplicate"
      routingForm={mockRoutingForm}
      color="secondary"
      StartIcon="copy">
      Duplicate
    </FormAction>
  ),
};

export const DeleteAction: Story = {
  render: () => (
    <FormAction
      action="_delete"
      routingForm={mockRoutingForm}
      color="destructive"
      StartIcon="trash-2">
      Delete
    </FormAction>
  ),
};

export const DownloadAction: Story = {
  render: () => (
    <FormAction
      action="download"
      routingForm={mockRoutingForm}
      color="secondary"
      StartIcon="download">
      Download CSV
    </FormAction>
  ),
};

export const ViewResponsesAction: Story = {
  render: () => (
    <FormAction
      action="viewResponses"
      routingForm={mockRoutingForm}
      color="secondary"
      StartIcon="bar-chart">
      View Responses
    </FormAction>
  ),
};

export const ToggleAction: Story = {
  render: () => (
    <FormAction action="toggle" routingForm={mockRoutingForm} label="Enable form" />
  ),
};

export const ToggleDisabledForm: Story = {
  render: () => (
    <FormAction action="toggle" routingForm={mockDisabledForm} label="Enable form" />
  ),
};

export const CopyRedirectUrlAction: Story = {
  render: () => (
    <FormAction
      action="copyRedirectUrl"
      routingForm={mockRoutingForm}
      color="secondary"
      StartIcon="link">
      Copy Redirect URL
    </FormAction>
  ),
};

export const CreateFormAction: Story = {
  render: () => (
    <FormAction action="create" routingForm={null} color="primary" StartIcon="plus">
      Create New Form
    </FormAction>
  ),
};

export const ActionsDropdown: Story = {
  render: () => (
    <FormActionsDropdown>
      <FormAction action="edit" routingForm={mockRoutingForm} color="minimal" StartIcon="pencil">
        Edit
      </FormAction>
      <FormAction
        action="preview"
        routingForm={mockRoutingForm}
        color="minimal"
        StartIcon="eye">
        Preview
      </FormAction>
      <FormAction
        action="copyLink"
        routingForm={mockRoutingForm}
        color="minimal"
        StartIcon="link">
        Copy Link
      </FormAction>
      <FormAction
        action="duplicate"
        routingForm={mockRoutingForm}
        color="minimal"
        StartIcon="copy">
        Duplicate
      </FormAction>
      <FormAction
        action="download"
        routingForm={mockRoutingForm}
        color="minimal"
        StartIcon="download">
        Download CSV
      </FormAction>
      <FormAction
        action="viewResponses"
        routingForm={mockRoutingForm}
        color="minimal"
        StartIcon="bar-chart">
        View Responses
      </FormAction>
      <FormAction
        action="_delete"
        routingForm={mockRoutingForm}
        color="destructive"
        StartIcon="trash-2">
        Delete
      </FormAction>
    </FormActionsDropdown>
  ),
};

export const DisabledDropdown: Story = {
  render: () => (
    <FormActionsDropdown disabled>
      <FormAction action="edit" routingForm={mockRoutingForm} color="minimal" StartIcon="pencil">
        Edit
      </FormAction>
      <FormAction
        action="preview"
        routingForm={mockRoutingForm}
        color="minimal"
        StartIcon="eye">
        Preview
      </FormAction>
    </FormActionsDropdown>
  ),
};

export const ActionButtons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <FormAction action="edit" routingForm={mockRoutingForm} color="primary">
        Edit
      </FormAction>
      <FormAction action="preview" routingForm={mockRoutingForm} color="secondary">
        Preview
      </FormAction>
      <FormAction action="copyLink" routingForm={mockRoutingForm} color="secondary">
        Copy Link
      </FormAction>
      <FormAction action="duplicate" routingForm={mockRoutingForm} color="secondary">
        Duplicate
      </FormAction>
      <FormAction action="_delete" routingForm={mockRoutingForm} color="destructive">
        Delete
      </FormAction>
    </div>
  ),
};

export const ActionButtonsWithIcons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <FormAction action="edit" routingForm={mockRoutingForm} color="primary" StartIcon="pencil">
        Edit
      </FormAction>
      <FormAction action="preview" routingForm={mockRoutingForm} color="secondary" StartIcon="eye">
        Preview
      </FormAction>
      <FormAction
        action="copyLink"
        routingForm={mockRoutingForm}
        color="secondary"
        StartIcon="link">
        Copy Link
      </FormAction>
      <FormAction
        action="duplicate"
        routingForm={mockRoutingForm}
        color="secondary"
        StartIcon="copy">
        Duplicate
      </FormAction>
      <FormAction
        action="download"
        routingForm={mockRoutingForm}
        color="secondary"
        StartIcon="download">
        Download
      </FormAction>
      <FormAction
        action="_delete"
        routingForm={mockRoutingForm}
        color="destructive"
        StartIcon="trash-2">
        Delete
      </FormAction>
    </div>
  ),
};

export const IconOnlyActions: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px" }}>
      <FormAction
        action="edit"
        routingForm={mockRoutingForm}
        variant="icon"
        color="secondary"
        StartIcon="pencil"
        tooltip="Edit form"
      />
      <FormAction
        action="preview"
        routingForm={mockRoutingForm}
        variant="icon"
        color="secondary"
        StartIcon="eye"
        tooltip="Preview form"
      />
      <FormAction
        action="copyLink"
        routingForm={mockRoutingForm}
        variant="icon"
        color="secondary"
        StartIcon="link"
        tooltip="Copy link"
      />
      <FormAction
        action="duplicate"
        routingForm={mockRoutingForm}
        variant="icon"
        color="secondary"
        StartIcon="copy"
        tooltip="Duplicate form"
      />
      <FormAction
        action="_delete"
        routingForm={mockRoutingForm}
        variant="icon"
        color="destructive"
        StartIcon="trash-2"
        tooltip="Delete form"
      />
    </div>
  ),
};

export const FormWithToggle: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        minWidth: "400px",
      }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Customer Intake Form</h3>
        <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#6b7280" }}>
          Form is currently enabled
        </p>
      </div>
      <FormAction action="toggle" routingForm={mockRoutingForm} label="Enabled" />
      <FormActionsDropdown>
        <FormAction
          action="edit"
          routingForm={mockRoutingForm}
          color="minimal"
          StartIcon="pencil">
          Edit
        </FormAction>
        <FormAction
          action="preview"
          routingForm={mockRoutingForm}
          color="minimal"
          StartIcon="eye">
          Preview
        </FormAction>
        <FormAction
          action="copyLink"
          routingForm={mockRoutingForm}
          color="minimal"
          StartIcon="link">
          Copy Link
        </FormAction>
        <FormAction
          action="duplicate"
          routingForm={mockRoutingForm}
          color="minimal"
          StartIcon="copy">
          Duplicate
        </FormAction>
        <FormAction
          action="_delete"
          routingForm={mockRoutingForm}
          color="destructive"
          StartIcon="trash-2">
          Delete
        </FormAction>
      </FormActionsDropdown>
    </div>
  ),
};

export const CompleteFormCard: Story = {
  render: () => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "20px",
        minWidth: "600px",
        backgroundColor: "#ffffff",
      }}>
      <div style={{ display: "flex", alignItems: "start", gap: "16px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Customer Intake Form</h3>
          <p style={{ margin: "8px 0", fontSize: "14px", color: "#6b7280" }}>
            Collect customer information and route to the right team
          </p>
          <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: "#9ca3af" }}>
            <span>2 fields</span>
            <span>•</span>
            <span>45 responses</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FormAction action="toggle" routingForm={mockRoutingForm} label="" />
          <FormActionsDropdown>
            <FormAction
              action="edit"
              routingForm={mockRoutingForm}
              color="minimal"
              StartIcon="pencil">
              Edit
            </FormAction>
            <FormAction
              action="preview"
              routingForm={mockRoutingForm}
              color="minimal"
              StartIcon="eye">
              Preview
            </FormAction>
            <FormAction
              action="copyLink"
              routingForm={mockRoutingForm}
              color="minimal"
              StartIcon="link">
              Copy Link
            </FormAction>
            <FormAction
              action="duplicate"
              routingForm={mockRoutingForm}
              color="minimal"
              StartIcon="copy">
              Duplicate
            </FormAction>
            <FormAction
              action="download"
              routingForm={mockRoutingForm}
              color="minimal"
              StartIcon="download">
              Download CSV
            </FormAction>
            <FormAction
              action="viewResponses"
              routingForm={mockRoutingForm}
              color="minimal"
              StartIcon="bar-chart">
              View Responses
            </FormAction>
            <FormAction
              action="_delete"
              routingForm={mockRoutingForm}
              color="destructive"
              StartIcon="trash-2">
              Delete
            </FormAction>
          </FormActionsDropdown>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <FormAction action="edit" routingForm={mockRoutingForm} color="primary" size="sm">
          Edit Form
        </FormAction>
        <FormAction action="preview" routingForm={mockRoutingForm} color="secondary" size="sm">
          Preview
        </FormAction>
        <FormAction action="viewResponses" routingForm={mockRoutingForm} color="secondary" size="sm">
          View Responses
        </FormAction>
      </div>
    </div>
  ),
};
