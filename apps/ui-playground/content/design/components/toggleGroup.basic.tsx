"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

export const BasicExample = () => (
  <RenderComponentWithSnippet>
    <ToggleGroup
      defaultValue="month"
      onValueChange={(value) => {
        if (!value) return;
        console.log("Selected:", value);
      }}
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ]}
    />
  </RenderComponentWithSnippet>
);

export const WithIconsExample = () => (
  <RenderComponentWithSnippet>
    <ToggleGroup
      defaultValue="grid"
      onValueChange={(value) => {
        if (!value) return;
        console.log("Selected view:", value);
      }}
      options={[
        {
          value: "list",
          label: "List",
          iconLeft: <Icon name="menu" className="h-4 w-4" />,
        },
        {
          value: "grid",
          label: "Grid",
          iconLeft: <Icon name="grid-3x3" className="h-4 w-4" />,
        },
      ]}
    />
  </RenderComponentWithSnippet>
);

export const DisabledExample = () => (
  <RenderComponentWithSnippet>
    <ToggleGroup
      defaultValue="active"
      onValueChange={(value) => {
        if (!value) return;
        console.log("Selected status:", value);
      }}
      options={[
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "deleted", label: "Deleted", disabled: true },
      ]}
    />
  </RenderComponentWithSnippet>
);

export const FullWidthExample = () => (
  <RenderComponentWithSnippet>
    <ToggleGroup
      isFullWidth
      defaultValue="all"
      onValueChange={(value) => {
        if (!value) return;
        console.log("Selected filter:", value);
      }}
      options={[
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ]}
    />
  </RenderComponentWithSnippet>
);

export const VerticalExample = () => (
  <RenderComponentWithSnippet>
    <ToggleGroup
      orientation="vertical"
      defaultValue="inbox"
      onValueChange={(value) => {
        if (!value) return;
        console.log("Selected mailbox:", value);
      }}
      options={[
        {
          value: "inbox",
          label: "Inbox",
          iconLeft: <Icon name="mail" className="h-4 w-4" />,
        },
        {
          value: "sent",
          label: "Sent",
          iconLeft: <Icon name="send" className="h-4 w-4" />,
        },
        {
          value: "archive",
          label: "Archive",
          iconLeft: <Icon name="trash" className="h-4 w-4" />,
        },
      ]}
    />
  </RenderComponentWithSnippet>
);

export const IconOnlyExample = () => (
  <RenderComponentWithSnippet>
    <div className="space-y-8">
      {/* Horizontal icon-only toggle group */}
      <ToggleGroup
        defaultValue="list"
        onValueChange={(value) => {
          if (!value) return;
          console.log("Selected view:", value);
        }}
        options={[
          {
            value: "list",
            label: "",
            iconLeft: <Icon name="menu" className="h-4 w-4" />,
          },
          {
            value: "grid",
            label: "",
            iconLeft: <Icon name="grid-3x3" className="h-4 w-4" />,
          },
          {
            value: "columns",
            label: "",
            iconLeft: <Icon name="blocks" className="h-4 w-4" />,
          },
        ]}
      />

      {/* Vertical icon-only toggle group */}
      <ToggleGroup
        orientation="vertical"
        defaultValue="edit"
        onValueChange={(value) => {
          if (!value) return;
          console.log("Selected tool:", value);
        }}
        options={[
          {
            value: "list",
            label: "",
            iconLeft: <Icon name="menu" className="h-4 w-4" />,
          },
          {
            value: "grid",
            label: "",
            iconLeft: <Icon name="grid-3x3" className="h-4 w-4" />,
          },
          {
            value: "columns",
            label: "",
            iconLeft: <Icon name="blocks" className="h-4 w-4" />,
          },
        ]}
      />
    </div>
  </RenderComponentWithSnippet>
);
