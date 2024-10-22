import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import EditablePlugin from "./EditablePlugin";

const mockSetEditable = vi.fn();

const mockEditorContext = {
  setEditable: mockSetEditable,
};

vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [mockEditorContext],
}));

function setup(editable: boolean) {
  const initialConfig = {
    namespace: "test-editor",
    onError: (error: Error) => console.error(error),
  };

  return render(
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <EditablePlugin editable={editable} />
    </LexicalComposer>
  );
}

describe("EditablePlugin", () => {
  beforeEach(() => {
    mockSetEditable.mockClear();
  });

  it("sets the editor to editable mode", () => {
    setup(true);
    expect(mockSetEditable).toHaveBeenCalledWith(true);
  });

  it("sets the editor to non-editable mode", () => {
    setup(false);
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("renders without crashing", () => {
    setup(true);
    expect(screen.getByText("Enter some text...")).toBeTruthy();
  });
});
