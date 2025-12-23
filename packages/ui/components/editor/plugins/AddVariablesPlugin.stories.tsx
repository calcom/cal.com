import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import ExampleTheme from "../ExampleTheme";
import { VariableNode } from "../nodes/VariableNode";
import "../stylesEditor.css";
import AddVariablesPlugin from "./AddVariablesPlugin";
import AutoLinkPlugin from "./AutoLinkPlugin";

const editorConfig = {
  theme: ExampleTheme,
  onError(error: Error) {
    console.error(error);
  },
  namespace: "AddVariablesPluginStorybook",
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    TableNode,
    TableCellNode,
    TableRowNode,
    AutoLinkNode,
    LinkNode,
    VariableNode,
  ],
};

const EditorWrapper = ({
  children,
  height = "250px",
}: {
  children: React.ReactNode;
  height?: string;
}) => {
  return (
    <LexicalComposer initialConfig={{ ...editorConfig }}>
      <div className="editor-container rounded-lg p-0 transition focus-within:shadow-outline-gray-focused focus-within:border-emphasis border border-default">
        <div className="editor-inner scroll-bar overflow-x-hidden" style={{ height }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id="custom-editor"
                style={{ height }}
                className="editor-input focus:outline-none"
              />
            }
            placeholder={
              <div className="text-muted -mt-11 p-3 text-sm">Type {"{"} to insert a variable...</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          {children}
          <ListPlugin />
          <LinkPlugin />
          <AutoLinkPlugin />
          <HistoryPlugin />
        </div>
      </div>
    </LexicalComposer>
  );
};

const meta = {
  component: AddVariablesPlugin,
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
} satisfies Meta<typeof AddVariablesPlugin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const variables = ["attendee name", "event name", "event date", "event time", "organizer name"];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const BasicVariables: Story = {
  render: function BasicVariablesStory() {
    const variables = ["name", "email", "phone"];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const ExtensiveVariables: Story = {
  render: function ExtensiveVariablesStory() {
    const variables = [
      "attendee name",
      "attendee email",
      "attendee phone",
      "attendee timezone",
      "event name",
      "event description",
      "event date",
      "event time",
      "event duration",
      "event location",
      "organizer name",
      "organizer email",
      "organizer phone",
      "booking id",
      "booking reference",
      "meeting url",
      "cancellation reason",
      "reschedule reason",
    ];

    return (
      <EditorWrapper height="350px">
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const SingleVariable: Story = {
  render: function SingleVariableStory() {
    const variables = ["attendee name"];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const NoVariables: Story = {
  render: function NoVariablesStory() {
    const variables: string[] = [];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const EventVariables: Story = {
  render: function EventVariablesStory() {
    const variables = [
      "event name",
      "event description",
      "event date",
      "event time",
      "event duration",
      "event location",
      "event type",
    ];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const AttendeeVariables: Story = {
  render: function AttendeeVariablesStory() {
    const variables = [
      "attendee name",
      "attendee email",
      "attendee phone",
      "attendee timezone",
      "attendee notes",
    ];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const OrganizerVariables: Story = {
  render: function OrganizerVariablesStory() {
    const variables = ["organizer name", "organizer email", "organizer phone", "organizer company"];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const BookingVariables: Story = {
  render: function BookingVariablesStory() {
    const variables = [
      "booking id",
      "booking reference",
      "booking status",
      "meeting url",
      "cancellation reason",
      "reschedule reason",
      "booking notes",
    ];

    return (
      <EditorWrapper>
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};

export const FilteringDemo: Story = {
  render: function FilteringDemoStory() {
    const variables = [
      "attendee name",
      "attendee email",
      "attendee phone",
      "event name",
      "event date",
      "event time",
      "organizer name",
      "organizer email",
    ];

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2">Try typing:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code className="bg-white px-2 py-1 rounded">{"{"}</code> - See all variables
            </li>
            <li>
              <code className="bg-white px-2 py-1 rounded">{"{attendee"}</code> - Filter to attendee
              variables
            </li>
            <li>
              <code className="bg-white px-2 py-1 rounded">{"{event"}</code> - Filter to event
              variables
            </li>
            <li>
              <code className="bg-white px-2 py-1 rounded">{"{email"}</code> - Filter by keyword
            </li>
          </ul>
        </div>
        <EditorWrapper height="300px">
          <AddVariablesPlugin variables={variables} />
        </EditorWrapper>
      </div>
    );
  },
};

export const WithExistingVariables: Story = {
  render: function WithExistingVariablesStory() {
    const variables = ["attendee name", "event name", "event date", "organizer name"];

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2">
            Variables are automatically converted when pasted or typed:
          </p>
          <p>
            Try typing: <code className="bg-white px-2 py-1 rounded">{"{ATTENDEE_NAME}"}</code>
          </p>
        </div>
        <EditorWrapper>
          <AddVariablesPlugin variables={variables} />
        </EditorWrapper>
      </div>
    );
  },
};

export const TallEditor: Story = {
  render: function TallEditorStory() {
    const variables = [
      "attendee name",
      "attendee email",
      "event name",
      "event date",
      "event time",
      "event location",
      "organizer name",
      "organizer email",
      "meeting url",
      "booking reference",
    ];

    return (
      <EditorWrapper height="500px">
        <AddVariablesPlugin variables={variables} />
      </EditorWrapper>
    );
  },
};
