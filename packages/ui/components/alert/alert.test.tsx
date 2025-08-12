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

  test("Should render corresponding icon: error", async () => {
    render(<Alert severity="error" />);
    expect(await screen.findByTestId("circle-x")).toBeInTheDocument();
  });

  test("Should render corresponding icon: warning", async () => {
    render(<Alert severity="warning" />);
    expect(await screen.findByTestId("alert-triangle")).toBeInTheDocument();
  });

  test("Should render corresponding icon: info", async () => {
    render(<Alert severity="info" />);
    expect(await screen.findByTestId("info")).toBeInTheDocument();
  });

  test("Should render corresponding icon: neutral", async () => {
    render(<Alert severity="neutral" />);
    expect(await screen.findByTestId("neutral")).toBeInTheDocument();
  });
});
