/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { ArrowDown, ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "./Dropdown";

describe("Tests for Dropdown component", () => {
  function DropDownExample({ children }: { children: React.ReactNode }) {
    return (
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <button data-testid="dd-trigger-btn">Select</button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent>{children}</DropdownMenuContent>
        </DropdownMenuPortal>
      </Dropdown>
    );
  }
  test("should render dropdown", async () => {
    render(
      <DropDownExample>
        <DropdownMenuItem>
          <DropdownItem
            data-testid="dd-one"
            StartIcon={ArrowUpIcon}
            EndIcon={ArrowDown}
            color="destructive"
            href="https://example.com">
            First
          </DropdownItem>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownItem>
            <DropdownMenuLabel data-testid="dd-label">Second</DropdownMenuLabel>
          </DropdownItem>
        </DropdownMenuItem>
      </DropDownExample>
    );
    const btn = screen.getByTestId("dd-trigger-btn");
    expect(btn.getAttribute("data-state")).toEqual("closed");
    fireEvent.pointerDown(btn);
    expect(btn.getAttribute("data-state")).toEqual("open");
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByTestId("dd-label")).toBeInTheDocument();
    expect(screen.getByTestId("dd-one")).toBeInTheDocument();
    expect(screen.getByTestId("dd-one").getElementsByTagName("svg").length).toBe(2);
  });

  test("should render dropdown with radio items", () => {
    function DropDownWithRadio() {
      const [value, setValue] = useState("One");

      return (
        <DropDownExample>
          <DropdownMenuItem>
            <DropdownMenuRadioGroup data-testid="test-radio-group" value={value} onValueChange={setValue}>
              <DropdownMenuRadioItem data-testid="test-radio1" value="One">
                One
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem data-testid="test-radio2" value="Two">
                Two
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuItem>
        </DropDownExample>
      );
    }
    render(<DropDownWithRadio />);
    const btn = screen.getByTestId("dd-trigger-btn");
    fireEvent.pointerDown(btn);
    expect(screen.getByTestId("test-radio1").getAttribute("data-state")).toEqual("checked");
    expect(screen.getByTestId("test-radio2").getAttribute("data-state")).toEqual("unchecked");
  });

  test("should render dropdown with checkbox items", () => {
    function DropDownWithCheckBox({ isChecked }: { isChecked: boolean }) {
      const [checked, setChecked] = useState(isChecked);

      return (
        <DropDownExample>
          <DropdownMenuItem>
            <DropdownMenuCheckboxItem data-testid="cbox" checked={checked} onCheckedChange={setChecked}>
              Is Completed ?
            </DropdownMenuCheckboxItem>
          </DropdownMenuItem>
        </DropDownExample>
      );
    }
    render(<DropDownWithCheckBox isChecked={true} />);
    const btn = screen.getByTestId("dd-trigger-btn");
    fireEvent.pointerDown(btn);
    expect(screen.getByTestId("cbox").getAttribute("data-state")).toEqual("checked");
  });
});
