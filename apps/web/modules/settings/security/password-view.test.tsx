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

vi.mock("@calcom/features/settings/SectionBottomActions", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="section-bottom">{children}</div>
  ),
}));

vi.mock("@calcom/prisma/zod-utils", () => ({
  userMetadata: { safeParse: vi.fn().mockReturnValue({ success: true, data: {} }) },
}));

vi.mock("@calcom/ui/classNames", () => ({
  default: (...args: string[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@calcom/ui/components/alert", () => ({
  Alert: ({ message }: { message?: string }) => <div data-testid="alert">{message}</div>,
}));

vi.mock("@calcom/ui/components/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} data-loading={loading} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@calcom/ui/components/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <form data-testid="form">{children}</form>,
  PasswordField: vi.fn(({ label }: { label: string }) => (
    <div data-testid={`password-field-${label}`}>{label}</div>
  )),
  Select: vi.fn(() => <select data-testid="select" />),
  SettingsToggle: ({
    children,
    title,
    checked,
    onCheckedChange,
  }: {
    children?: React.ReactNode;
    title: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div data-testid="settings-toggle" data-title={title} data-checked={checked}>
      <button data-testid="toggle-button" onClick={() => onCheckedChange(!checked)}>
        Toggle
      </button>
      {checked && children}
    </div>
  ),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonButton: () => <div data-testid="skeleton-button" />,
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SkeletonText: () => <div data-testid="skeleton-text" />,
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

describe("PasswordViewWrapper", async () => {
  const PasswordViewWrapper = (await import("./password-view")).default;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render skeleton loader when user data is pending", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true });

    render(<PasswordViewWrapper />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
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
      const toggle = screen.getByTestId("settings-toggle");
      expect(toggle).toHaveAttribute("data-title", "session_timeout");
    });

    it("should render update button", () => {
      mockUseQuery.mockReturnValue({ data: calUser, isPending: false });

      render(<PasswordViewWrapper />);
      expect(screen.getAllByText("update").length).toBeGreaterThan(0);
    });
  });
});
