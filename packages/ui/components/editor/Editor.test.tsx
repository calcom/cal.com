import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Editor } from "./Editor";
import type { TextEditorProps } from "./types";

vi.mock("@calcom/lib/hooks/useMediaQuery", () => ({
  default: (_query: string) => false,
}));

describe("Editor", () => {
  const defaultProps: TextEditorProps = {
    getText: vi.fn(),
    setText: vi.fn(),
    variables: ["name", "email"],
    height: "200px",
    placeholder: "Start typing...",
  };

  it("renders editor with default props", () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Start typing...")).toBeInTheDocument();
  });

  it("renders toolbar", () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("add_variable")).toBeInTheDocument();
  });

  it("excludes toolbar items", () => {
    render(<Editor {...defaultProps} excludedToolbarItems={["bold", "italic"]} />);
    expect(screen.queryByTitle("Bold")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Italic")).not.toBeInTheDocument();
  });

  it("renders variables plugin when variables are provided", () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByText("add_variable")).toBeInTheDocument();
  });

  it("does not render variables plugin when variables are not provided", () => {
    render(<Editor {...defaultProps} variables={undefined} />);
    expect(screen.queryByText("add_variable")).not.toBeInTheDocument();
  });

  it("disables lists when disableLists is true", () => {
    render(<Editor {...defaultProps} disableLists={true} />);
    expect(screen.queryByTitle("Bullet List")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Numbered List")).not.toBeInTheDocument();
  });

  it("calls getText when text is entered", async () => {
    const user = userEvent.setup();
    render(<Editor {...defaultProps} />);
    const editor = screen.getByRole("textbox");
    await user.type(editor, "Hello, world!");
    expect(defaultProps.getText).toHaveBeenCalled();
  });

  it("applies custom height", () => {
    render(<Editor {...defaultProps} height="300px" />);
    const editorInner = screen.getByRole("textbox").parentElement;
    expect(editorInner).toHaveStyle({ height: "300px" });
  });

  it("handles first render and update template", () => {
    const setFirstRender = vi.fn();
    render(
      <Editor {...defaultProps} updateTemplate={true} firstRender={true} setFirstRender={setFirstRender} />
    );
    expect(setFirstRender).toHaveBeenCalled();
  });
});
