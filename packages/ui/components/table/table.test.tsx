/* eslint-disable playwright/missing-playwright-await */
import { fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";

import { Table, TableActions } from "@calcom/ui";

import { TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./TableNew";

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
    const { getByRole, getByText } = render(
      <>
        <Table>
          <>
            <TableHeader>
              <TableRow>
                <TableHead>Header Column 1</TableHead>
                <TableHead>Header Column 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Row 1, Cell 1</TableCell>
                <TableCell>Row 1, Cell 2</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Row 2, Cell 1</TableCell>
                <TableCell>Row 2, Cell 2</TableCell>
              </TableRow>
            </TableBody>
            <TableCaption>Table Caption</TableCaption>
          </>
        </Table>
      </>
    );

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
