import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ExampleTheme from "../ExampleTheme";
import { VariableNode } from "../nodes/VariableNode";
import CustomEnterKeyPlugin from "./customEnterKeyPlugin";

const editorConfig = {
  theme: ExampleTheme,
  onError(error: Error) {
    throw error;
  },
  namespace: "",
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

const TestEditor = () => (
  <LexicalComposer initialConfig={editorConfig}>
    <RichTextPlugin
      contentEditable={<ContentEditable />}
      placeholder={<div>Enter some text...</div>}
      ErrorBoundary={LexicalErrorBoundary}
    />
    <CustomEnterKeyPlugin />
  </LexicalComposer>
);

describe("Editor", () => {
  describe("CustomEnterKeyPlugin", () => {
    let container: HTMLElement | null = null;

    beforeEach(() => {
      container = render(<TestEditor />).container;
    });

    afterEach(() => {
      container = null;
    });

    it("should insert a line break on Enter key press", async () => {
      if (container === null) {
        throw new Error("Container is null");
      }
      const editorElement = container.querySelector('[contenteditable="true"]') as HTMLElement;

      editorElement.focus();

      const paragraphElement = editorElement.querySelector("p") as HTMLElement;
      fireEvent.keyDown(editorElement, { key: "Enter", code: "Enter", keycode: 13 });

      await waitFor(() => {
        const brElements = paragraphElement?.querySelectorAll("br");

        expect(brElements?.length).toBe(1);
      });
    });
  });
});
