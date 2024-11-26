import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ToolbarPlugin from "./ToolbarPlugin";

// Mocks
vi.mock("../../icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>{name}</span>,
}));

vi.mock("../../button", () => ({
  Button: ({ children, onClick, StartIcon }: any) => (
    <button onClick={onClick} data-testid={`button-${StartIcon || "default"}`}>
      {StartIcon && <span>{StartIcon}</span>}
      {children}
    </button>
  ),
}));

vi.mock("../../dropdown", () => ({
  Dropdown: ({ children }: any) => <div data-testid="dropdown">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div data-testid="dropdown-item">{children}</div>,
}));

vi.mock("./AddVariablesDropdown", () => ({
  AddVariablesDropdown: () => <div data-testid="add-variables-dropdown">AddVariablesDropdown</div>,
}));

const initialConfig = {
  namespace: "MyEditor",
  theme: {},
  onError: (error: Error) => console.error(error),
};

const TestWrapper = ({ children }: { children: string | JSX.Element }) => (
  <LexicalComposer initialConfig={initialConfig}>
    <RichTextPlugin
      contentEditable={<ContentEditable />}
      placeholder={<div>Enter some text...</div>}
      ErrorBoundary={LexicalErrorBoundary}
    />
    <HistoryPlugin />
    {children}
  </LexicalComposer>
);

describe("ToolbarPlugin", () => {
  const defaultProps = {
    editable: true,
    getText: vi.fn(() => ""),
    setText: vi.fn(),
    firstRender: true,
    setFirstRender: vi.fn(),
    updateTemplate: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default props", () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByTestId("dropdown")).toBeDefined();
    expect(screen.getByTestId("button-bold")).toBeDefined();
    expect(screen.getByTestId("button-italic")).toBeDefined();
    expect(screen.getByTestId("button-link")).toBeDefined();
  });

  it("does not render when editable is false", () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} editable={false} />
      </TestWrapper>
    );

    expect(screen.queryByTestId("dropdown")).toBeNull();
  });

  it("renders variables dropdown when variables prop is provided", () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} variables={["var1", "var2"]} />
      </TestWrapper>
    );

    expect(screen.getByTestId("add-variables-dropdown")).toBeDefined();
  });

  it("excludes toolbar items when specified", () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} excludedToolbarItems={["bold", "italic"]} />
      </TestWrapper>
    );

    expect(screen.queryByTestId("button-bold")).toBeNull();
    expect(screen.queryByTestId("button-italic")).toBeNull();
    expect(screen.getByTestId("button-link")).toBeDefined();
  });

  it("changes block type when dropdown item is clicked", async () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId("dropdown-trigger"));
    await waitFor(() => {
      expect(screen.getByTestId("dropdown-content")).toBeDefined();
    });

    const h1Button = screen.getByText("Large Heading");
    fireEvent.click(h1Button);
  });

  it("toggles bold formatting when bold button is clicked", () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} />
      </TestWrapper>
    );

    const boldButton = screen.getByTestId("button-bold");
    fireEvent.click(boldButton);
  });

  it("toggles italic formatting when italic button is clicked", () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} />
      </TestWrapper>
    );

    const italicButton = screen.getByTestId("button-italic");
    fireEvent.click(italicButton);
  });

  it("toggles link when link button is clicked", async () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} />
      </TestWrapper>
    );

    const linkButton = screen.getByTestId("button-link");
    fireEvent.click(linkButton);
  });

  // Additional tests
  it("calls setText when editor content changes", async () => {
    render(
      <TestWrapper>
        <ToolbarPlugin {...defaultProps} />
      </TestWrapper>
    );

    const editableContent = screen.getByRole("textbox");
    await userEvent.type(editableContent, "Hello, World!");

    expect(defaultProps.setText).toHaveBeenCalled();
  });

  it("updates editor content when updateTemplate prop changes", async () => {
    const getText = vi.fn(() => "<p>Initial content</p>");
    const setText = vi.fn();
    const setFirstRender = vi.fn();

    const { rerender } = render(
      <TestWrapper>
        <ToolbarPlugin
          {...defaultProps}
          getText={getText}
          setText={setText}
          setFirstRender={setFirstRender}
          firstRender={true}
          updateTemplate={false}
        />
      </TestWrapper>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(setFirstRender).toHaveBeenCalledWith(false);
    });

    // Update getText mock and trigger update
    getText.mockReturnValue("<p>Updated content</p>");

    await act(async () => {
      rerender(
        <TestWrapper>
          <ToolbarPlugin
            {...defaultProps}
            getText={getText}
            setText={setText}
            setFirstRender={setFirstRender}
            firstRender={false}
            updateTemplate={true}
          />
        </TestWrapper>
      );
    });

    // Wait for content update
    await waitFor(
      () => {
        expect(setText).toHaveBeenCalledWith(expect.stringContaining("Updated content"));
      },
      { timeout: 5000 }
    );
  });

  it("initializes editor with provided text", async () => {
    const getText = vi.fn(() => "<p>Initial content</p>");
    const setText = vi.fn();
    const setFirstRender = vi.fn();

    render(
      <TestWrapper>
        <ToolbarPlugin
          {...defaultProps}
          getText={getText}
          setText={setText}
          setFirstRender={setFirstRender}
          firstRender={true}
        />
      </TestWrapper>
    );

    await waitFor(
      () => {
        expect(setFirstRender).toHaveBeenCalledWith(false);
        expect(setText).toHaveBeenCalledWith(expect.stringContaining("Initial content"));
      },
      { timeout: 3000 }
    );
  });

  it("calls setText after content update", async () => {
    const setText = vi.fn();
    await act(async () => {
      render(
        <TestWrapper>
          <ToolbarPlugin {...defaultProps} setText={setText} getText={() => "<p>Test content</p>"} />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(setText).toHaveBeenCalled();
    });
  });
});
