/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";
import { PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { vi } from "vitest";

import SettingsToggle from "./SettingsToggle";

vi.mock("@formkit/auto-animate/react", async () => ({
  useAutoAnimate() {
    return [useRef(null)];
  },
}));

describe("Tests for SettingsToggle component", () => {
  function SettingsToggleExample(props: any) {
    const [checked, onCheckedChange] = useState(true);
    const toggleSwitch = () => onCheckedChange((prev) => !prev);
    return (
      <SettingsToggle title="Settings" checked={checked} onCheckedChange={toggleSwitch} {...props}>
        <div>Text</div>
      </SettingsToggle>
    );
  }
  test("should render SettingsToggle", () => {
    const { rerender } = render(
      <SettingsToggleExample description="This is a description" LockedIcon={<PlusIcon />} />
    );
    expect(screen.getByRole("switch").getAttribute("data-state")).toEqual("checked");
    const label = screen.getByText("Settings");
    expect(label).toBeInTheDocument();
    expect(label.getElementsByTagName("svg")[0]).toBeInTheDocument();
    expect(screen.getByText("This is a description")).toBeInTheDocument();
    rerender(<SettingsToggleExample />);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch").getAttribute("data-state")).toEqual("unchecked");
    rerender(<SettingsToggleExample disabled={true} />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
