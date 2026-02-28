import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

vi.mock("../form/select", () => ({
  Select: ({
    options,
    value,
    onChange,
  }: {
    options: Array<{ value: number; label: string }>;
    value: { value: number; label: string } | undefined;
    onChange: (option: { value: number; label: string } | null) => void;
    size: string;
  }) => (
    <select
      data-testid="page-size-select"
      value={value?.value}
      onChange={(e) => {
        const opt = options.find((o) => o.value === Number(e.target.value));
        onChange(opt || null);
      }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 50,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  it("renders pagination info text", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("pagination_status")).toBeInTheDocument();
  });

  it("renders rows per page text", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("rows_per_page")).toBeInTheDocument();
  });

  it("renders previous and next buttons", () => {
    const { container } = render(<Pagination {...defaultProps} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("disables previous button on first page", () => {
    const { container } = render(<Pagination {...defaultProps} currentPage={1} />);
    const buttons = container.querySelectorAll("button");
    const prevBtn = buttons[0];
    expect(prevBtn).toBeDisabled();
  });

  it("disables next button on last page", () => {
    const { container } = render(<Pagination {...defaultProps} currentPage={5} />);
    const buttons = container.querySelectorAll("button");
    const nextBtn = buttons[buttons.length - 1];
    expect(nextBtn).toBeDisabled();
  });

  it("calls onPageChange with next page on next click", () => {
    const onPageChange = vi.fn();
    const { container } = render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    const buttons = container.querySelectorAll("button");
    const nextBtn = buttons[buttons.length - 1];
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with previous page on prev click", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />
    );
    const buttons = container.querySelectorAll("button");
    const prevBtn = buttons[0];
    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onNext callback when next is clicked", () => {
    const onNext = vi.fn();
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination {...defaultProps} onPageChange={onPageChange} onNext={onNext} />
    );
    const buttons = container.querySelectorAll("button");
    const nextBtn = buttons[buttons.length - 1];
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onPrevious callback when prev is clicked", () => {
    const onPrevious = vi.fn();
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} onPrevious={onPrevious} />
    );
    const buttons = container.querySelectorAll("button");
    const prevBtn = buttons[0];
    fireEvent.click(prevBtn);
    expect(onPrevious).toHaveBeenCalled();
  });

  it("renders page size select", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByTestId("page-size-select")).toBeInTheDocument();
  });

  it("handles single page (both buttons disabled)", () => {
    const { container } = render(<Pagination {...defaultProps} totalItems={5} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons[0]).toBeDisabled();
    expect(buttons[buttons.length - 1]).toBeDisabled();
  });
});
