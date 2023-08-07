import { render, screen } from "@testing-library/react";

import { Alert } from "./Alert";

describe("Tests for Alert component", () => {
  test("Should render text", () => {
    render(<Alert severity="info" title="I'm an Alert!" message="Hello World" />);
    expect(screen.getByText("I'm an Alert!")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  test("Should render actions", () => {
    render(<Alert severity="info" actions={<button>Click Me</button>} />);
    expect(screen.getByText("Click Me")).toBeInTheDocument();
  });

  test("Should render corresponding icon: error", () => {
    render(<Alert severity="error" />);
    expect(screen.getByTestId("x-circle")).toBeInTheDocument();
  });

  test("Should render corresponding icon: warning", () => {
    render(<Alert severity="warning" />);
    expect(screen.getByTestId("alert-triangle")).toBeInTheDocument();
  });

  test("Should render corresponding icon: info", () => {
    render(<Alert severity="info" />);
    expect(screen.getByTestId("info")).toBeInTheDocument();
  });

  test("Should render corresponding icon: neutral", () => {
    render(<Alert severity="neutral" />);
    expect(screen.getByTestId("neutral")).toBeInTheDocument();
  });

  test("Should render corresponding icon: success", () => {
    render(<Alert severity="success" />);
    expect(screen.getByTestId("check-circle-2")).toBeInTheDocument();
  });
});
