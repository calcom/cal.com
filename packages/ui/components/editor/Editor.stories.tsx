import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Editor } from "./Editor";
import "./stylesEditor.css";

const meta = {
  component: Editor,
  title: "UI/Editor",
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
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
        placeholder="Start typing..."
      />
    );
  },
};

export const WithLabel: Story = {
  render: function WithLabelStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
        label="Description"
        placeholder="Enter a description..."
      />
    );
  },
};

export const WithInitialContent: Story = {
  render: function WithInitialContentStory() {
    const [text, setText] = useState(
      "<p>This is some <b>bold</b> and <i>italic</i> text with a <a href='https://cal.com'>link</a>.</p>"
    );
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
      />
    );
  },
};

export const WithVariables: Story = {
  render: function WithVariablesStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);
    const variables = ["attendee name", "event name", "event date", "event time", "organizer name"];

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
        variables={variables}
        placeholder="Type @ to insert a variable..."
      />
    );
  },
};

export const WithVariablesButtonTop: Story = {
  render: function WithVariablesButtonTopStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);
    const variables = ["attendee name", "event name", "event date", "event time"];

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
        variables={variables}
        addVariableButtonTop={true}
        placeholder="Use the variable button above..."
      />
    );
  },
};

export const ReadOnly: Story = {
  render: function ReadOnlyStory() {
    const [text, setText] = useState(
      "<h2>Read Only Content</h2><p>This editor is in read-only mode. You cannot edit this content.</p><ul><li>Item one</li><li>Item two</li></ul>"
    );
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="250px"
        editable={false}
      />
    );
  },
};

export const PlainTextMode: Story = {
  render: function PlainTextModeStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="150px"
        plainText={true}
        placeholder="Plain text only..."
      />
    );
  },
};

export const DisabledLists: Story = {
  render: function DisabledListsStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
        disableLists={true}
        placeholder="Lists are disabled in this editor..."
      />
    );
  },
};

export const CustomHeight: Story = {
  render: function CustomHeightStory() {
    const [text, setText] = useState(
      "<p>This editor has a custom height of 400px to accommodate longer content.</p>"
    );
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="400px"
        maxHeight="400px"
      />
    );
  },
};

export const WithExcludedToolbarItems: Story = {
  render: function WithExcludedToolbarItemsStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="200px"
        excludedToolbarItems={["blockType", "link"]}
        placeholder="Simplified toolbar (no block type or link)..."
      />
    );
  },
};

export const FullFeatured: Story = {
  render: function FullFeaturedStory() {
    const [text, setText] = useState(
      "<h1>Welcome to the Editor</h1><p>This is a <b>fully featured</b> editor demonstrating all capabilities:</p><ul><li>Rich text formatting</li><li>Variables support</li><li>Links</li><li>Lists</li></ul><p>Try it out!</p>"
    );
    const [firstRender, setFirstRender] = useState(true);
    const variables = [
      "attendee name",
      "attendee email",
      "event name",
      "event date",
      "event time",
      "event location",
      "organizer name",
      "organizer email",
    ];

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="350px"
        label="Email Template"
        variables={variables}
      />
    );
  },
};

export const EmailTemplate: Story = {
  render: function EmailTemplateStory() {
    const [text, setText] = useState(
      "<p>Hi {attendee name},</p><p>Your booking for <b>{event name}</b> has been confirmed!</p><p><b>Date:</b> {event date}<br/><b>Time:</b> {event time}</p><p>Best regards,<br/>{organizer name}</p>"
    );
    const [firstRender, setFirstRender] = useState(true);
    const variables = [
      "attendee name",
      "attendee email",
      "event name",
      "event date",
      "event time",
      "event location",
      "organizer name",
    ];

    return (
      <Editor
        getText={() => text}
        setText={setText}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
        height="300px"
        label="Confirmation Email"
        variables={variables}
      />
    );
  },
};
