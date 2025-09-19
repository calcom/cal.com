import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckedTeamSelect } from "../CheckedTeamSelect";

// Mock required hooks
vi.mock("@calcom/atoms/hooks/useIsPlatform", () => ({
  useIsPlatform: vi.fn().mockReturnValue(false),
}));

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: vi.fn().mockReturnValue({ t: (key: string) => key }),
}));

describe("CheckedTeamSelect Component", () => {
  it("renders without crashing", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(<CheckedTeamSelect value={[]} onChange={onChange} groupId={null} options={[]} />);

    // Assert
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("handles priority changes correctly", () => {
    // Arrange
    const onChange = vi.fn();
    const value = [
      {
        value: "test@example.com",
        label: "Test User",
        priority: 1,
      },
    ];

    // Act
    render(<CheckedTeamSelect value={value} onChange={onChange} groupId={null} options={[]} />);

    // Click the priority button to test changes
    const priorityButton = screen.getByText("medium");
    priorityButton.click();

    // Assert
    expect(onChange).toHaveBeenCalled();
    const newValue = onChange.mock.calls[0][0];
    expect(newValue[0].priority).toBe(2);
  });

  it("shows weight controls when isRRWeightsEnabled is true", () => {
    // Arrange
    const onChange = vi.fn();
    const value = [
      {
        value: "test@example.com",
        label: "Test User",
        weight: 50,
      },
    ];

    // Act
    render(
      <CheckedTeamSelect
        value={value}
        onChange={onChange}
        groupId={null}
        options={[]}
        isRRWeightsEnabled={true}
      />
    );

    // Assert
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("allows removing a team member", () => {
    // Arrange
    const onChange = vi.fn();
    const value = [
      {
        value: "test@example.com",
        label: "Test User",
        priority: 1,
      },
    ];

    // Act
    render(<CheckedTeamSelect value={value} onChange={onChange} groupId={null} options={[]} />);

    // Find and click the remove button
    const removeButton = screen.getByRole("button", { name: "Remove Test User" });
    removeButton.click();

    // Assert
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("allows updating weight when isRRWeightsEnabled is true", () => {
    // Arrange
    const onChange = vi.fn();
    const value = [
      {
        value: "test@example.com",
        label: "Test User",
        weight: 50,
      },
    ];

    // Act
    render(
      <CheckedTeamSelect
        value={value}
        onChange={onChange}
        groupId={null}
        options={[]}
        isRRWeightsEnabled={true}
      />
    );

    // Find and update the weight input
    const weightInput = screen.getByRole("spinbutton", { name: /weight/i });
    fireEvent.change(weightInput, { target: { value: "75" } });
    fireEvent.blur(weightInput);

    // Assert
    expect(onChange).toHaveBeenCalled();
    const newValue = onChange.mock.calls[0][0];
    expect(newValue[0].weight).toBe(75);
  });
});
