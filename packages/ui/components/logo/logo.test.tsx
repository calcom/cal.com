/* eslint-disable playwright/missing-playwright-await */
import { render, screen } from "@testing-library/react";

import Logo from "./Logo";

describe("Tests for Logo", () => {
  test("should render the logo", () => {
    render(<Logo />);
    expect(screen.getByTitle("Cal")).toBeInTheDocument();
  });

  test("should render the logo as icon type", () => {
    render(<Logo icon={true} />);
    expect(screen.getByTitle("Cal").getAttribute("src")).toEqual("/api/logo?type=icon");
  });
});
