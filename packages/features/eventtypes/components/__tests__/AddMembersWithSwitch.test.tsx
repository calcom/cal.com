import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { Host, TeamMember } from "../../lib/types";
import type { AddMembersWithSwitchProps } from "../AddMembersWithSwitch";
import { AddMembersWithSwitch } from "../AddMembersWithSwitch";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/test-path",
  useSearchParams: () => ({
    get: vi.fn(),
    toString: () => "",
  }),
  useParams: () => ({}),
  ReadonlyURLSearchParams: class ReadonlyURLSearchParams {
    private params: URLSearchParams;

    constructor(params: URLSearchParams) {
      this.params = params;
    }
    get(key: string) {
      return this.params.get(key);
    }
    toString() {
      return this.params.toString();
    }
  },
}));

// Mock matchMedia
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

// Mock Segment component
vi.mock("@calcom/features/Segment", () => ({
  Segment: vi.fn().mockImplementation(({ onQueryValueChange }) => (
    <div data-testid="mock-segment">
      <button onClick={() => onQueryValueChange({ queryValue: { id: "test" } })}>Update Query</button>
    </div>
  )),
}));

// Mock TooltipProvider
vi.mock("@calcom/ui/components/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockTeamMembers: TeamMember[] = [
  {
    value: "1",
    label: "John Doe",
    avatar: "avatar1.jpg",
    email: "john@example.com",
    defaultScheduleId: 1,
  },
  {
    value: "2",
    label: "Jane Smith",
    avatar: "avatar2.jpg",
    email: "jane@example.com",
    defaultScheduleId: 2,
  },
];

// Mock trpc
vi.mock("@calcom/trpc", () => ({
  trpc: {
    useUtils: () => ({
      viewer: {
        appRoutingForms: {
          getAttributesForTeam: {
            prefetch: vi.fn(),
          },
        },
      },
    }),
  },
}));

const renderComponent = ({
  componentProps,
  formDefaultValues = {
    assignRRMembersUsingSegment: false,
    rrSegmentQueryValue: null,
    hosts: [],
  },
}: {
  componentProps: Partial<AddMembersWithSwitchProps>;
  formDefaultValues?: Record<string, any>;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const methods = useForm({
      defaultValues: formDefaultValues,
    });
    return (
      <div>
        <FormProvider {...methods}>{children}</FormProvider>
      </div>
    );
  };

  const defaultProps: AddMembersWithSwitchProps = {
    teamMembers: mockTeamMembers,
    value: [],
    onChange: vi.fn(),
    assignAllTeamMembers: false,
    setAssignAllTeamMembers: vi.fn(),
    automaticAddAllEnabled: false,
    onActive: vi.fn(),
    isFixed: false,
    teamId: 1,
    ...componentProps,
  };

  return render(<AddMembersWithSwitch {...defaultProps} />, { wrapper: Wrapper });
};

describe("AddMembersWithSwitch", () => {
  const defaultProps = {
    teamMembers: mockTeamMembers,
    value: [] as Host[],
    onChange: vi.fn(),
    onActive: vi.fn(),
    isFixed: false,
    teamId: 1,
  };

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: false,
        automaticAddAllEnabled: false,
      },
    });
    expect(screen.queryByTestId("assign-all-team-members-toggle")).not.toBeInTheDocument();
    expectManualHostListToBeThere();
  });

  it("should render in TOGGLES_OFF_AND_ALL_TEAM_MEMBERS_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: false,
        automaticAddAllEnabled: true,
      },
    });

    expect(screen.getByTestId("assign-all-team-members-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("assign-all-team-members-toggle").getAttribute("aria-checked")).toBe("false");
    expectManualHostListToBeThere();
  });

  it("should render in ALL_TEAM_MEMBERS_ENABLED_AND_SEGMENT_NOT_APPLICABLE state", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: true,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: false,
        automaticAddAllEnabled: true,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: true,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    // Assign all toggle is still shown when team members are enabled
    expect(screen.getByTestId("assign-all-team-members-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("assign-all-team-members-toggle").getAttribute("aria-checked")).toBe("true");
    // Segment options should not be shown when isSegmentApplicable is false
    expect(screen.queryByTestId("segment-toggle")).not.toBeInTheDocument();
  });

  it("should render segment toggle in enabled state when isSegmentApplicable is true and assignRRMembersUsingSegment is also true(even if assignAllTeamMembers is false)", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: true,
        automaticAddAllEnabled: true,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: true,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    expect(screen.getByTestId("segment-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("segment-toggle").getAttribute("aria-checked")).toBe("true");
  });

  it("should call onChange when team members are selected", () => {
    const mockOnChange = vi.fn();
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        automaticAddAllEnabled: false,
        onChange: mockOnChange,
      },
    });

    const combobox = screen.getByRole("combobox");
    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.click(screen.getByText("John Doe"));

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("should show Segment when 'Automatically add all team members' is toggled on and then segment toggle is switched on", () => {
    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: true,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: true,
        automaticAddAllEnabled: true,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: false,
        rrSegmentQueryValue: null,
        hosts: [],
      },
    });

    // Segment toggle is always shown when segment is applicable
    expect(screen.getByTestId("segment-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("segment-toggle").getAttribute("aria-checked")).toBe("false");

    expect(screen.queryByTestId("mock-segment")).not.toBeInTheDocument();

    act(() => {
      screen.getByTestId("segment-toggle").click();
    });

    expect(screen.getByTestId("mock-segment")).toBeInTheDocument();
  });

  it("should show Segment options for manually assigned team members when segment is applicable", () => {
    const mockHosts: Host[] = [
      {
        userId: 1,
        isFixed: false,
        priority: 2,
        weight: 100,
        scheduleId: 1,
      },
    ];

    renderComponent({
      componentProps: {
        ...defaultProps,
        assignAllTeamMembers: false,
        setAssignAllTeamMembers: vi.fn(),
        isSegmentApplicable: true,
        automaticAddAllEnabled: true,
        value: mockHosts,
      },
      formDefaultValues: {
        assignRRMembersUsingSegment: false,
        rrSegmentQueryValue: null,
        hosts: mockHosts,
      },
    });

    // Should show assign all toggle
    expect(screen.getByTestId("assign-all-team-members-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("assign-all-team-members-toggle").getAttribute("aria-checked")).toBe("false");

    // Should show manual host selection
    expectManualHostListToBeThere();

    // Should show segment toggle for manually assigned members
    expect(screen.getByTestId("segment-toggle")).toBeInTheDocument();

    // When segment toggle is enabled, should show segment options
    act(() => {
      screen.getByTestId("segment-toggle").click();
    });

    expect(screen.getByTestId("mock-segment")).toBeInTheDocument();
  });
});

function expectManualHostListToBeThere() {
  expect(screen.getByRole("combobox")).toBeInTheDocument();
}
