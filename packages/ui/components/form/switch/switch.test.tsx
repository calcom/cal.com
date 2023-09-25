/* eslint-disable playwright/missing-playwright-await */
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkIcon } from "lucide-react";

import Switch from "./Switch";

describe("Tests for Switch Component", () => {
  test("should render Switch component", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  test("should render the switch as checked", () => {
    render(<Switch checked={true} />);
    expect(screen.getByRole("switch").getAttribute("data-state")).toBe("checked");
  });

  test("should render the switch as disabled", () => {
    render(<Switch checked={true} disabled={true} />);
    expect(screen.getByRole("switch").className.includes("cursor-not-allowed")).toBeTruthy();
  });

  test("should render switch with label when passed as prop", () => {
    render(<Switch label="Switch label" />);
    expect(screen.getByRole("label").textContent).toEqual("Switch label");
  });

  test("should render switch with tooltip", async () => {
    render(
      <TooltipProvider>
        <Switch tooltip="Switch tooltip" />
      </TooltipProvider>
    );
    const switchBtn = screen.getByRole("switch");
    const user = userEvent.setup();
    user.hover(switchBtn);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });
  });

  test("should render switch with Icon when passed as prop", () => {
    render(<Switch LockedIcon={<LinkIcon />} />);
    expect(screen.getByTestId("switch-icon")).toBeInTheDocument();
  });
});
