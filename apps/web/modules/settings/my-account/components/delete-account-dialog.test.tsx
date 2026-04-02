import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@calcom/lib/constants", () => ({
  APP_NAME: "Cal.com",
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
  Field: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  FieldLabel: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("@coss/ui/icons", () => ({
  CircleAlertIcon: () => <span />,
}));

vi.mock("@coss/ui/shared/password-field", () => ({
  PasswordField: (props: any) => <input type="password" {...props} />,
}));

vi.mock("@components/auth/TwoFactor", () => ({
  default: () => <div data-testid="two-factor-input">2FA</div>,
}));

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  onConfirm: vi.fn(),
  isLoading: false,
  showPasswordField: false,
  showTwoFactor: false,
};

describe("DeleteAccountDialog", async () => {
  const { DeleteAccountDialog } = await import("./delete-account-dialog");

  it("should not render when closed", () => {
    render(<DeleteAccountDialog {...baseProps} open={false} />);
    expect(screen.queryByTestId("delete-account-confirm")).not.toBeInTheDocument();
  });

  it("should show password field when showPasswordField is true", () => {
    render(<DeleteAccountDialog {...baseProps} showPasswordField />);
    expect(screen.getByTestId("delete-account-password-field")).toBeInTheDocument();
  });

  it("should hide password field when showPasswordField is false", () => {
    render(<DeleteAccountDialog {...baseProps} showPasswordField={false} />);
    expect(screen.queryByTestId("delete-account-password-field")).not.toBeInTheDocument();
  });

  it("should show 2FA form when showTwoFactor is true and handler provided", () => {
    render(<DeleteAccountDialog {...baseProps} showTwoFactor onTwoFactorSubmit={vi.fn()} />);
    expect(screen.getByTestId("delete-account-2fa")).toBeInTheDocument();
    expect(screen.getByTestId("two-factor-input")).toBeInTheDocument();
  });

  it("should hide 2FA form when showTwoFactor is false", () => {
    render(<DeleteAccountDialog {...baseProps} showTwoFactor={false} />);
    expect(screen.queryByTestId("delete-account-2fa")).not.toBeInTheDocument();
  });

  it("should show error message when provided", () => {
    render(<DeleteAccountDialog {...baseProps} errorMessage="Invalid password" />);
    expect(screen.getByText("Invalid password")).toBeInTheDocument();
  });

  it("should not show error alert when no error message", () => {
    render(<DeleteAccountDialog {...baseProps} />);
    expect(screen.queryByTestId("alert")).not.toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    render(<DeleteAccountDialog {...baseProps} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByTestId("delete-account-confirm"));

    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
