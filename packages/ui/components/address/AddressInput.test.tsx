import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddressInput from "./AddressInput";

describe("AddressInput", () => {
  it("renders with placeholder", () => {
    render(<AddressInput value="" onChange={vi.fn()} placeholder="Enter address" />);
    expect(screen.getByPlaceholderText("Enter address")).toBeInTheDocument();
  });

  it("renders with value", () => {
    render(<AddressInput value="123 Main St" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("123 Main St")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<AddressInput value="" onChange={handleChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "456 Oak Ave" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("renders map-pin icon", () => {
    const { container } = render(<AddressInput value="" onChange={vi.fn()} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies id attribute", () => {
    render(<AddressInput value="" onChange={vi.fn()} id="address-field" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "address-field");
  });

  it("applies required attribute", () => {
    render(<AddressInput value="" onChange={vi.fn()} required />);
    const input = screen.getByRole("textbox");
    expect(input).toBeRequired();
  });

  it("has autoComplete set to address-line1", () => {
    render(<AddressInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("autoComplete", "address-line1");
  });

  it("applies custom className", () => {
    const { container } = render(<AddressInput value="" onChange={vi.fn()} className="my-class" />);
    expect(container.querySelector(".my-class")).toBeInTheDocument();
  });
});
