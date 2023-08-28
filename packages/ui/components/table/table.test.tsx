/* eslint-disable playwright/missing-playwright-await */
import { fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";

import { TableActions } from "@calcom/ui";

import { TableNewExampleComponent } from "./TableExamples";

const mockActions = [
  {
    id: "action1",
    label: "Action 1",
    href: "#",
  },
  {
    id: "action2",
    label: "Action 2",
    onClick: vi.fn(),
  },
];

describe("tests for Table component", () => {
  test("Should render Table component correctly", () => {
    const { getByRole, getByText } = render(<TableNewExampleComponent />);

    const headerElement1 = getByRole("columnheader", { name: "Header Column 1" });
    const headerElement2 = getByRole("columnheader", { name: "Header Column 2" });
    expect(headerElement1).toBeInTheDocument();
    expect(headerElement2).toBeInTheDocument();

    expect(getByText("Row 1, Cell 1")).toBeInTheDocument();
    expect(getByText("Row 1, Cell 2")).toBeInTheDocument();
    expect(getByText("Row 2, Cell 1")).toBeInTheDocument();
    expect(getByText("Row 2, Cell 2")).toBeInTheDocument();

    const captionElement = getByText("Table Caption");
    expect(captionElement).toBeInTheDocument();
  });

  test("Should render TableActions component correctly", () => {
    const { getByText } = render(<TableActions actions={mockActions} />);

    const action1Button = getByText("Action 1");
    const action2Button = getByText("Action 2");

    expect(action1Button).toBeInTheDocument();
    expect(action2Button).toBeInTheDocument();

    fireEvent.click(action2Button);
    expect(mockActions[1].onClick).toHaveBeenCalledTimes(1);
  });
});
