import { render } from "@testing-library/react";

import { ScrollableArea } from "./ScrollableArea";

describe("Tests for ScrollableArea Component", () => {
  test("Should render children inside the scrollable area", () => {
    const { getByText } = render(
      <ScrollableArea>
        <div>Child 1</div>
        <div>Child 2</div>
      </ScrollableArea>
    );

    expect(getByText("Child 1")).toBeInTheDocument();
    expect(getByText("Child 2")).toBeInTheDocument();
  });

  test("Shouldn't show the overflow indicator when content does not overflow vertically", () => {
    const mockScrollHeight = 50;

    const { queryByTestId } = render(
      <ScrollableArea>
        <div style={{ height: `${mockScrollHeight}px` }}>Non-Overflowing Content</div>
      </ScrollableArea>
    );

    expect(queryByTestId("overflow-indicator")).not.toBeInTheDocument();
  });

  test("Should show the overflow indicator when content overflows vertically", () => {
    const mockScrollHeight = 100;

    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      value: mockScrollHeight,
      writable: true,
    });

    const { getByTestId } = render(
      <ScrollableArea>
        <div>Overflowing Content</div>
      </ScrollableArea>
    );

    expect(getByTestId("overflow-indicator")).toBeInTheDocument();
  });
});
