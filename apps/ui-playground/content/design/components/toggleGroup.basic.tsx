"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

export const BasicExample = () => {
  const [period, setPeriod] = useState("month");
  return (
    <RenderComponentWithSnippet>
      <ToggleGroup
        value={period}
        onValueChange={(value) => {
          setPeriod(value);
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
};

export const WithIconsExample = () => {
  const [layout, setLayout] = useState("grid");
  return (
    <RenderComponentWithSnippet>
      <ToggleGroup
        value={layout}
        onValueChange={(value) => {
          setLayout(value);
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
};

export const DisabledExample = () => {
  const [selected, setSelected] = useState("active");

  return (
    <RenderComponentWithSnippet>
      <ToggleGroup
        value={selected}
        onValueChange={(value) => {
          setSelected(value);
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
};

export const FullWidthExample = () => {
  const [selected, setSelected] = useState("all");
  return (
    <RenderComponentWithSnippet>
      <ToggleGroup
        isFullWidth
        value={selected}
        onValueChange={(value) => {
          setSelected(value);
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
};

export const VerticalExample = () => {
  const [selected, setSelected] = useState("inbox");
  return (
    <RenderComponentWithSnippet>
      <ToggleGroup
        orientation="vertical"
        value={selected}
        onValueChange={(value) => {
          setSelected(value);
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
};

export const IconOnlyExample = () => {
  const [horizontalLayout, setHorizontalLayout] = useState("list");
  const [verticalLayout, setVerticalLayout] = useState("list");
  return (
    <RenderComponentWithSnippet>
      <div className="space-y-8">
        {/* Horizontal icon-only toggle group */}
        <ToggleGroup
          value={horizontalLayout}
          onValueChange={(value) => {
            setHorizontalLayout(value);
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
          value={verticalLayout}
          onValueChange={(value) => {
            setVerticalLayout(value);
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
};
