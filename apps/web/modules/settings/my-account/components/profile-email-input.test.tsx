import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("@coss/ui/components/badge", () => ({
  Badge: ({ children, ...rest }: any) => <span {...rest}>{children}</span>,
}));

vi.mock("@coss/ui/components/button", () => ({
  Button: ({ children, onClick, render: _render, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@coss/ui/components/field", () => ({
  Field: ({ children }: any) => <div>{children}</div>,
  FieldError: ({ children }: any) => <span data-testid="field-error">{children}</span>,
}));

vi.mock("@coss/ui/components/input-group", () => ({
  InputGroup: ({ children }: any) => <div>{children}</div>,
  InputGroupAddon: ({ children }: any) => <div>{children}</div>,
  InputGroupInput: (props: any) => <input {...props} />,
}));

vi.mock("@coss/ui/components/menu", () => ({
  Menu: ({ children }: any) => <div>{children}</div>,
  MenuItem: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
  MenuPopup: ({ children }: any) => <div>{children}</div>,
  MenuTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock("@coss/ui/icons", () => ({
  EllipsisIcon: () => <span />,
  FlagIcon: () => <span />,
  SendIcon: () => <span />,
  TrashIcon: () => <span />,
}));

const baseProps = {
  registration: { name: "email", onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() },
  emailVerified: true,
  emailPrimary: false,
  dataTestId: "email-0",
  onMakePrimary: vi.fn(),
  onResendVerification: vi.fn(),
  onDelete: vi.fn(),
};

describe("ProfileEmailInput", async () => {
  const { ProfileEmailInput } = await import("./profile-email-input");

  it("should show primary badge when email is primary", () => {
    render(<ProfileEmailInput {...baseProps} emailPrimary />);
    expect(screen.getByTestId("email-0-primary-badge")).toHaveTextContent("primary");
  });

  it("should not show primary badge when email is not primary", () => {
    render(<ProfileEmailInput {...baseProps} emailPrimary={false} />);
    expect(screen.queryByTestId("email-0-primary-badge")).not.toBeInTheDocument();
  });

  it("should show unverified badge when email is not verified", () => {
    render(<ProfileEmailInput {...baseProps} emailVerified={false} />);
    expect(screen.getByTestId("email-0-unverified-badge")).toHaveTextContent("unverified");
  });

  it("should not show unverified badge when email is verified", () => {
    render(<ProfileEmailInput {...baseProps} emailVerified />);
    expect(screen.queryByTestId("email-0-unverified-badge")).not.toBeInTheDocument();
  });

  it("should disable make-primary when email is already primary", () => {
    render(<ProfileEmailInput {...baseProps} emailPrimary />);
    expect(screen.getByTestId("secondary-email-make-primary-button")).toBeDisabled();
  });

  it("should disable make-primary when email is unverified", () => {
    render(<ProfileEmailInput {...baseProps} emailVerified={false} />);
    expect(screen.getByTestId("secondary-email-make-primary-button")).toBeDisabled();
  });

  it("should enable make-primary when email is verified and not primary", () => {
    render(<ProfileEmailInput {...baseProps} emailVerified emailPrimary={false} />);
    expect(screen.getByTestId("secondary-email-make-primary-button")).not.toBeDisabled();
  });

  it("should show resend button only when unverified", () => {
    const { rerender } = render(<ProfileEmailInput {...baseProps} emailVerified={false} />);
    expect(screen.getByTestId("resend-verify-email-button")).toBeInTheDocument();

    rerender(<ProfileEmailInput {...baseProps} emailVerified />);
    expect(screen.queryByTestId("resend-verify-email-button")).not.toBeInTheDocument();
  });

  it("should disable delete when email is primary", () => {
    render(<ProfileEmailInput {...baseProps} emailPrimary />);
    expect(screen.getByTestId("secondary-email-delete-button")).toBeDisabled();
  });

  it("should call onMakePrimary when make-primary is clicked", async () => {
    const onMakePrimary = vi.fn();
    render(<ProfileEmailInput {...baseProps} onMakePrimary={onMakePrimary} />);

    await userEvent.click(screen.getByTestId("secondary-email-make-primary-button"));

    expect(onMakePrimary).toHaveBeenCalledOnce();
  });

  it("should call onDelete when delete is clicked", async () => {
    const onDelete = vi.fn();
    render(<ProfileEmailInput {...baseProps} onDelete={onDelete} />);

    await userEvent.click(screen.getByTestId("secondary-email-delete-button"));

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("should show error message when provided", () => {
    render(<ProfileEmailInput {...baseProps} errorMessage="Invalid email" />);
    expect(screen.getByTestId("field-error")).toHaveTextContent("Invalid email");
  });
});
