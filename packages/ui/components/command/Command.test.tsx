import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./Command";

describe("Command", () => {
  it("renders a command container", () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>Item 1</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(container.querySelector("[cmdk-root]")).toBeInTheDocument();
  });

  it("renders CommandInput with placeholder", () => {
    render(
      <Command>
        <CommandInput placeholder="Type to search..." />
        <CommandList />
      </Command>
    );
    expect(screen.getByPlaceholderText("Type to search...")).toBeInTheDocument();
  });

  it("renders CommandEmpty component", () => {
    const { container } = render(
      <Command>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>Nothing found</CommandEmpty>
        </CommandList>
      </Command>
    );
    const emptyEl = container.querySelector("[cmdk-empty]");
    expect(emptyEl).toBeDefined();
  });

  it("renders CommandGroup with heading", () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem>Action 1</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Action 1")).toBeInTheDocument();
  });

  it("renders multiple CommandItems", () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup>
            <CommandItem>First</CommandItem>
            <CommandItem>Second</CommandItem>
            <CommandItem>Third</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });

  it("renders CommandShortcut", () => {
    render(
      <Command>
        <CommandList>
          <CommandGroup>
            <CommandItem>
              Save <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(screen.getByText("⌘S")).toBeInTheDocument();
  });

  it("renders CommandSeparator", () => {
    const { container } = render(
      <Command>
        <CommandList>
          <CommandGroup>
            <CommandItem>Item 1</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup>
            <CommandItem>Item 2</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    expect(container.querySelector("[cmdk-separator]")).toBeInTheDocument();
  });

  it("CommandShortcut has correct displayName", () => {
    expect(CommandShortcut.displayName).toBe("CommandShortcut");
  });
});
