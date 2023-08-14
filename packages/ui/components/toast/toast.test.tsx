import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { SuccessToast, ErrorToast, WarningToast, DefaultToast } from "./showToast";

describe("Tests for Toast Components", () => {
  const testToastComponent = (Component: typeof DefaultToast, toastTestId: string) => {
    const message = "This is a test message";
    const toastId = "some-id";

    const onCloseMock = vi.fn();
    render(<Component message={message} toastVisible={true} onClose={onCloseMock} toastId={toastId} />);

    const toast = screen.getByTestId(toastTestId);
    expect(toast).toBeInTheDocument();
    expect(toast.textContent).toContain(message);

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalledWith(toastId);
  };

  const toastComponents: [string, typeof DefaultToast, string][] = [
    ["SuccessToast", SuccessToast, "toast-success"],
    ["ErrorToast", ErrorToast, "toast-error"],
    ["WarningToast", WarningToast, "toast-warning"],
    ["DefaultToast", DefaultToast, "toast-default"],
  ];

  test.each(toastComponents)("Should render and close %s component", (_, ToastComponent, expectedClass) => {
    testToastComponent(ToastComponent, expectedClass);
  });
});
