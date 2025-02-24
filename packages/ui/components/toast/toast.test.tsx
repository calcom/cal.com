import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { SuccessToast, ErrorToast, WarningToast } from "./showToast";

describe("Tests for Toast Components", () => {
  const testToastComponent = (Component: typeof SuccessToast, toastTestId: string) => {
    const message = "This is a test message";
    const toastId = "some-id";

    const onCloseMock = vi.fn();
    render(<Component message={message} onClose={onCloseMock} toastId={toastId} />);

    const toast = screen.getByTestId(toastTestId);
    expect(toast).toBeInTheDocument();
    expect(toast.textContent).toContain(message);

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledWith(toastId);
  };

  const toastComponents: [string, typeof SuccessToast, string][] = [
    ["SuccessToast", SuccessToast, "toast-success"],
    ["ErrorToast", ErrorToast, "toast-error"],
    ["WarningToast", WarningToast, "toast-warning"],
  ];

  test.each(toastComponents)("Should render and close %s component", (_, ToastComponent, expectedClass) => {
    testToastComponent(ToastComponent, expectedClass);
  });
});
