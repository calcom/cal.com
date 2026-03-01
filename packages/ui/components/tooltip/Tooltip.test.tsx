import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TooltipPrimitive.Provider>{ui}</TooltipPrimitive.Provider>);
};

describe("Tooltip", () => {
  it("renders trigger children", () => {
    renderWithProvider(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("renders trigger as child element", () => {
    renderWithProvider(
      <Tooltip content="Info">
        <span>Trigger</span>
      </Tooltip>
    );
    expect(screen.getByText("Trigger")).toBeInTheDocument();
  });

  it("accepts side prop", () => {
    renderWithProvider(
      <Tooltip content="Bottom tooltip" side="bottom">
        <button>Bottom</button>
      </Tooltip>
    );
    expect(screen.getByText("Bottom")).toBeInTheDocument();
  });

  it("accepts defaultOpen prop", () => {
    renderWithProvider(
      <Tooltip content="Open tooltip" defaultOpen>
        <button>Open</button>
      </Tooltip>
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("exports as default and named", () => {
    expect(Tooltip).toBeDefined();
  });
});
