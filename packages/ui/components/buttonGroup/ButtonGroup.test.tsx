import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonGroup } from "./ButtonGroup";

describe("ButtonGroup", () => {
  it("renders children", () => {
    render(
      <ButtonGroup>
        <button>Button 1</button>
        <button>Button 2</button>
      </ButtonGroup>
    );
    expect(screen.getByText("Button 1")).toBeInTheDocument();
    expect(screen.getByText("Button 2")).toBeInTheDocument();
  });

  it("applies space-x-2 when not combined", () => {
    const { container } = render(
      <ButtonGroup>
        <button>A</button>
        <button>B</button>
      </ButtonGroup>
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("space-x-2");
  });

  it("applies combined styles when combined is true", () => {
    const { container } = render(
      <ButtonGroup combined>
        <button>A</button>
        <button>B</button>
      </ButtonGroup>
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).not.toContain("space-x-2");
  });

  it("sets CSS variable for border radius when combined", () => {
    const { container } = render(
      <ButtonGroup combined>
        <button>A</button>
      </ButtonGroup>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.getPropertyValue("--btn-group-radius")).toBeTruthy();
  });

  it("applies containerProps className", () => {
    const { container } = render(
      <ButtonGroup containerProps={{ className: "my-group" }}>
        <button>A</button>
      </ButtonGroup>
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("my-group");
  });

  it("passes containerProps to wrapper div", () => {
    render(
      <ButtonGroup containerProps={{ "data-testid": "btn-group" } as React.HTMLAttributes<HTMLDivElement>}>
        <button>A</button>
      </ButtonGroup>
    );
    expect(screen.getByTestId("btn-group")).toBeInTheDocument();
  });

  it("has flex display", () => {
    const { container } = render(
      <ButtonGroup>
        <button>A</button>
      </ButtonGroup>
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("flex");
  });
});
