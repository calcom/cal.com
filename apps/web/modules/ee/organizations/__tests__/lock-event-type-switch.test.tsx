import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
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

vi.mock("@coss/ui/components/button", () => ({
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
}));

let dialogOpen = false;
let onOpenChangeCallback: ((open: boolean) => void) | null = null;
let onOpenChangeCompleteCallback: ((open: boolean) => void) | null = null;

vi.mock("@coss/ui/components/dialog", () => ({
  Dialog: ({ children, open, onOpenChange, onOpenChangeComplete }: any) => {
    dialogOpen = open;
    onOpenChangeCallback = onOpenChange;
    onOpenChangeCompleteCallback = onOpenChangeComplete || null;
    return open ? <div data-testid="dialog">{children}</div> : null;
  },
  DialogClose: ({ children }: any) => (
    <button
      data-testid="dialog-close"
      onClick={() => {
        onOpenChangeCallback?.(false);
        onOpenChangeCompleteCallback?.(false);
      }}>
      {children}
    </button>
  ),
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogPanel: ({ children }: any) => <div data-testid="dialog-panel">{children}</div>,
  DialogPopup: ({ children }: any) => <div data-testid="dialog-popup">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
}));

vi.mock("@coss/ui/components/form", () => ({
  Form: ({ children, onSubmit }: any) => (
    <form data-testid="form" onSubmit={onSubmit}>
      {children}
    </form>
  ),
}));

let radioGroupValue: string | null = null;
let radioGroupOnValueChange: ((value: string) => void) | null = null;

vi.mock("@coss/ui/components/radio-group", () => ({
  RadioGroup: ({ children, value, onValueChange }: any) => {
    radioGroupValue = value;
    radioGroupOnValueChange = onValueChange;
    return <div data-testid="radio-group">{children}</div>;
  },
  Radio: ({ value }: any) => (
    <input
      type="radio"
      data-testid={`radio-${value}`}
      value={value}
      checked={radioGroupValue === value}
      onChange={() => radioGroupOnValueChange?.(value)}
    />
  ),
}));

vi.mock("@coss/ui/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
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
      />
    </div>
  ),
}));

const createMockOrg = (overrides = {}) => ({
  id: 1,
  name: "Test Org",
  organizationSettings: {
    lockEventTypeCreationForUsers: false,
    ...overrides,
  },
});

describe("LockEventTypeSwitch", async () => {
  const { LockEventTypeSwitch } = await import("../components/LockEventTypeSwitch");

  it("should render with correct title and description", () => {
    render(<LockEventTypeSwitch currentOrg={createMockOrg() as never} />);
    expect(screen.getByTestId("toggle-title")).toHaveTextContent("lock_org_users_eventtypes");
    expect(screen.getByTestId("toggle-description")).toHaveTextContent(
      "lock_org_users_eventtypes_description"
    );
  });

  it("should render unchecked when setting is false", () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).not.toBeChecked();
  });

  it("should render checked when setting is true", () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: true }) as never}
      />
    );
    expect(screen.getByTestId("toggle-checkbox")).toBeChecked();
  });

  it("should call mutation directly when toggling off", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: true }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(mockMutate).toHaveBeenCalledWith({ lockEventTypeCreation: false });
  });

  it("should open dialog when toggling on", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("should render dialog with correct title", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("lock_event_types_modal_header");
  });

  it("should render radio options for hide and delete", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(screen.getByTestId("radio-HIDE")).toBeInTheDocument();
    expect(screen.getByTestId("radio-DELETE")).toBeInTheDocument();
  });

  it("should default to HIDE option selected", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(screen.getByTestId("radio-HIDE")).toBeChecked();
  });

  it("should allow selecting DELETE option", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    await userEvent.click(screen.getByTestId("radio-DELETE"));
    expect(screen.getByTestId("radio-DELETE")).toBeChecked();
  });

  it("should submit form with selected option", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));
    expect(mockMutate).toHaveBeenCalledWith({
      lockEventTypeCreation: true,
      lockEventTypeCreationOptions: "HIDE",
    });
  });

  it("should submit form with DELETE option when selected", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    await userEvent.click(screen.getByTestId("radio-DELETE"));
    await userEvent.click(screen.getByRole("button", { name: "submit" }));
    expect(mockMutate).toHaveBeenCalledWith({
      lockEventTypeCreation: true,
      lockEventTypeCreationOptions: "DELETE",
    });
  });

  it("should render cancel button in dialog", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    expect(screen.getByTestId("dialog-close")).toHaveTextContent("cancel");
  });

  it("should close dialog and revert toggle when cancelled", async () => {
    render(
      <LockEventTypeSwitch
        currentOrg={createMockOrg({ lockEventTypeCreationForUsers: false }) as never}
      />
    );
    await userEvent.click(screen.getByTestId("toggle-checkbox"));
    await userEvent.click(screen.getByTestId("dialog-close"));
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("toggle-checkbox")).not.toBeChecked();
  });
});
