import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { ShellSubHeading } from "./ShellSubHeading";

const titleText = "Main Title";
const subtitleText = "Subtitle Text";
const buttonText = "Click Me";

describe("Tests for ShellSubHeading Component", () => {
  test("Should render correctly the component with title and subtitle if the prop was passed", () => {
    const { getByText, queryByText, rerender } = render(
      <ShellSubHeading title={titleText} subtitle={subtitleText} />
    );

    expect(getByText(titleText)).toBeInTheDocument();
    expect(getByText(subtitleText)).toBeInTheDocument();

    rerender(<ShellSubHeading title={titleText} />);

    expect(getByText(titleText)).toBeInTheDocument();
    expect(queryByText(subtitleText)).toBeNull();
  });

  test("Should render the component with actions and verifies if the button was clicked", () => {
    const mockClickHandler = vi.fn();

    const { getByText } = render(
      <ShellSubHeading title={titleText} actions={<button onClick={mockClickHandler}>{buttonText}</button>} />
    );

    const button = getByText(buttonText);
    fireEvent.click(button);

    expect(mockClickHandler).toHaveBeenCalled();
  });
});
