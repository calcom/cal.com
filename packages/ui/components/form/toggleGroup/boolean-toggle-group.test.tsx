/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import { BooleanToggleGroupField } from "./BooleanToggleGroup";

describe("Tests for BooleanToggleGroup component", () => {
  test("should render BooleanToggleGroup", () => {
    render(<BooleanToggleGroupField label="Boolean Toggle" defaultValue={false} />);
    expect(screen.getByText("Boolean Toggle")).toBeInTheDocument();
    expect(screen.getByTestId("bt-yes").getAttribute("data-state")).toEqual("off");
    expect(screen.getByTestId("bt-no").getAttribute("data-state")).toEqual("on");
  });

  test("should render BooleanToggleGroup", () => {
    render(<BooleanToggleGroupField label="Boolean Toggle" value={true} />);
    expect(screen.getByText("Boolean Toggle")).toBeInTheDocument();
    expect(screen.getByTestId("bt-yes").getAttribute("data-state")).toEqual("on");
    expect(screen.getByTestId("bt-no").getAttribute("data-state")).toEqual("off");
  });
});
