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
import { useState } from "react";

import ExampleTheme from "../ExampleTheme";
import { VariableNode } from "../nodes/VariableNode";
import "../stylesEditor.css";
import AutoLinkPlugin from "./AutoLinkPlugin";
import ToolbarPlugin from "./ToolbarPlugin";

const editorConfig = {
  theme: ExampleTheme,
  onError(error: Error) {
    console.error(error);
  },
  namespace: "ToolbarPluginStorybook",
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
        {children}
        <div className="editor-inner scroll-bar overflow-x-hidden" style={{ height }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id="custom-editor"
                style={{ height }}
                className="editor-input focus:outline-none"
              />
            }
            placeholder={<div className="text-muted -mt-11 p-3 text-sm">Start typing...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
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
  component: ToolbarPlugin,
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
} satisfies Meta<typeof ToolbarPlugin>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const WithInitialContent: Story = {
  render: function WithInitialContentStory() {
    const [text, setText] = useState("<p>This is some <b>bold</b> and <i>italic</i> text.</p>");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const WithVariables: Story = {
  render: function WithVariablesStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);
    const variables = ["attendee name", "event name", "event date", "event time", "organizer name"];

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          variables={variables}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const WithVariablesButtonTop: Story = {
  render: function WithVariablesButtonTopStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);
    const variables = ["attendee name", "event name", "event date", "event time", "organizer name"];

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          variables={variables}
          addVariableButtonTop={true}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const ExcludeBoldAndItalic: Story = {
  render: function ExcludeBoldAndItalicStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          excludedToolbarItems={["bold", "italic"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const ExcludeBlockType: Story = {
  render: function ExcludeBlockTypeStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          excludedToolbarItems={["blockType"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const ExcludeLink: Story = {
  render: function ExcludeLinkStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          excludedToolbarItems={["link"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const MinimalToolbar: Story = {
  render: function MinimalToolbarStory() {
    const [text, setText] = useState("");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          excludedToolbarItems={["blockType", "italic", "link"]}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const ReadOnlyMode: Story = {
  render: function ReadOnlyModeStory() {
    const [text, setText] = useState("<p>This editor is in read-only mode.</p>");
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper>
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={false}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const WithHeadings: Story = {
  render: function WithHeadingsStory() {
    const [text, setText] = useState(
      "<h1>Large Heading</h1><h2>Small Heading</h2><p>Normal paragraph text</p>"
    );
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper height="300px">
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const WithLists: Story = {
  render: function WithListsStory() {
    const [text, setText] = useState(
      "<ul><li>Bullet item 1</li><li>Bullet item 2</li></ul><ol><li>Numbered item 1</li><li>Numbered item 2</li></ol>"
    );
    const [firstRender, setFirstRender] = useState(true);

    return (
      <EditorWrapper height="350px">
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const FullFeatured: Story = {
  render: function FullFeaturedStory() {
    const [text, setText] = useState(
      "<h1>Welcome to the Editor</h1><p>This is a <b>fully featured</b> editor with <i>rich text</i> capabilities.</p><ul><li>Lists</li><li>Headings</li><li>Variables</li></ul>"
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
      <EditorWrapper height="400px">
        <ToolbarPlugin
          getText={() => text}
          setText={setText}
          editable={true}
          variables={variables}
          firstRender={firstRender}
          setFirstRender={setFirstRender}
        />
      </EditorWrapper>
    );
  },
};

export const UpdateTemplate: Story = {
  render: function UpdateTemplateStory() {
    const [text, setText] = useState("<p>Initial template content</p>");
    const [firstRender, setFirstRender] = useState(true);
    const [updateTemplate, setUpdateTemplate] = useState(false);
    const [templateVersion, setTemplateVersion] = useState(1);

    const updateContent = () => {
      const newVersion = templateVersion + 1;
      setTemplateVersion(newVersion);
      setText(`<p>Updated template content - Version ${newVersion}</p>`);
      setUpdateTemplate(true);
      setTimeout(() => setUpdateTemplate(false), 100);
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={updateContent}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Update Template
          </button>
          <span className="px-4 py-2 bg-gray-100 rounded">Version: {templateVersion}</span>
        </div>
        <EditorWrapper>
          <ToolbarPlugin
            getText={() => text}
            setText={setText}
            editable={true}
            updateTemplate={updateTemplate}
            firstRender={firstRender}
            setFirstRender={setFirstRender}
          />
        </EditorWrapper>
      </div>
    );
  },
};
