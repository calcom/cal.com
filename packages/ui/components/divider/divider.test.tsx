/* eslint-disable playwright/missing-playwright-await */
import { render } from "@testing-library/react";

import { Divider, VerticalDivider } from "./Divider";

describe("Tests for Divider Component", () => {
  test("should render Divider Component", () => {
    const { container } = render(<Divider />);
    expect(container.getElementsByTagName("hr")[0]).toBeInTheDocument();
  });

  test("should render VerticalDivider Component", () => {
    const { container } = render(<VerticalDivider />);
    expect(container.getElementsByTagName("svg")[0]).toBeInTheDocument();
  });
});
