import { render, screen } from "@testing-library/react";

import { User as UserIcon } from "@calcom/ui/components/icon";

import { Alert } from "./Alert";

describe("test", () => {
  it("should render text", () => {
    render(<Alert severity="info" title="I'm an Alert!" message="Hello World" />);
    expect(screen.getByText("I'm an Alert!")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("should have custom class name", () => {
    render(<Alert severity="info" className="component-class" />);
    expect(screen.getByTestId("alert").classList.contains("component-class")).toBeTruthy();
  });

  it("should render custom icon with class names", () => {
    const { container } = render(
      <Alert severity="info" CustomIcon={UserIcon} customIconColor="icon-color" iconClassName="icon-class" />
    );

    expect(container.querySelector("svg")?.classList.contains("icon-color")).toBeTruthy();
    expect(container.querySelector("svg")?.classList.contains("icon-class")).toBeTruthy();
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("should render actions", () => {
    render(<Alert severity="info" actions={<button>Click Me</button>} />);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  it("should render corresponding icon: error", () => {
    render(<Alert severity="error" />);
    expect(screen.getByTestId("x-circle")).toBeInTheDocument();
  });

  it("should render corresponding icon: warning", () => {
    render(<Alert severity="warning" />);
    expect(screen.getByTestId("alert-triangle")).toBeInTheDocument();
  });

  it("should render corresponding icon: info", () => {
    render(<Alert severity="info" />);
    expect(screen.getByTestId("info")).toBeInTheDocument();
  });

  it("should render corresponding icon: neutral", () => {
    render(<Alert severity="neutral" />);
    expect(screen.getByTestId("neutral")).toBeInTheDocument();
  });

  it("should render corresponding icon: success", () => {
    render(<Alert severity="success" />);
    expect(screen.getByTestId("check-circle-2")).toBeInTheDocument();
  });
});
