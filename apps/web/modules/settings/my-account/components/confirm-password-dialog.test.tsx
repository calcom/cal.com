import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@coss/ui/components/alert", () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertTitle: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@coss/ui/components/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@coss/ui/components/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogClose: ({ children }: any) => <>{children}</>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogPanel: ({ children }: any) => <div>{children}</div>,
  DialogPopup: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock("@coss/ui/components/field", () => ({
  Field: ({ children }: any) => <div>{children}</div>,
  FieldLabel: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("@coss/ui/icons", () => ({
  CircleAlertIcon: () => <span />,
}));

vi.mock("@coss/ui/shared/password-field", () => ({
  PasswordField: (props: any) => <input type="password" {...props} />,
}));

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn(),
  isLoading: false,
  oldEmail: "old@example.com",
  newEmail: "new@example.com",
};

describe("ConfirmPasswordDialog", async () => {
  const { ConfirmPasswordDialog } = await import("./confirm-password-dialog");

  it("should not render when closed", () => {
    render(<ConfirmPasswordDialog {...baseProps} open={false} />);
    expect(screen.queryByTestId("confirm-password-old-email")).not.toBeInTheDocument();
  });

  it("should display old and new email addresses", () => {
    render(<ConfirmPasswordDialog {...baseProps} />);

    expect(screen.getByTestId("confirm-password-old-email")).toHaveTextContent("old@example.com");
    expect(screen.getByTestId("confirm-password-new-email")).toHaveTextContent("new@example.com");
  });

  it("should show error alert when errorMessage is provided", () => {
    render(<ConfirmPasswordDialog {...baseProps} errorMessage="Wrong password" />);
    expect(screen.getByText("Wrong password")).toBeInTheDocument();
  });

  it("should not show error alert when no errorMessage", () => {
    render(<ConfirmPasswordDialog {...baseProps} />);
    expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmPasswordDialog {...baseProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByTestId("profile-update-email-submit-button"));

    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
