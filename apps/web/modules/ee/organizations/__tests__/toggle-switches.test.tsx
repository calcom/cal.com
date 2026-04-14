import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

const mockMutate = vi.fn();

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      organizations: {
        update: { useMutation: () => ({ mutate: mockMutate, isPending: false }) },
      },
    },
    useUtils: () => ({
      viewer: { organizations: { listCurrent: { invalidate: vi.fn() } } },
    }),
  },
}));

vi.mock("@coss/ui/components/toast", () => ({
  toastManager: { add: vi.fn() },
}));

vi.mock("@coss/ui/shared/settings-toggle", () => ({
  SettingsToggle: ({ title, description, checked, onCheckedChange, disabled }: any) => (
    <div data-testid="settings-toggle">
      <span data-testid="toggle-title">{title}</span>
      <span data-testid="toggle-description">{description}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        data-testid="toggle-checkbox"
        aria-label={title}
      />
    </div>
  ),
}));

const createMockOrg = (overrides = {}) => ({
  id: 1,
  name: "Test Org",
  organizationSettings: {
    adminGetsNoSlotsNotification: false,
    disablePhoneOnlySMSNotifications: false,
    disableAutofillOnBookingPage: false,
    ...overrides,
  },
});

describe("NoSlotsNotificationSwitch", async () => {
  const { NoSlotsNotificationSwitch } = await import("../components/NoSlotsNotificationSwitch");

  it("should render with correct title and description", () => {
    render(<NoSlotsNotificationSwitch currentOrg={createMockOrg() as never} />);
    expect(screen.getByTestId("toggle-title")).toHaveTextContent(
      "organization_no_slots_notification_switch_title"
    );
    expect(screen.getByTestId("toggle-description")).toHaveTextContent(
      "organization_no_slots_notification_switch_description"
    );
  });

  it("should render unchecked when setting is false", () => {
    render(
      <NoSlotsNotificationSwitch
        currentOrg={createMockOrg({ adminGetsNoSlotsNotification: false }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).not.toBeChecked();
  });

  it("should render checked when setting is true", () => {
    render(
      <NoSlotsNotificationSwitch
        currentOrg={createMockOrg({ adminGetsNoSlotsNotification: true }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).toBeChecked();
  });

  it("should call mutation when toggled", async () => {
    render(
      <NoSlotsNotificationSwitch
        currentOrg={createMockOrg({ adminGetsNoSlotsNotification: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(mockMutate).toHaveBeenCalledWith({ adminGetsNoSlotsNotification: true });
  });
});

describe("DisablePhoneOnlySMSNotificationsSwitch", async () => {
  const { DisablePhoneOnlySMSNotificationsSwitch } = await import(
    "../components/DisablePhoneOnlySMSNotificationsSwitch"
  );

  it("should render with correct title and description", () => {
    render(<DisablePhoneOnlySMSNotificationsSwitch currentOrg={createMockOrg() as never} />);
    expect(screen.getByTestId("toggle-title")).toHaveTextContent(
      "organization_disable_phone_only_sms_notifications_switch_title"
    );
    expect(screen.getByTestId("toggle-description")).toHaveTextContent(
      "organization_disable_phone_only_sms_notifications_switch_description"
    );
  });

  it("should render unchecked when setting is false", () => {
    render(
      <DisablePhoneOnlySMSNotificationsSwitch
        currentOrg={createMockOrg({ disablePhoneOnlySMSNotifications: false }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).not.toBeChecked();
  });

  it("should render checked when setting is true", () => {
    render(
      <DisablePhoneOnlySMSNotificationsSwitch
        currentOrg={createMockOrg({ disablePhoneOnlySMSNotifications: true }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).toBeChecked();
  });

  it("should call mutation when toggled", async () => {
    render(
      <DisablePhoneOnlySMSNotificationsSwitch
        currentOrg={createMockOrg({ disablePhoneOnlySMSNotifications: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(mockMutate).toHaveBeenCalledWith({ disablePhoneOnlySMSNotifications: true });
  });
});

describe("DisableAutofillOnBookingPageSwitch", async () => {
  const { DisableAutofillOnBookingPageSwitch } = await import(
    "../components/DisableAutofillOnBookingPageSwitch"
  );

  it("should render with correct title and description", () => {
    render(<DisableAutofillOnBookingPageSwitch currentOrg={createMockOrg() as never} />);
    expect(screen.getByTestId("toggle-title")).toHaveTextContent("disable_autofill_on_booking_page");
    expect(screen.getByTestId("toggle-description")).toHaveTextContent(
      "disable_autofill_on_booking_page_description"
    );
  });

  it("should render unchecked when setting is false", () => {
    render(
      <DisableAutofillOnBookingPageSwitch
        currentOrg={createMockOrg({ disableAutofillOnBookingPage: false }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).not.toBeChecked();
  });

  it("should render checked when setting is true", () => {
    render(
      <DisableAutofillOnBookingPageSwitch
        currentOrg={createMockOrg({ disableAutofillOnBookingPage: true }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).toBeChecked();
  });

  it("should call mutation when toggled", async () => {
    render(
      <DisableAutofillOnBookingPageSwitch
        currentOrg={createMockOrg({ disableAutofillOnBookingPage: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(mockMutate).toHaveBeenCalledWith({ disableAutofillOnBookingPage: true });
  });
});
