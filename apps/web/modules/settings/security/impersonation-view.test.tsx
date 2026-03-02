import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMutate = vi.fn();

vi.mock("@calcom/trpc/react", () => ({
  trpc: {
    viewer: {
      me: {
        get: {
          useQuery: vi.fn().mockReturnValue({ data: undefined, isPending: true }),
          cancel: vi.fn(),
          getData: vi.fn(),
          setData: vi.fn(),
        },
        updateProfile: {
          useMutation: () => ({
            mutate: mockMutate,
            isPending: false,
          }),
        },
        invalidate: vi.fn(),
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

vi.mock("@calcom/ui/components/form", () => ({
  SettingsToggle: ({
    title,
    checked,
    disabled,
    onCheckedChange,
  }: {
    title: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div data-testid="settings-toggle" data-title={title} data-checked={checked} data-disabled={disabled}>
      <button data-testid="toggle-btn" onClick={() => onCheckedChange(!checked)}>
        Toggle
      </button>
    </div>
  ),
}));

vi.mock("@calcom/ui/components/skeleton", () => ({
  SkeletonText: () => <div data-testid="skeleton-text" />,
  SkeletonContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

describe("ProfileImpersonationViewWrapper", async () => {
  const ProfileImpersonationViewWrapper = (await import("./impersonation-view")).default;
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render skeleton when data is pending", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.me.get.useQuery).mockReturnValue({
      data: undefined,
      isPending: true,
    } as ReturnType<typeof trpcModule.trpc.viewer.me.get.useQuery>);

    render(<ProfileImpersonationViewWrapper />);
    expect(screen.getAllByTestId("skeleton-text").length).toBeGreaterThan(0);
  });

  it("should render toggle with impersonation enabled when disableImpersonation is false", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.me.get.useQuery).mockReturnValue({
      data: { disableImpersonation: false },
      isPending: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.me.get.useQuery>);

    render(<ProfileImpersonationViewWrapper />);
    const toggle = screen.getByTestId("settings-toggle");
    expect(toggle).toHaveAttribute("data-title", "user_impersonation_heading");
    expect(toggle).toHaveAttribute("data-checked", "true");
  });

  it("should render toggle with impersonation disabled when disableImpersonation is true", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.me.get.useQuery).mockReturnValue({
      data: { disableImpersonation: true },
      isPending: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.me.get.useQuery>);

    render(<ProfileImpersonationViewWrapper />);
    const toggle = screen.getByTestId("settings-toggle");
    expect(toggle).toHaveAttribute("data-checked", "false");
  });

  it("should call mutation when toggle is clicked", async () => {
    const trpcModule = await import("@calcom/trpc/react");
    vi.mocked(trpcModule.trpc.viewer.me.get.useQuery).mockReturnValue({
      data: { disableImpersonation: false },
      isPending: false,
    } as ReturnType<typeof trpcModule.trpc.viewer.me.get.useQuery>);

    render(<ProfileImpersonationViewWrapper />);
    const toggleBtn = screen.getByTestId("toggle-btn");
    toggleBtn.click();
    expect(mockMutate).toHaveBeenCalledWith({ disableImpersonation: true });
  });
});
