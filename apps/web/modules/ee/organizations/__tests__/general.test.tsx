import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { locale: "en" } } }),
}));

const mockMutate = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      organizations: {
        listCurrent: { useQuery: () => mockUseQuery() },
        update: { useMutation: () => ({ mutate: mockMutate, isPending: false }) },
      },
    },
    useUtils: () => ({
      viewer: { organizations: { listCurrent: { invalidate: vi.fn() } } },
    }),
  },
}));

vi.mock("@coss/ui/components/button", () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));

vi.mock("@coss/ui/components/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardFrame: ({ children }: any) => <div data-testid="card-frame">{children}</div>,
  CardFrameFooter: ({ children }: any) => <div data-testid="card-frame-footer">{children}</div>,
  CardFrameHeader: ({ children }: any) => <div>{children}</div>,
  CardPanel: ({ children }: any) => <div data-testid="card-panel">{children}</div>,
}));

vi.mock("@coss/ui/components/combobox", () => ({
  Combobox: ({ children }: any) => <div data-testid="combobox">{children}</div>,
  ComboboxEmpty: ({ children }: any) => <div>{children}</div>,
  ComboboxInput: () => <input data-testid="combobox-input" />,
  ComboboxItem: ({ children }: any) => <div>{children}</div>,
  ComboboxList: ({ children }: any) => <div>{typeof children === "function" ? null : children}</div>,
  ComboboxPopup: ({ children }: any) => <div>{children}</div>,
  ComboboxTrigger: ({ children }: any) => <div>{children}</div>,
  ComboboxValue: () => <span />,
}));

vi.mock("@coss/ui/components/field", () => ({
  Field: ({ children, name }: any) => <div data-testid={`field-${name}`}>{children}</div>,
  FieldDescription: ({ children }: any) => <span>{children}</span>,
  FieldLabel: ({ children }: any) => <label>{children}</label>,
}));

vi.mock("@coss/ui/components/form", () => ({
  Form: ({ children, onSubmit }: any) => (
    <form data-testid="form" onSubmit={onSubmit}>
      {children}
    </form>
  ),
}));

vi.mock("@coss/ui/components/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectButton: (props: any) => <button {...props} />,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectPopup: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock("@coss/ui/components/skeleton", () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock("@coss/ui/components/toast", () => ({
  toastManager: { add: vi.fn() },
}));

vi.mock("@coss/ui/icons", () => ({
  SearchIcon: () => <span />,
}));

vi.mock("@coss/ui/shared/app-header", () => ({
  AppHeader: ({ children }: any) => <header data-testid="app-header">{children}</header>,
  AppHeaderContent: ({ children, title }: any) => (
    <div data-testid="app-header-content">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  AppHeaderDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@coss/ui/shared/field-grid", () => ({
  FieldGrid: ({ children }: any) => <div data-testid="field-grid">{children}</div>,
}));

vi.mock("@coss/ui/shared/settings-toggle", () => ({
  SettingsToggle: ({ title, description, checked, onCheckedChange, disabled }: any) => (
    <div data-testid="settings-toggle">
      <span>{title}</span>
      <span>{description}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
    </div>
  ),
}));

vi.mock("~/ee/organizations/components/DisableAutofillOnBookingPageSwitch", () => ({
  DisableAutofillOnBookingPageSwitch: () => <div data-testid="disable-autofill-switch" />,
}));

vi.mock("~/ee/organizations/components/DisablePhoneOnlySMSNotificationsSwitch", () => ({
  DisablePhoneOnlySMSNotificationsSwitch: () => <div data-testid="disable-phone-sms-switch" />,
}));

vi.mock("~/ee/organizations/components/LockEventTypeSwitch", () => ({
  LockEventTypeSwitch: () => <div data-testid="lock-event-type-switch" />,
}));

vi.mock("~/ee/organizations/components/NoSlotsNotificationSwitch", () => ({
  NoSlotsNotificationSwitch: () => <div data-testid="no-slots-notification-switch" />,
}));

vi.mock("~/ee/common/components/LicenseRequired", () => ({
  default: ({ children }: any) => <div data-testid="license-required">{children}</div>,
}));

vi.mock("~/ee/organizations/general-skeleton", () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader" />,
}));

const mockOrgData = {
  id: 1,
  name: "Test Org",
  timeZone: "America/New_York",
  timeFormat: 12,
  weekStart: "Sunday",
  organizationSettings: {
    lockEventTypeCreationForUsers: false,
    adminGetsNoSlotsNotification: false,
    disablePhoneOnlySMSNotifications: false,
    disableAutofillOnBookingPage: false,
  },
};

describe("OrgGeneralView", async () => {
  const { default: OrgGeneralView } = await import("../general");

  it("should render skeleton loader when data is pending", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isPending: true, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: true }} />);
    expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
  });

  it("should render page header with title and description", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: true }} />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByText("general")).toBeInTheDocument();
  });

  it("should render form with timezone, week start, and time format fields", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: true }} />);
    expect(screen.getByTestId("field-timeZone")).toBeInTheDocument();
    expect(screen.getByTestId("field-weekStart")).toBeInTheDocument();
    expect(screen.getByTestId("field-timeFormat")).toBeInTheDocument();
  });

  it("should render all toggle switches when user can edit", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: true }} />);
    expect(screen.getByTestId("lock-event-type-switch")).toBeInTheDocument();
    expect(screen.getByTestId("no-slots-notification-switch")).toBeInTheDocument();
    expect(screen.getByTestId("disable-phone-sms-switch")).toBeInTheDocument();
    expect(screen.getByTestId("disable-autofill-switch")).toBeInTheDocument();
  });

  it("should not render toggle switches when user cannot edit", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: false }} />);
    expect(screen.queryByTestId("lock-event-type-switch")).not.toBeInTheDocument();
    expect(screen.queryByTestId("no-slots-notification-switch")).not.toBeInTheDocument();
  });

  it("should render update button when user can edit", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: true }} />);
    expect(screen.getByRole("button", { name: "update" })).toBeInTheDocument();
  });

  it("should not render update button when user cannot edit", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: false }} />);
    expect(screen.queryByRole("button", { name: "update" })).not.toBeInTheDocument();
  });

  it("should wrap content in LicenseRequired component", () => {
    mockUseQuery.mockReturnValue({ data: mockOrgData, isPending: false, error: null });
    render(<OrgGeneralView permissions={{ canRead: true, canEdit: true }} />);
    expect(screen.getByTestId("license-required")).toBeInTheDocument();
  });
});
