import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.fn().mockReturnValue({ data: null, isPending: true });
const mockMutate = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: vi.fn().mockReturnValue({
    data: { user: { role: "USER" } },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      me: {
        get: {
          useQuery: (...args: unknown[]) => mockUseQuery(...args),
          cancel: vi.fn(),
          getData: vi.fn(),
          setData: vi.fn(),
        },
        updateProfile: {
          useMutation: () => ({ mutate: mockMutate, isPending: false }),
        },
        invalidate: vi.fn(),
      },
      auth: {
        changePassword: {
          useMutation: () => ({ mutate: mockMutate, isPending: false }),
        },
        createAccountPassword: {
          useMutation: () => ({ mutate: mockMutate, isPending: false }),
        },
      },
    },
    useUtils: () => ({
      viewer: {
        me: {
          get: { cancel: vi.fn(), getData: vi.fn(), setData: vi.fn() },
          invalidate: vi.fn(),
        },
      },
    }),
  },
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  userMetadata: { safeParse: vi.fn().mockReturnValue({ success: true, data: {} }) },
}));

vi.mock("@coss/ui/icons", () => ({
  CircleAlertIcon: () => <span data-testid="circle-alert-icon" />,
}));

vi.mock("@coss/ui/components/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@coss/ui/components/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFrameDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardFrameFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFrameHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFrameAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFrameTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

vi.mock("@coss/ui/components/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsiblePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, render }: { children?: React.ReactNode; render?: React.ReactNode }) => (
    <div>{render ?? children}</div>
  ),
}));

vi.mock("@coss/ui/components/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => <div data-testid="field">{children}</div>,
  FieldError: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  FieldLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

vi.mock("@coss/ui/components/form", () => ({
  Form: ({ children, onSubmit }: { children: React.ReactNode; onSubmit?: (e: React.FormEvent) => void }) => (
    <form data-testid="form" onSubmit={onSubmit}>
      {children}
    </form>
  ),
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

vi.mock("@coss/ui/components/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...rest
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <button
      data-testid="session-check"
      data-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      {...rest}>
      Toggle
    </button>
  ),
}));

vi.mock("@coss/ui/shared/password-field", () => ({
  PasswordField: vi.fn(({ name }: { name?: string }) => (
    <input data-testid={`password-field-${name}`} name={name} />
  )),
}));

vi.mock("@coss/ui/components/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@coss/ui/components/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectPopup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock("@coss/ui/shared/field-grid", () => ({
  FieldGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FieldGridRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@coss/ui/components/toast", () => ({
  toastManager: { add: vi.fn() },
}));

describe("PasswordViewWrapper", async () => {
  const PasswordViewWrapper = (await import("./password-view")).default;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render skeleton loader when user data is pending", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true });

    render(<PasswordViewWrapper />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  describe("PasswordView (internal)", () => {
    const calUser = {
      id: 1,
      name: "Test",
      email: "test@example.com",
      identityProvider: "CAL",
      passwordAdded: true,
      metadata: {},
    };

    const googleUser = {
      id: 2,
      name: "Google User",
      email: "google@example.com",
      identityProvider: "GOOGLE",
      passwordAdded: false,
      metadata: {},
    };

    const googleUserWithPassword = {
      ...googleUser,
      passwordAdded: true,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should show password change form for CAL identity provider", () => {
      mockUseQuery.mockReturnValue({ data: calUser, isPending: false });

      render(<PasswordViewWrapper />);
      expect(screen.getByText("old_password")).toBeInTheDocument();
      expect(screen.getByText("new_password")).toBeInTheDocument();
    });

    it("should show create-account-password form for non-CAL provider without password", () => {
      mockUseQuery.mockReturnValue({ data: googleUser, isPending: false });

      render(<PasswordViewWrapper />);
      expect(screen.getByText("create_account_password")).toBeInTheDocument();
    });

    it("should show password change form for non-CAL provider with password added", () => {
      mockUseQuery.mockReturnValue({ data: googleUserWithPassword, isPending: false });

      render(<PasswordViewWrapper />);
      expect(screen.getByText("old_password")).toBeInTheDocument();
      expect(screen.getByText("new_password")).toBeInTheDocument();
    });

    it("should render session timeout toggle for CAL provider", () => {
      mockUseQuery.mockReturnValue({ data: calUser, isPending: false });

      render(<PasswordViewWrapper />);
      const toggle = screen.getByTestId("session-check");
      expect(toggle).toBeInTheDocument();
    });

    it("should render update button", () => {
      mockUseQuery.mockReturnValue({ data: calUser, isPending: false });

      render(<PasswordViewWrapper />);
      expect(screen.getAllByText("update").length).toBeGreaterThan(0);
    });
  });
});
