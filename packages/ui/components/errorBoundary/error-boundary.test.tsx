import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import ErrorBoundary from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  test("should render children when no error occurs", () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Child Component</div>
      </ErrorBoundary>
    );

    const childElement = container.querySelector("div");
    expect(childElement).toBeInTheDocument();
    expect(childElement?.textContent).toBe("Child Component");
  });

  test("should render error message and error details when an error occurs", () => {
    const ErrorThrowingComponent = () => {
      useEffect(() => {
        throw new Error("Test Error");
      }, []);

      return <div>Error Throwing Component</div>;
    };

    render(
      <ErrorBoundary message="Error Message">
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    const errorMessage = screen.getByText("Error Message");
    const errorDetails = screen.getByText("Error: Test Error");
    expect(errorMessage).toBeInTheDocument();
    expect(errorDetails).toBeInTheDocument();
  });
});
