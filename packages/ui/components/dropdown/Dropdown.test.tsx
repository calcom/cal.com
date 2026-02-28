import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ButtonOrLink,
  Dropdown,
  DropdownItem,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./Dropdown";

describe("ButtonOrLink", () => {
  it("renders a link when href is provided", () => {
    render(<ButtonOrLink href="/test">Link Text</ButtonOrLink>);
    const element = screen.getByText("Link Text");
    expect(element.closest("a")).toBeInTheDocument();
  });

  it("renders a button when href is not provided", () => {
    render(<ButtonOrLink>Button Text</ButtonOrLink>);
    const element = screen.getByText("Button Text");
    expect(element.tagName).toBe("BUTTON");
  });

  it("calls onClick on button click", () => {
    const handleClick = vi.fn();
    render(<ButtonOrLink onClick={handleClick}>Click Me</ButtonOrLink>);
    fireEvent.click(screen.getByText("Click Me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("DropdownItem", () => {
  it("renders children text", () => {
    render(<DropdownItem>Item Text</DropdownItem>);
    expect(screen.getByText("Item Text")).toBeInTheDocument();
  });

  it("applies destructive color class", () => {
    const { container } = render(<DropdownItem color="destructive">Delete</DropdownItem>);
    const wrapper = container.querySelector("[class*='hover:bg-error']");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders as a link when href is provided", () => {
    render(<DropdownItem href="/settings">Settings</DropdownItem>);
    const element = screen.getByText("Settings");
    expect(element.closest("a")).toBeInTheDocument();
  });

  it("renders as a button when no href", () => {
    render(<DropdownItem>Action</DropdownItem>);
    const element = screen.getByText("Action");
    expect(element.closest("button")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<DropdownItem className="custom-class">Item</DropdownItem>);
    const wrapper = screen.getByText("Item").closest("[class*='custom-class']");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(<DropdownItem disabled>Disabled Item</DropdownItem>);
    const button = screen.getByText("Disabled Item").closest("button");
    expect(button).toBeDisabled();
  });

  it("renders with childrenClassName", () => {
    render(<DropdownItem childrenClassName="child-class">Content</DropdownItem>);
    const childDiv = screen.getByText("Content");
    expect(childDiv.className).toContain("child-class");
  });
});

describe("Dropdown compound components", () => {
  it("renders a complete dropdown menu", () => {
    render(
      <Dropdown>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Label</DropdownMenuLabel>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item 2</DropdownMenuItem>
        </DropdownMenuContent>
      </Dropdown>
    );
    expect(screen.getByText("Open Menu")).toBeInTheDocument();
  });

  it("DropdownMenuTrigger has correct displayName", () => {
    expect(DropdownMenuTrigger.displayName).toBe("DropdownMenuTrigger");
  });

  it("DropdownMenuContent has correct displayName", () => {
    expect(DropdownMenuContent.displayName).toBe("DropdownMenuContent");
  });

  it("DropdownMenuItem has correct displayName", () => {
    expect(DropdownMenuItem.displayName).toBe("DropdownMenuItem");
  });

  it("DropdownMenuCheckboxItem has correct displayName", () => {
    expect(DropdownMenuCheckboxItem.displayName).toBe("DropdownMenuCheckboxItem");
  });

  it("DropdownMenuSubTrigger has correct displayName", () => {
    expect(DropdownMenuSubTrigger.displayName).toBe("DropdownMenuSubTrigger");
  });

  it("DropdownMenuSubContent has correct displayName", () => {
    expect(DropdownMenuSubContent.displayName).toBe("DropdownMenuSubContent");
  });

  it("DropdownMenuRadioItem has correct displayName", () => {
    expect(DropdownMenuRadioItem.displayName).toBe("DropdownMenuRadioItem");
  });

  it("DropdownMenuSeparator has correct displayName", () => {
    expect(DropdownMenuSeparator.displayName).toBe("DropdownMenuSeparator");
  });

  it("exports DropdownMenuGroup", () => {
    expect(DropdownMenuGroup).toBeDefined();
  });

  it("exports DropdownMenuRadioGroup", () => {
    expect(DropdownMenuRadioGroup).toBeDefined();
  });

  it("exports DropdownMenuSub", () => {
    expect(DropdownMenuSub).toBeDefined();
  });
});
