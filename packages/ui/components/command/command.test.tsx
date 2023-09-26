/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Check } from "lucide-react";
import { useState } from "react";

import { classNames } from "@calcom/lib";

import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandSeparator,
} from "./index";

describe("Tests for Command component", () => {
  function CommandExample() {
    const [selectedValues, setSelectedValues] = useState<Set<number>>(new Set());
    const events = [
      {
        id: 1,
        name: "Daily Event",
      },
      {
        id: 2,
        name: "Regular Event",
      },
    ];
    // Add a value to the set
    const addValue = (value: number) => {
      const updatedSet = new Set(selectedValues);
      updatedSet.add(value);
      setSelectedValues(updatedSet);
    };

    // Remove a value from the set
    const removeValue = (value: number) => {
      const updatedSet = new Set(selectedValues);
      updatedSet.delete(value);
      setSelectedValues(updatedSet);
    };

    return (
      <Command>
        <CommandInput placeholder="Search" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {events &&
              events.map((option) => {
                const isSelected = selectedValues.has(option.id);
                return (
                  <CommandItem
                    data-testid={`item-${option.id}`}
                    key={option.id}
                    onSelect={() => {
                      if (!isSelected) {
                        addValue(option.id);
                      } else {
                        removeValue(option.id);
                      }
                    }}>
                    <span>{option.name}</span>
                    <div
                      data-testid={`check-${option.id}`}
                      className={classNames(
                        "border-subtle ml-auto flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected ? "text-emphasis" : "opacity-50 [&_svg]:invisible"
                      )}>
                      {" "}
                      <Check className={classNames("h-4 w-4")} />
                    </div>
                  </CommandItem>
                );
              })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem onSelect={() => setSelectedValues(new Set())} className="justify-center text-center">
              Clear filter
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
  }
  test("should render command", () => {
    render(<CommandExample />);
    const cmdInput = screen.getByRole("combobox");
    expect(cmdInput).toHaveAttribute("placeholder", "Search");
    const cmdListItems = screen.getAllByRole("option");
    let optionCnt = 0;
    cmdListItems.forEach((item) => {
      if (!!item.getElementsByTagName("span")[0]?.textContent) {
        optionCnt++;
      }
    });
    expect(optionCnt).toEqual(2);
  });

  test("should display No results found if no matching items are found", async () => {
    render(<CommandExample />);
    const user = userEvent.setup();
    const cmdInput = screen.getByRole("combobox");
    await user.type(cmdInput, "Invalid");
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });

  test("should display matching items based on input", async () => {
    render(<CommandExample />);
    const user = userEvent.setup();
    const cmdInput = screen.getByRole("combobox");
    await user.type(cmdInput, "Daily");
    expect(screen.queryByText("Daily Event")).toBeInTheDocument();
    expect(screen.queryByText("Regular Event")).not.toBeInTheDocument();
  });

  test("should select option", () => {
    render(<CommandExample />);
    fireEvent.click(screen.getByTestId("item-2"));
    expect(screen.getByTestId("check-2").className.includes("text-emphasis")).toBeTruthy();
    expect(screen.getByTestId("check-1").className.includes("text-emphasis")).toBeFalsy();
  });
});
