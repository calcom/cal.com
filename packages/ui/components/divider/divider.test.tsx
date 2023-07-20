/* eslint-disable playwright/missing-playwright-await */
import { render } from "@testing-library/react";

import { Divider, VerticalDivider } from "./Divider";

describe("Tests for Divider component", () => {
  test("Should render correctly", () => {
    const { container } = render(<Divider />);
    const dividerElement = container.querySelector("hr");
    expect(dividerElement).toBeInTheDocument();
  });
});

describe("Tests for VerticalDivider component", () => {
  test("Should render correctly", () => {
    const { container } = render(<VerticalDivider />);
    const svgElement = container.querySelector("svg");
    expect(svgElement).toBeInTheDocument();
  });
});
