import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { AddVariablesDropdown } from "./AddVariablesDropdown";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the Dropdown component
vi.mock("../../dropdown", () => ({
  Dropdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/lib/hooks/useMediaQuery", () => ({
  default: (_query: string) => false,
}));

describe("AddVariablesDropdown", () => {
  const mockAddVariable = vi.fn();
  const variables = ["var1", "var2", "var3"];

  it("renders correctly", () => {
    render(<AddVariablesDropdown addVariable={mockAddVariable} variables={variables} />);
    expect(screen.getByText("add_variable")).toBeInTheDocument();
  });

  it("renders text editor version correctly", () => {
    render(<AddVariablesDropdown addVariable={mockAddVariable} variables={variables} isTextEditor />);
    expect(screen.getByText("add_variable")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    render(<AddVariablesDropdown addVariable={mockAddVariable} variables={variables} />);
    fireEvent.click(screen.getByText("add_variable"));
    await waitFor(() => {
      expect(screen.getByText("add_dynamic_variables")).toBeInTheDocument();
    });
  });

  it("renders all variables", async () => {
    render(<AddVariablesDropdown addVariable={mockAddVariable} variables={variables} />);
    fireEvent.click(screen.getByText("add_variable"));
    await waitFor(() => {
      for (const variable of variables) {
        expect(
          screen.getByText((content) => content.includes(`{${variable}_variable}`.toUpperCase()))
        ).toBeInTheDocument();
      }
    });
  });

  it("calls addVariable when a variable is clicked", async () => {
    render(<AddVariablesDropdown addVariable={mockAddVariable} variables={variables} />);
    fireEvent.click(screen.getByText("add_variable"));
    await waitFor(() => {
      fireEvent.click(screen.getByText((content) => content.includes("{VAR1_VARIABLE}")));
    });
    expect(mockAddVariable).toHaveBeenCalledWith("var1_variable");
  });

  it("renders variable info for each variable", async () => {
    render(<AddVariablesDropdown addVariable={mockAddVariable} variables={variables} />);
    fireEvent.click(screen.getByText("add_variable"));
    await waitFor(() => {
      for (const variable of variables) {
        expect(screen.getByText(`${variable}_info`)).toBeInTheDocument();
      }
    });
  });
});
